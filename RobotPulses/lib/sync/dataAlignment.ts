import type { DataFrame } from '@/types/robot';

export interface AlignedPair {
  master: DataFrame;
  monitor: DataFrame;
  deviation: number[];
  maxDeviation: number;
  isAligned: boolean;
}

export const calculateChecksum = (joints: number[]): string => {
  let hash = 0;
  for (const joint of joints) {
    hash = ((hash << 5) - hash) + joint * 10000;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

export const createDataFrame = (
  robotId: string,
  frameNumber: number,
  joints: number[],
  timestamp: number = Date.now()
): DataFrame => {
  return {
    frameNumber,
    timestamp,
    robotId,
    joints: [...joints],
    checksum: calculateChecksum(joints),
  };
};

export const verifyDataFrame = (frame: DataFrame): boolean => {
  const calculatedChecksum = calculateChecksum(frame.joints);
  return calculatedChecksum === frame.checksum;
};

export const calculateDeviation = (
  joints1: number[],
  joints2: number[]
): { deviations: number[]; maxDeviation: number } => {
  const deviations = joints1.map((j1, i) => Math.abs(j1 - joints2[i]));
  const maxDeviation = Math.max(...deviations);
  return { deviations, maxDeviation };
};

export class DataAlignmentBuffer {
  private masterBuffer: Map<number, DataFrame> = new Map();
  private monitorBuffer: Map<number, DataFrame> = new Map();
  private maxBufferSize: number = 100;
  private alignmentThreshold: number = 0.001;

  constructor(maxBufferSize: number = 100, alignmentThreshold: number = 0.001) {
    this.maxBufferSize = maxBufferSize;
    this.alignmentThreshold = alignmentThreshold;
  }

  addMasterFrame(frame: DataFrame): void {
    this.masterBuffer.set(frame.frameNumber, frame);
    this.trimBuffer(this.masterBuffer);
  }

  addMonitorFrame(frame: DataFrame): void {
    this.monitorBuffer.set(frame.frameNumber, frame);
    this.trimBuffer(this.monitorBuffer);
  }

  private trimBuffer(buffer: Map<number, DataFrame>): void {
    if (buffer.size > this.maxBufferSize) {
      const keys = Array.from(buffer.keys()).sort((a, b) => a - b);
      const toRemove = keys.slice(0, buffer.size - this.maxBufferSize);
      toRemove.forEach(key => buffer.delete(key));
    }
  }

  getAlignedPairs(): AlignedPair[] {
    const alignedPairs: AlignedPair[] = [];
    const commonFrameNumbers = Array.from(this.masterBuffer.keys())
      .filter(fn => this.monitorBuffer.has(fn))
      .sort((a, b) => a - b);

    for (const frameNumber of commonFrameNumbers) {
      const masterFrame = this.masterBuffer.get(frameNumber)!;
      const monitorFrame = this.monitorBuffer.get(frameNumber)!;

      const { deviations, maxDeviation } = calculateDeviation(
        masterFrame.joints,
        monitorFrame.joints
      );

      alignedPairs.push({
        master: masterFrame,
        monitor: monitorFrame,
        deviation: deviations,
        maxDeviation,
        isAligned: maxDeviation < this.alignmentThreshold,
      });
    }

    return alignedPairs;
  }

  getLatestAlignedPair(): AlignedPair | null {
    const pairs = this.getAlignedPairs();
    return pairs.length > 0 ? pairs[pairs.length - 1] : null;
  }

  isDataAligned(frameNumber?: number): boolean {
    if (frameNumber !== undefined) {
      const master = this.masterBuffer.get(frameNumber);
      const monitor = this.monitorBuffer.get(frameNumber);
      if (!master || !monitor) return false;
      const { maxDeviation } = calculateDeviation(master.joints, monitor.joints);
      return maxDeviation < this.alignmentThreshold;
    }

    const latest = this.getLatestAlignedPair();
    return latest ? latest.isAligned : false;
  }

  clear(): void {
    this.masterBuffer.clear();
    this.monitorBuffer.clear();
  }

  getBufferSizes(): { master: number; monitor: number } {
    return {
      master: this.masterBuffer.size,
      monitor: this.monitorBuffer.size,
    };
  }
}

export const alignByTimestamp = (
  masterFrames: DataFrame[],
  monitorFrames: DataFrame[],
  maxTimeDiff: number = 50
): AlignedPair[] => {
  const alignedPairs: AlignedPair[] = [];
  const sortedMaster = [...masterFrames].sort((a, b) => a.timestamp - b.timestamp);
  const sortedMonitor = [...monitorFrames].sort((a, b) => a.timestamp - b.timestamp);

  for (const masterFrame of sortedMaster) {
    let bestMatch: DataFrame | null = null;
    let bestDiff = Infinity;

    for (const monitorFrame of sortedMonitor) {
      const timeDiff = Math.abs(masterFrame.timestamp - monitorFrame.timestamp);
      if (timeDiff < bestDiff && timeDiff <= maxTimeDiff) {
        bestDiff = timeDiff;
        bestMatch = monitorFrame;
      }
    }

    if (bestMatch) {
      const { deviations, maxDeviation } = calculateDeviation(
        masterFrame.joints,
        bestMatch.joints
      );

      alignedPairs.push({
        master: masterFrame,
        monitor: bestMatch,
        deviation: deviations,
        maxDeviation,
        isAligned: maxDeviation < 0.001,
      });
    }
  }

  return alignedPairs;
};
