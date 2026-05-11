import {
  ChemicalDriftSimulator,
  HydrodynamicFieldGenerator,
  WaterQualityCalculator,
} from '../models/HydrodynamicSemanticModel';
import type {
  WorkerMessage,
  WorkerMessageType,
  HydrodynamicField,
  MonitoringPoint,
  ChemicalDriftTrajectory,
  DriftSimulationConfig,
  WorkerProgress,
} from '../types/hydrodynamics';

class HydrodynamicsWorker {
  private driftSimulator: ChemicalDriftSimulator;

  constructor() {
    this.driftSimulator = new ChemicalDriftSimulator();
  }

  handleMessage(event: MessageEvent): void {
    try {
      const message = event.data as WorkerMessage;
      this.processMessage(message);
    } catch (error) {
      this.postMessage({
        type: 'ERROR' as WorkerMessageType,
        payload: error instanceof Error ? error.message : 'Unknown error',
        requestId: event.data?.requestId || 'unknown',
      });
    }
  }

  private processMessage(message: WorkerMessage): void {
    switch (message.type) {
      case 'PARSE_SPATIOTEMPORAL_FIELD':
        this.parseSpatiotemporalField(message);
        break;
      case 'SIMULATE_CHEMICAL_DRIFT':
        this.simulateChemicalDrift(message);
        break;
      case 'UPDATE_HYDRODYNAMIC_FIELD':
        this.updateHydrodynamicField(message);
        break;
      case 'COMPUTE_ALIGNMENT_SCORE':
        this.computeAlignmentScore(message);
        break;
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  private parseSpatiotemporalField(message: WorkerMessage): void {
    const { rawData, gridSize, cellSize } = message.payload as {
      rawData: MonitoringPoint[];
      gridSize: { x: number; y: number; z: number };
      cellSize: number;
    };

    this.sendProgress(message.requestId, {
      task: '解析水质时空场',
      progress: 0,
      processedItems: 0,
      totalItems: rawData.length,
    });

    const timestamp = Date.now();
    let field = HydrodynamicFieldGenerator.generateEmptyField(gridSize, cellSize, timestamp);

    field = HydrodynamicFieldGenerator.initializeVelocityField(field, {
      x: 0.5,
      y: 0.2,
      z: 0,
    });

    const batchSize = Math.ceil(rawData.length / 10);
    for (let i = 0; i < rawData.length; i += batchSize) {
      const batch = rawData.slice(i, i + batchSize);
      field = HydrodynamicFieldGenerator.updateFieldFromMonitoringPoints(field, batch);

      this.sendProgress(message.requestId, {
        task: '解析水质时空场',
        progress: ((i + batch.length) / rawData.length) * 100,
        processedItems: Math.min(i + batch.length, rawData.length),
        totalItems: rawData.length,
      });
    }

    this.sendResult(message.requestId, {
      field,
      qualityScores: rawData.map((point) => ({
        pointId: point.id,
        score: WaterQualityCalculator.calculateQualityScore(point.waterQuality),
      })),
    });
  }

  private simulateChemicalDrift(message: WorkerMessage): void {
    const { trajectories, field, config } = message.payload as {
      trajectories: ChemicalDriftTrajectory[];
      field: HydrodynamicField;
      config: DriftSimulationConfig;
    };

    this.sendProgress(message.requestId, {
      task: '化学漂移轨迹模拟',
      progress: 0,
      processedItems: 0,
      totalItems: trajectories.length,
    });

    const results: ChemicalDriftTrajectory[] = [];

    for (let i = 0; i < trajectories.length; i++) {
      const trajectory = trajectories[i];
      const result = this.driftSimulator.simulate(trajectory, field, config);
      results.push(result);

      if ((i + 1) % Math.ceil(trajectories.length / 10) === 0) {
        this.sendProgress(message.requestId, {
          task: '化学漂移轨迹模拟',
          progress: ((i + 1) / trajectories.length) * 100,
          processedItems: i + 1,
          totalItems: trajectories.length,
        });
      }
    }

    this.sendResult(message.requestId, { trajectories: results });
  }

  private updateHydrodynamicField(message: WorkerMessage): void {
    const { field, monitoringPoints } = message.payload as {
      field: HydrodynamicField;
      monitoringPoints: MonitoringPoint[];
    };

    this.sendProgress(message.requestId, {
      task: '更新流体动力学场',
      progress: 50,
      processedItems: monitoringPoints.length,
      totalItems: monitoringPoints.length,
    });

    const updatedField = HydrodynamicFieldGenerator.updateFieldFromMonitoringPoints(
      field,
      monitoringPoints
    );

    this.sendResult(message.requestId, { field: updatedField });
  }

  private computeAlignmentScore(message: WorkerMessage): void {
    const { environmentalData, municipalData } = message.payload as {
      environmentalData: MonitoringPoint[];
      municipalData: MonitoringPoint[];
    };

    this.sendProgress(message.requestId, {
      task: '计算系统对齐度',
      progress: 30,
      processedItems: 0,
      totalItems: 2,
    });

    const envScores = environmentalData.map((p) =>
      WaterQualityCalculator.calculateQualityScore(p.waterQuality)
    );
    const munScores = municipalData.map((p) =>
      WaterQualityCalculator.calculateQualityScore(p.waterQuality)
    );

    this.sendProgress(message.requestId, {
      task: '计算系统对齐度',
      progress: 60,
      processedItems: 1,
      totalItems: 2,
    });

    const envAvg = envScores.reduce((a, b) => a + b, 0) / envScores.length;
    const munAvg = munScores.reduce((a, b) => a + b, 0) / munScores.length;

    const alignmentScore = 100 - Math.abs(envAvg - munAvg);
    const isAligned = alignmentScore >= 90;

    this.sendProgress(message.requestId, {
      task: '计算系统对齐度',
      progress: 100,
      processedItems: 2,
      totalItems: 2,
    });

    this.sendResult(message.requestId, {
      alignmentScore,
      isAligned,
      environmentalAverage: envAvg,
      municipalAverage: munAvg,
    });
  }

  private sendProgress(requestId: string, progress: WorkerProgress): void {
    this.postMessage({
      type: 'PROGRESS_UPDATE' as WorkerMessageType,
      payload: progress,
      requestId,
    });
  }

  private sendResult(requestId: string, payload: unknown): void {
    this.postMessage({
      type: 'RESULT' as WorkerMessageType,
      payload,
      requestId,
    });
  }

  private postMessage(message: WorkerMessage): void {
    if (typeof self !== 'undefined' && self.postMessage) {
      self.postMessage(message);
    }
  }
}

if (typeof self !== 'undefined') {
  const worker = new HydrodynamicsWorker();
  self.addEventListener('message', (event) => worker.handleMessage(event));
}
