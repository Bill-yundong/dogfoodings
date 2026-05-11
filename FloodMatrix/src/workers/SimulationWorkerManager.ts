import type { SimulationConfig, GridCell, PipeNode, PipeConnection, FloodArea } from '../types';

type WorkerStatus = 'idle' | 'initializing' | 'running' | 'paused' | 'completed' | 'error';

interface WorkerCallbacks {
  onProgress?: (data: {
    progress: number;
    grid: GridCell[][];
    nodes: PipeNode[];
    connections: PipeConnection[];
    floodAreas: FloodArea[];
    currentStep: number;
    totalSteps: number;
  }) => void;
  onComplete?: (data: {
    grid: GridCell[][];
    nodes: PipeNode[];
    connections: PipeConnection[];
    floodAreas: FloodArea[];
  }) => void;
  onInitialized?: (data: {
    grid: GridCell[][];
    nodes: PipeNode[];
    connections: PipeConnection[];
  }) => void;
  onError?: (error: string) => void;
}

export class SimulationWorkerManager {
  private worker: Worker | null = null;
  private status: WorkerStatus = 'idle';
  private callbacks: WorkerCallbacks = {};

  constructor(callbacks: WorkerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public init(config: SimulationConfig): void {
    if (this.worker) {
      this.worker.terminate();
    }

    this.status = 'initializing';
    this.worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), {
      type: 'module'
    });

    this.worker.onmessage = (e) => {
      this.handleMessage(e.data);
    };

    this.worker.onerror = (e) => {
      this.status = 'error';
      if (this.callbacks.onError) {
        this.callbacks.onError(e.message);
      }
    };

    this.worker.postMessage({ type: 'init', config });
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'initialized':
        this.status = 'idle';
        if (this.callbacks.onInitialized) {
          this.callbacks.onInitialized({
            grid: data.grid,
            nodes: data.nodes,
            connections: data.connections
          });
        }
        break;

      case 'progress':
        this.status = 'running';
        if (this.callbacks.onProgress) {
          this.callbacks.onProgress({
            progress: data.progress,
            grid: data.grid,
            nodes: data.nodes,
            connections: data.connections,
            floodAreas: data.floodAreas,
            currentStep: data.currentStep,
            totalSteps: data.totalSteps
          });
        }
        break;

      case 'complete':
        this.status = 'completed';
        if (this.callbacks.onComplete) {
          this.callbacks.onComplete({
            grid: data.grid,
            nodes: data.nodes,
            connections: data.connections,
            floodAreas: data.floodAreas
          });
        }
        break;

      case 'error':
        this.status = 'error';
        if (this.callbacks.onError) {
          this.callbacks.onError(data.error);
        }
        break;
    }
  }

  public start(steps: number = 100): void {
    if (this.worker && (this.status === 'idle' || this.status === 'paused')) {
      this.worker.postMessage({ type: 'start', steps });
    }
  }

  public step(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'step' });
    }
  }

  public pause(): void {
    if (this.worker && this.status === 'running') {
      this.status = 'paused';
      this.worker.postMessage({ type: 'pause' });
    }
  }

  public stop(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
      this.status = 'idle';
    }
  }

  public getStatus(): WorkerStatus {
    return this.status;
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.status = 'idle';
    }
  }
}
