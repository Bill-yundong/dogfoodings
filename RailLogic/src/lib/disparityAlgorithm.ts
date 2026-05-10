import type { TrajectoryPoint, VisualFrame } from '../types';

interface DisparityResult {
  displacementX: number;
  displacementY: number;
  confidence: number;
  processingTime: number;
}

interface CorrelationResult {
  x: number;
  y: number;
  similarity: number;
}

export class AsyncDisparityAlgorithm {
  private frameBuffer: VisualFrame[] = [];
  private maxBufferSize = 30;
  private processingQueue: VisualFrame[] = [];
  private isProcessing = false;
  private kalmanFilter: KalmanFilter;
  private lastTrajectoryPoint: TrajectoryPoint | null = null;

  constructor() {
    this.kalmanFilter = new KalmanFilter();
  }

  addFrame(frame: VisualFrame): void {
    this.frameBuffer.push(frame);
    if (this.frameBuffer.length > this.maxBufferSize) {
      this.frameBuffer.shift();
    }
    this.processingQueue.push(frame);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length < 2) return;

    this.isProcessing = true;

    while (this.processingQueue.length >= 2) {
      const currentFrame = this.processingQueue[this.processingQueue.length - 1];
      const referenceFrame = this.findBestReferenceFrame(currentFrame);

      if (referenceFrame) {
        const disparity = await this.calculateDisparity(
          referenceFrame,
          currentFrame
        );

        const trajectoryPoint = this.fuseTrajectoryData(
          currentFrame,
          disparity,
          referenceFrame
        );

        this.kalmanFilter.update([
          trajectoryPoint.x,
          trajectoryPoint.y,
          trajectoryPoint.z
        ]);

        this.lastTrajectoryPoint = trajectoryPoint;

        this.onTrajectoryUpdate?.(trajectoryPoint);
      }
    }

    this.isProcessing = false;
  }

  private findBestReferenceFrame(currentFrame: VisualFrame): VisualFrame | null {
    if (this.frameBuffer.length < 2) return null;

    const candidates = this.frameBuffer.filter(
      (f) => f.id !== currentFrame.id && f.trainId === currentFrame.trainId
    );

    if (candidates.length === 0) return null;

    let bestCandidate: VisualFrame | null = null;
    let bestTimeDiff = Infinity;

    for (const candidate of candidates) {
      const timeDiff = Math.abs(candidate.timestamp - currentFrame.timestamp);
      if (timeDiff < bestTimeDiff && timeDiff > 0) {
        bestTimeDiff = timeDiff;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  private async calculateDisparity(
    reference: VisualFrame,
    current: VisualFrame
  ): Promise<DisparityResult> {
    const startTime = performance.now();

    const result = await this.runSADCorrelation(reference, current);

    const displacementX = result.x;
    const displacementY = result.y;
    const confidence = Math.min(1, result.similarity / 1000);

    const processingTime = performance.now() - startTime;

    return {
      displacementX,
      displacementY,
      confidence,
      processingTime
    };
  }

  private runSADCorrelation(
    reference: VisualFrame,
    current: VisualFrame
  ): Promise<CorrelationResult> {
    return new Promise((resolve) => {
      const windowSize = 15;
      const searchRange = 50;

      const refData = reference.frameData.data;
      const currData = current.frameData.data;
      const width = reference.frameData.width;
      const height = reference.frameData.height;

      const centerX = Math.floor(width / 2);
      const centerY = Math.floor(height / 2);

      let minSAD = Infinity;
      let bestDx = 0;
      let bestDy = 0;

      for (let dx = -searchRange; dx <= searchRange; dx += 2) {
        for (let dy = -searchRange; dy <= searchRange; dy += 2) {
          let sad = 0;

          for (let i = -windowSize; i <= windowSize; i++) {
            for (let j = -windowSize; j <= windowSize; j++) {
              const refIdx = ((centerY + j) * width + (centerX + i)) * 4;
              const currIdx = ((centerY + j + dy) * width + (centerX + i + dx)) * 4;

              if (
                refIdx >= 0 && refIdx < refData.length &&
                currIdx >= 0 && currIdx < currData.length
              ) {
                sad += Math.abs(refData[refIdx] - currData[currIdx]);
                sad += Math.abs(refData[refIdx + 1] - currData[currIdx + 1]);
                sad += Math.abs(refData[refIdx + 2] - currData[currIdx + 2]);
              }
            }
          }

          if (sad < minSAD) {
            minSAD = sad;
            bestDx = dx;
            bestDy = dy;
          }
        }
      }

      resolve({
        x: bestDx,
        y: bestDy,
        similarity: 10000 / (minSAD + 1)
      });
    });
  }

  private fuseTrajectoryData(
    currentFrame: VisualFrame,
    disparity: DisparityResult,
    referenceFrame: VisualFrame
  ): TrajectoryPoint {
    const timeDelta = (currentFrame.timestamp - referenceFrame.timestamp) / 1000;

    const pixelToMeterRatio = 0.001;

    const estimatedX = disparity.displacementX * pixelToMeterRatio;
    const estimatedY = disparity.displacementY * pixelToMeterRatio;
    const estimatedZ = (currentFrame.displacementY - referenceFrame.displacementY) * pixelToMeterRatio;

    const mileage = this.estimateMileage(referenceFrame, currentFrame, timeDelta);
    const speed = this.estimateSpeed(referenceFrame, currentFrame, timeDelta);
    const acceleration = this.estimateAcceleration(referenceFrame, currentFrame, timeDelta);

    return {
      id: `traj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: currentFrame.timestamp,
      mileage,
      x: estimatedX,
      y: estimatedY,
      z: estimatedZ,
      speed,
      acceleration,
      source: disparity.confidence > 0.8 ? 'visual' : 'fused'
    };
  }

  private estimateMileage(
    reference: VisualFrame,
    current: VisualFrame,
    timeDelta: number
  ): number {
    const avgSpeed = 80;
    const distance = avgSpeed * timeDelta;
    return (this.lastTrajectoryPoint?.mileage || 0) + distance;
  }

  private estimateSpeed(
    reference: VisualFrame,
    current: VisualFrame,
    timeDelta: number
  ): number {
    if (timeDelta <= 0) return 80;

    const displacement = Math.sqrt(
      Math.pow(current.displacementX - reference.displacementX, 2) +
      Math.pow(current.displacementY - reference.displacementY, 2)
    );

    const pixelToMeterRatio = 0.001;
    return (displacement * pixelToMeterRatio) / timeDelta;
  }

  private estimateAcceleration(
    reference: VisualFrame,
    current: VisualFrame,
    timeDelta: number
  ): number {
    if (timeDelta <= 0) return 0;

    const prevSpeed = this.lastTrajectoryPoint?.speed || 80;
    const currentSpeed = this.estimateSpeed(reference, current, timeDelta);

    return (currentSpeed - prevSpeed) / timeDelta;
  }

  onTrajectoryUpdate?: (point: TrajectoryPoint) => void;

  getFrameRate(): number {
    if (this.frameBuffer.length < 2) return 0;

    const oldest = this.frameBuffer[0].timestamp;
    const newest = this.frameBuffer[this.frameBuffer.length - 1].timestamp;
    const duration = (newest - oldest) / 1000;

    return duration > 0 ? this.frameBuffer.length / duration : 0;
  }

  clearBuffer(): void {
    this.frameBuffer = [];
    this.processingQueue = [];
    this.lastTrajectoryPoint = null;
  }
}

class KalmanFilter {
  private state: number[];
  private covariance: number[][];
  private processNoise: number;
  private measurementNoise: number;

  constructor() {
    this.state = [0, 0, 0];
    this.covariance = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
    this.processNoise = 0.01;
    this.measurementNoise = 0.1;
  }

  update(measurement: number[]): number[] {
    const predictedState = [...this.state];

    const predictedCovariance = this.covariance.map((row, i) =>
      row.map((val, j) => {
        if (i === j) return val + this.processNoise;
        return val;
      })
    );

    const kalmanGain = predictedCovariance.map((row, i) =>
      row.map((val) => val / (val + this.measurementNoise))
    );

    this.state = predictedState.map((val, i) => {
      const innovation = measurement[i] - val;
      return val + kalmanGain[i][i] * innovation;
    });

    this.covariance = predictedCovariance.map((row, i) =>
      row.map((val, j) => {
        if (i === j) return val * (1 - kalmanGain[i][i]);
        return val;
      })
    );

    return this.state;
  }

  reset(): void {
    this.state = [0, 0, 0];
    this.covariance = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }
}

export const disparityAlgorithm = new AsyncDisparityAlgorithm();
