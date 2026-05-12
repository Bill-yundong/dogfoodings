import { SecurityNode, SpaceConsistencyCheck, BiometricHash } from '@/types/security';

export interface FrameData {
  id: string;
  timestamp: number;
  nodeId: string;
  features: number[];
  confidence: number;
}

export class SpaceConsistencyDetector {
  private static readonly SPATIAL_TOLERANCE = 0.15;
  private static readonly TEMPORAL_WINDOW = 100;

  private frameBuffer: Map<string, FrameData[]> = new Map();
  private checkHistory: SpaceConsistencyCheck[] = [];

  async processMultiNodeFrames(
    nodes: SecurityNode[],
    generateFrame: (node: SecurityNode) => Promise<FrameData>
  ): Promise<SpaceConsistencyCheck> {
    const startTime = performance.now();

    const framePromises = nodes.map(node => generateFrame(node));
    const frames = await Promise.all(framePromises);

    for (const frame of frames) {
      this.bufferFrame(frame);
    }

    const isConsistent = this.verifySpatialConsistency(frames);
    const confidence = this.calculateConsistencyConfidence(frames);

    const check: SpaceConsistencyCheck = {
      id: `check-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      nodes: nodes.map(n => n.id),
      timestamp: Date.now(),
      isConsistent,
      confidence,
      duration: performance.now() - startTime,
    };

    this.checkHistory.push(check);
    return check;
  }

  private bufferFrame(frame: FrameData): void {
    if (!this.frameBuffer.has(frame.nodeId)) {
      this.frameBuffer.set(frame.nodeId, []);
    }
    
    const buffers = this.frameBuffer.get(frame.nodeId)!;
    buffers.push(frame);
    
    const cutoff = Date.now() - this.TEMPORAL_WINDOW;
    this.frameBuffer.set(
      frame.nodeId,
      buffers.filter(f => f.timestamp > cutoff)
    );
  }

  private verifySpatialConsistency(frames: FrameData[]): boolean {
    if (frames.length < 2) return true;

    const baseFrame = frames[0];
    
    for (let i = 1; i < frames.length; i++) {
      const similarity = this.calculateFeatureSimilarity(
        baseFrame.features,
        frames[i].features
      );
      
      if (similarity < (1 - this.SPATIAL_TOLERANCE)) {
        return false;
      }
    }

    return true;
  }

  private calculateFeatureSimilarity(features1: number[], features2: number[]): number {
    if (features1.length !== features2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < features1.length; i++) {
      dotProduct += features1[i] * features2[i];
      norm1 += features1[i] ** 2;
      norm2 += features2[i] ** 2;
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private calculateConsistencyConfidence(frames: FrameData[]): number {
    if (frames.length === 0) return 0;

    let totalConfidence = 0;
    for (const frame of frames) {
      totalConfidence += frame.confidence;
    }

    const avgConfidence = totalConfidence / frames.length;
    const timeSpread = this.calculateTimeSpread(frames);
    const timeFactor = Math.max(0, 1 - timeSpread / this.TEMPORAL_WINDOW);

    return avgConfidence * timeFactor;
  }

  private calculateTimeSpread(frames: FrameData[]): number {
    if (frames.length < 2) return 0;
    
    const timestamps = frames.map(f => f.timestamp);
    return Math.max(...timestamps) - Math.min(...timestamps);
  }

  getRecentChecks(limit: number = 50): SpaceConsistencyCheck[] {
    return this.checkHistory.slice(-limit).reverse();
  }

  clearBuffer(): void {
    this.frameBuffer.clear();
  }
}

export class AsyncImageRecognition {
  private static readonly WORKER_POOL_SIZE = 4;
  private queue: Map<string, () => Promise<FrameData>> = new Map();
  private processing: Set<string> = new Set();
  private results: Map<string, FrameData> = new Map();

  async batchRecognize(
    nodes: SecurityNode[],
    imageData: Map<string, string>
  ): Promise<Map<string, FrameData>> {
    const batchId = Date.now().toString();

    for (const node of nodes) {
      const data = imageData.get(node.id);
      if (data) {
        this.queue.set(`${batchId}-${node.id}`, () => this.recognizeSingle(node, data));
      }
    }

    await this.processQueue();

    const resultMap = new Map<string, FrameData>();
    for (const node of nodes) {
      const result = this.results.get(`${batchId}-${node.id}`);
      if (result) resultMap.set(node.id, result);
    }

    return resultMap;
  }

  private async processQueue(): Promise<void> {
    const workers: Promise<void>[] = [];
    
    for (let i = 0; i < this.WORKER_POOL_SIZE; i++) {
      workers.push(this.workerLoop());
    }

    await Promise.all(workers);
  }

  private async workerLoop(): Promise<void> {
    while (this.queue.size > 0) {
      const entry = Array.from(this.queue.entries())[0];
      if (!entry) break;

      const [key, task] = entry;
      
      if (!this.processing.has(key)) {
        this.processing.add(key);
        this.queue.delete(key);

        try {
          const result = await task();
          this.results.set(key, result);
        } catch (error) {
          console.error('Recognition error:', error);
        } finally {
          this.processing.delete(key);
        }
      }
    }
  }

  private async recognizeSingle(node: SecurityNode, imageData: string): Promise<FrameData> {
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15));

    const features = this.extractFeatures(imageData);
    
    return {
      id: `frame-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      nodeId: node.id,
      features,
      confidence: 0.85 + Math.random() * 0.14,
    };
  }

  private extractFeatures(imageData: string): number[] {
    const features: number[] = [];
    for (let i = 0; i < 128; i++) {
      const charCode = imageData.charCodeAt(i % imageData.length);
      features.push((charCode / 255) * (Math.random() * 0.2 + 0.9));
    }
    return features;
  }

  clearResults(): void {
    this.results.clear();
  }
}
