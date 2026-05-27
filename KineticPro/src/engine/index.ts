import type {
  KeypointFrame,
  SwingTrajectory,
  BiomechanicsMetrics,
  AlignmentResult,
  EngineStatus,
  CollectionStatus,
} from '@/types';
import { generateKeypointFrames, generateSwingTrajectory, generateBiomechanicsMetrics, generateAlignmentResult } from './mockData';

type EngineEventType = 'frame' | 'trajectory' | 'metrics' | 'alignment' | 'status' | 'collection';
type EngineEventHandler = (data: unknown) => void;

class KeypointRecognitionEngine {
  private handlers: Map<EngineEventType, Set<EngineEventHandler>> = new Map();
  private frameTimer: ReturnType<typeof setInterval> | null = null;
  private statusTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private frameIndex = 0;
  private totalFrames = 120;
  private frameBuffer: KeypointFrame[] = [];
  private processedCount = 0;

  on(event: EngineEventType, handler: EngineEventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private emit(event: EngineEventType, data: unknown) {
    this.handlers.get(event)?.forEach(h => h(data));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.frameIndex = 0;
    this.frameBuffer = [];
    this.processedCount = 0;

    this.emit('status', {
      state: 'processing',
      queueSize: 0,
      throughput: 0,
      avgLatency: 0,
      lastFrameIndex: 0,
    } as EngineStatus);

    this.frameTimer = setInterval(() => {
      if (this.frameIndex >= this.totalFrames) {
        this.completeSession();
        return;
      }

      const frames = generateKeypointFrames(1);
      const frame = { ...frames[0], frameIndex: this.frameIndex };
      this.frameBuffer.push(frame);
      this.processedCount++;

      this.emit('frame', frame);
      this.emit('status', {
        state: 'processing',
        queueSize: Math.max(0, this.frameBuffer.length - 3),
        throughput: this.processedCount / ((Date.now() % 10000) / 1000 || 1),
        avgLatency: 8 + Math.random() * 4,
        lastFrameIndex: this.frameIndex,
      } as EngineStatus);

      if (this.frameIndex % 10 === 0 && this.frameIndex > 0) {
        const metrics = generateBiomechanicsMetrics();
        this.emit('metrics', metrics);
      }

      this.frameIndex++;
    }, 33);

    this.statusTimer = setInterval(() => {
      this.emit('collection', {
        connected: true,
        fps: 28 + Math.floor(Math.random() * 4),
        alignmentScore: 0.92 + Math.random() * 0.07,
        engineLatency: 8 + Math.random() * 6,
      } as CollectionStatus);
    }, 500);
  }

  private completeSession() {
    if (this.frameTimer) {
      clearInterval(this.frameTimer);
      this.frameTimer = null;
    }
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }

    const trajectory = generateSwingTrajectory();
    const metrics = generateBiomechanicsMetrics();
    const alignment = generateAlignmentResult();

    this.emit('trajectory', trajectory);
    this.emit('metrics', metrics);
    this.emit('alignment', alignment);
    this.emit('status', {
      state: 'idle',
      queueSize: 0,
      throughput: this.processedCount,
      avgLatency: 10,
      lastFrameIndex: this.frameIndex,
    } as EngineStatus);

    this.isRunning = false;
  }

  stop() {
    if (this.frameTimer) clearInterval(this.frameTimer);
    if (this.statusTimer) clearInterval(this.statusTimer);
    this.frameTimer = null;
    this.statusTimer = null;
    this.isRunning = false;
    this.emit('status', {
      state: 'idle',
      queueSize: 0,
      throughput: 0,
      avgLatency: 0,
      lastFrameIndex: this.frameIndex,
    } as EngineStatus);
  }

  getIsRunning() {
    return this.isRunning;
  }
}

export const engine = new KeypointRecognitionEngine();

export class SemanticAligner {
  static align(sourceData: Record<string, unknown>, targetSchema: string[]): AlignmentResult {
    const fieldMappings = targetSchema.map(target => {
      const source = Object.keys(sourceData).find(s => this.computeSimilarity(s, target) > 0.5);
      return {
        sourceField: source || 'unknown',
        targetField: target,
        confidence: source ? 0.85 + Math.random() * 0.14 : 0.1 + Math.random() * 0.3,
        deviation: source ? Math.random() * 0.05 : 0.1 + Math.random() * 0.5,
      };
    });

    const size = fieldMappings.length;
    const deviationHeatmap: number[][] = [];
    for (let i = 0; i < size; i++) {
      const row: number[] = [];
      for (let j = 0; j < size; j++) {
        row.push(i === j ? fieldMappings[i].deviation : 0.2 + Math.random() * 0.5);
      }
      deviationHeatmap.push(row);
    }

    const alignmentScore = fieldMappings.reduce((sum, m) => sum + m.confidence, 0) / fieldMappings.length;

    return { alignmentScore, fieldMappings, deviationHeatmap };
  }

  private static computeSimilarity(a: string, b: string): number {
    const aParts = a.toLowerCase().split(/[_./]/);
    const bParts = b.toLowerCase().split(/[_./]/);
    const overlap = aParts.filter(ap => bParts.some(bp => bp.includes(ap) || ap.includes(bp)));
    return overlap.length / Math.max(aParts.length, bParts.length);
  }
}

export class BiomechanicsExtractor {
  static computeCenterOfGravity(frames: KeypointFrame[]): [number, number, number][] {
    const hipIndices = [11, 12];
    const shoulderIndices = [5, 6];

    return frames.map(frame => {
      const hips = hipIndices.map(i => frame.keypoints.find(k => k.id === i)).filter(Boolean);
      const shoulders = shoulderIndices.map(i => frame.keypoints.find(k => k.id === i)).filter(Boolean);
      const all = [...hips, ...shoulders];

      if (all.length === 0) return [0, 0.9, 0] as [number, number, number];

      const x = all.reduce((s, k) => s + k!.position[0], 0) / all.length;
      const y = all.reduce((s, k) => s + k!.position[1], 0) / all.length;
      const z = all.reduce((s, k) => s + k!.position[2], 0) / all.length;
      return [x, y, z];
    });
  }

  static computeAngularVelocity(frames: KeypointFrame[]): number[] {
    return frames.map((frame, i) => {
      if (i === 0) return 0;
      const prev = frames[i - 1];
      const wrist = frame.keypoints.find(k => k.id === 10);
      const prevWrist = prev.keypoints.find(k => k.id === 10);
      if (!wrist || !prevWrist) return 0;
      const dx = wrist.position[0] - prevWrist.position[0];
      const dy = wrist.position[1] - prevWrist.position[1];
      const dz = wrist.position[2] - prevWrist.position[2];
      return Math.sqrt(dx * dx + dy * dy + dz * dz) * 60;
    });
  }

  static detectAnomalies(values: number[], threshold: number = 2): { index: number; severity: number }[] {
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    if (std === 0) return [];

    return values
      .map((v, i) => ({
        index: i,
        severity: Math.abs(v - mean) / std > threshold ? Math.min((Math.abs(v - mean) / std - threshold) / threshold, 1) : 0,
      }))
      .filter(a => a.severity > 0);
  }
}
