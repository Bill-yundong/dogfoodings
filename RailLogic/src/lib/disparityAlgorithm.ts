import type { TrajectoryPoint, VisualFrame } from '../types';

interface DisparityResult {
  displacementX: number;
  displacementY: number;
  confidence: number;
}

export class AsyncDisparityAlgorithm {
  private frameBuffer: VisualFrame[] = [];
  private maxBufferSize = 30;
  private processingQueue: VisualFrame[] = [];
  private isProcessing = false;
  private lastTrajectoryPoint: TrajectoryPoint | null = null;
  private baseMileage = 0;
  private frameCount = 0;

  constructor() {}

  addFrame(frame: VisualFrame): void {
    this.frameBuffer.push(frame);
    if (this.frameBuffer.length > this.maxBufferSize) {
      this.frameBuffer.shift();
    }

    if (this.frameCount === 0) {
      this.baseMileage = 0;
    }
    this.frameCount++;

    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    if (this.frameBuffer.length < 2) {
      return;
    }

    this.isProcessing = true;

    try {
      const currentFrame = this.frameBuffer[this.frameBuffer.length - 1];
      const referenceFrame = this.frameBuffer[this.frameBuffer.length - 2];

      if (!referenceFrame || referenceFrame.id === currentFrame.id) {
        this.isProcessing = false;
        return;
      }

      const disparity = await this.calculateDisparity(
        referenceFrame,
        currentFrame
      );

      const trajectoryPoint = this.fuseTrajectoryData(
        currentFrame,
        disparity,
        referenceFrame
      );

      this.lastTrajectoryPoint = trajectoryPoint;
      this.onTrajectoryUpdate?.(trajectoryPoint);
    } finally {
      this.isProcessing = false;
    }
  }

  private async calculateDisparity(
    reference: VisualFrame,
    current: VisualFrame
  ): Promise<DisparityResult> {
    const timeDelta = (current.timestamp - reference.timestamp) / 1000;

    if (timeDelta <= 0) {
      return {
        displacementX: current.displacementX - reference.displacementX,
        displacementY: current.displacementY - reference.displacementY,
        confidence: 0.9
      };
    }

    const estimatedDx = (current.displacementX - reference.displacementX);
    const estimatedDy = (current.displacementY - reference.displacementY);

    const baseConfidence = (current.confidence + reference.confidence) / 2;
    const noise = (Math.random() - 0.5) * 2;

    return {
      displacementX: estimatedDx + noise,
      displacementY: estimatedDy + noise * 0.5,
      confidence: Math.max(0.7, Math.min(1, baseConfidence))
    };
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
    const estimatedZ = (currentFrame.displacementY - referenceFrame.displacementY) * pixelToMeterRatio * 0.1;

    const avgSpeed = 83;
    const distance = avgSpeed * timeDelta;

    if (this.lastTrajectoryPoint) {
      this.baseMileage = this.lastTrajectoryPoint.mileage;
    }
    const mileage = this.baseMileage + distance;

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
      source: disparity.confidence > 0.85 ? 'visual' : 'fused'
    };
  }

  private estimateSpeed(
    reference: VisualFrame,
    current: VisualFrame,
    timeDelta: number
  ): number {
    if (timeDelta <= 0) return 300;

    const baseSpeed = this.lastTrajectoryPoint?.speed || 300;
    const variation = (Math.random() - 0.5) * 20;

    return Math.max(250, Math.min(350, baseSpeed + variation));
  }

  private estimateAcceleration(
    reference: VisualFrame,
    current: VisualFrame,
    timeDelta: number
  ): number {
    if (timeDelta <= 0) return 0;

    const prevSpeed = this.lastTrajectoryPoint?.speed || 300;
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
    this.frameCount = 0;
    this.baseMileage = 0;
  }
}

export const disparityAlgorithm = new AsyncDisparityAlgorithm();
