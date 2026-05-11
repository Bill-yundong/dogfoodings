import type {
  WorkerMessage,
  WorkerMessageType,
  WorkerProgress,
  HydrodynamicField,
  MonitoringPoint,
  ChemicalDriftTrajectory,
  DriftSimulationConfig,
} from '../types/hydrodynamics';

type TaskCallback<T> = (result: T) => void;
type ProgressCallback = (progress: WorkerProgress) => void;
type ErrorCallback = (error: string) => void;

interface PendingTask {
  onResult: TaskCallback<unknown>;
  onProgress?: ProgressCallback;
  onError?: ErrorCallback;
}

export class HydrodynamicsWorkerService {
  private worker: Worker | null = null;
  private pendingTasks = new Map<string, PendingTask>();
  private workerUrl: string;

  constructor(workerUrl = '/src/workers/hydrodynamics.worker.ts') {
    this.workerUrl = workerUrl;
  }

  init(): void {
    if (this.worker) return;

    try {
      this.worker = new Worker(new URL(this.workerUrl, import.meta.url), {
        type: 'module',
      });
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Failed to initialize worker:', error);
    }
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingTasks.clear();
  }

  async parseSpatiotemporalField(
    rawData: MonitoringPoint[],
    gridSize = { x: 50, y: 50, z: 10 },
    cellSize = 10,
    onProgress?: ProgressCallback
  ): Promise<{
    field: HydrodynamicField;
    qualityScores: { pointId: string; score: number }[];
  }> {
    this.ensureInitialized();

    const requestId = this.generateRequestId();

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(requestId, {
        onResult: resolve as TaskCallback<unknown>,
        onProgress,
        onError: reject,
      });

      this.worker!.postMessage({
        type: 'PARSE_SPATIOTEMPORAL_FIELD' as WorkerMessageType,
        payload: { rawData, gridSize, cellSize },
        requestId,
      });
    });
  }

  async simulateChemicalDrift(
    trajectories: ChemicalDriftTrajectory[],
    field: HydrodynamicField,
    config: Partial<DriftSimulationConfig> = {},
    onProgress?: ProgressCallback
  ): Promise<{ trajectories: ChemicalDriftTrajectory[] }> {
    this.ensureInitialized();

    const requestId = this.generateRequestId();
    const defaultConfig: DriftSimulationConfig = {
      timeSteps: 100,
      diffusionCoefficient: 0.1,
      advectionCoefficient: 1.0,
      decayRate: 0.001,
      boundaryConditions: [],
      ...config,
    };

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(requestId, {
        onResult: resolve as TaskCallback<unknown>,
        onProgress,
        onError: reject,
      });

      this.worker!.postMessage({
        type: 'SIMULATE_CHEMICAL_DRIFT' as WorkerMessageType,
        payload: { trajectories, field, config: defaultConfig },
        requestId,
      });
    });
  }

  async updateHydrodynamicField(
    field: HydrodynamicField,
    monitoringPoints: MonitoringPoint[],
    onProgress?: ProgressCallback
  ): Promise<{ field: HydrodynamicField }> {
    this.ensureInitialized();

    const requestId = this.generateRequestId();

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(requestId, {
        onResult: resolve as TaskCallback<unknown>,
        onProgress,
        onError: reject,
      });

      this.worker!.postMessage({
        type: 'UPDATE_HYDRODYNAMIC_FIELD' as WorkerMessageType,
        payload: { field, monitoringPoints },
        requestId,
      });
    });
  }

  async computeAlignmentScore(
    environmentalData: MonitoringPoint[],
    municipalData: MonitoringPoint[],
    onProgress?: ProgressCallback
  ): Promise<{
    alignmentScore: number;
    isAligned: boolean;
    environmentalAverage: number;
    municipalAverage: number;
  }> {
    this.ensureInitialized();

    const requestId = this.generateRequestId();

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(requestId, {
        onResult: resolve as TaskCallback<unknown>,
        onProgress,
        onError: reject,
      });

      this.worker!.postMessage({
        type: 'COMPUTE_ALIGNMENT_SCORE' as WorkerMessageType,
        payload: { environmentalData, municipalData },
        requestId,
      });
    });
  }

  private handleMessage(event: MessageEvent): void {
    const message = event.data as WorkerMessage;
    const task = this.pendingTasks.get(message.requestId);

    if (!task) return;

    switch (message.type) {
      case 'PROGRESS_UPDATE':
        task.onProgress?.(message.payload as WorkerProgress);
        break;
      case 'RESULT':
        task.onResult(message.payload);
        this.pendingTasks.delete(message.requestId);
        break;
      case 'ERROR':
        task.onError?.(message.payload as string);
        this.pendingTasks.delete(message.requestId);
        break;
    }
  }

  private handleError(event: ErrorEvent): void {
    console.error('Worker error:', event);
    for (const task of this.pendingTasks.values()) {
      task.onError?.(event.message || 'Unknown worker error');
    }
    this.pendingTasks.clear();
  }

  private ensureInitialized(): void {
    if (!this.worker) {
      this.init();
    }
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const workerService = new HydrodynamicsWorkerService();
