import { WeldPoolData, AlignmentStatus, WeldPoint } from '@/types/welding';
import { indexedDBManager } from './indexedDB';

export class DataAlignmentEngine {
  private robotDataBuffer: WeldPoolData[] = [];
  private qcDataBuffer: WeldPoolData[] = [];
  private maxBufferSize: number = 1000;
  private alignmentThreshold: number = 50;
  private lastAlignmentTime: number = 0;
  private driftAccumulator: number = 0;

  constructor(maxBufferSize: number = 1000) {
    this.maxBufferSize = maxBufferSize;
  }

  pushRobotData(data: WeldPoolData): void {
    this.robotDataBuffer.push(data);
    if (this.robotDataBuffer.length > this.maxBufferSize) {
      this.robotDataBuffer.shift();
    }
  }

  pushQCData(data: WeldPoolData): void {
    this.qcDataBuffer.push(data);
    if (this.qcDataBuffer.length > this.maxBufferSize) {
      this.qcDataBuffer.shift();
    }
  }

  private calculateCorrelation(robotData: WeldPoolData[], qcData: WeldPoolData[]): number {
    if (robotData.length !== qcData.length || robotData.length === 0) return 0;

    let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
    const n = robotData.length;

    for (let i = 0; i < n; i++) {
      const x = robotData[i].temperature;
      const y = qcData[i].temperature;
      sumXY += x * y;
      sumX += x;
      sumY += y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private findOptimalOffset(): { offset: number; correlation: number } {
    let bestOffset = 0;
    let bestCorrelation = -1;

    const searchRange = Math.min(50, Math.floor(this.robotDataBuffer.length / 2));

    for (let offset = -searchRange; offset <= searchRange; offset++) {
      const alignedRobot = this.getAlignedSlice(this.robotDataBuffer, offset);
      const alignedQC = this.getAlignedSlice(this.qcDataBuffer, -offset);

      if (alignedRobot.length === 0 || alignedQC.length === 0) continue;

      const correlation = this.calculateCorrelation(alignedRobot, alignedQC);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    }

    return { offset: bestOffset, correlation: bestCorrelation };
  }

  private getAlignedSlice(buffer: WeldPoolData[], offset: number): WeldPoolData[] {
    if (offset >= 0) {
      return buffer.slice(offset);
    }
    return buffer.slice(0, buffer.length + offset);
  }

  performAlignment(): AlignmentStatus {
    const { offset, correlation } = this.findOptimalOffset();

    const now = Date.now();
    const latency = now - Math.max(
      this.robotDataBuffer[this.robotDataBuffer.length - 1]?.timestamp || now,
      this.qcDataBuffer[this.qcDataBuffer.length - 1]?.timestamp || now
    );

    this.driftAccumulator += offset;
    this.lastAlignmentTime = now;

    const synchronized = Math.abs(correlation) > 0.85 && Math.abs(offset) < this.alignmentThreshold;

    if (synchronized && this.robotDataBuffer.length > 0 && this.qcDataBuffer.length > 0) {
      this.saveAlignedData(offset);
    }

    return {
      robotTimestamp: this.robotDataBuffer[this.robotDataBuffer.length - 1]?.timestamp || 0,
      qcTimestamp: this.qcDataBuffer[this.qcDataBuffer.length - 1]?.timestamp || 0,
      latency,
      synchronized,
      drift: this.driftAccumulator,
    };
  }

  private async saveAlignedData(offset: number): Promise<void> {
    const alignedData = this.createAlignedDataset(offset);
    for (const data of alignedData) {
      await indexedDBManager.saveWeldPoolData(data);
    }
  }

  private createAlignedDataset(offset: number): WeldPoolData[] {
    const result: WeldPoolData[] = [];
    const minLen = Math.min(this.robotDataBuffer.length, this.qcDataBuffer.length);

    for (let i = 0; i < minLen - Math.abs(offset); i++) {
      const robotIdx = offset >= 0 ? i + offset : i;
      const qcIdx = offset >= 0 ? i : i - offset;

      if (robotIdx < this.robotDataBuffer.length && qcIdx < this.qcDataBuffer.length) {
        const robotData = this.robotDataBuffer[robotIdx];
        const qcData = this.qcDataBuffer[qcIdx];

        result.push({
          ...robotData,
          temperature: (robotData.temperature + qcData.temperature) / 2,
          current: (robotData.current + qcData.current) / 2,
          voltage: (robotData.voltage + qcData.voltage) / 2,
        });
      }
    }

    return result;
  }

  getAlignmentConfidence(): number {
    const { correlation } = this.findOptimalOffset();
    return Math.max(0, Math.min(100, correlation * 100));
  }

  reset(): void {
    this.robotDataBuffer = [];
    this.qcDataBuffer = [];
    this.driftAccumulator = 0;
    this.lastAlignmentTime = 0;
  }

  getBufferStats(): { robotBufferSize: number; qcBufferSize: number; lastAlignment: number } {
    return {
      robotBufferSize: this.robotDataBuffer.length,
      qcBufferSize: this.qcDataBuffer.length,
      lastAlignment: this.lastAlignmentTime,
    };
  }
}

export const dataAlignmentEngine = new DataAlignmentEngine(1000);
