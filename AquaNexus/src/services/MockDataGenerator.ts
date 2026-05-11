import type {
  MonitoringPoint,
  WaterQualityParam,
  ChemicalDriftTrajectory,
  SystemSnapshot,
} from '../types/hydrodynamics';
import { WaterQualityCalculator } from '../models/HydrodynamicSemanticModel';

export class MockDataGenerator {
  private static readonly POINT_NAMES = [
    '上游取水口',
    '中游监测站A',
    '中游监测站B',
    '下游净水厂',
    '水库入口',
    '水库中心',
    '水库出口',
    '城市管网入口',
    '工业园区排水口',
    '农业灌溉区',
    '生态补水口',
    '应急监测点1',
    '应急监测点2',
    '应急监测点3',
  ];

  static generateMonitoringPoints(count = 1000): MonitoringPoint[] {
    const points: MonitoringPoint[] = [];

    for (let i = 0; i < count; i++) {
      const waterQuality = this.generateWaterQuality();
      const score = WaterQualityCalculator.calculateQualityScore(waterQuality);
      const status = WaterQualityCalculator.getStatusFromScore(score);

      points.push({
        id: `mp_${i}`,
        name: this.POINT_NAMES[i % this.POINT_NAMES.length] || `监测点${i}`,
        coordinate: {
          x: Math.random() * 500,
          y: Math.random() * 500,
          z: Math.random() * 10,
        },
        waterQuality,
        velocity: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          z: (Math.random() - 0.5) * 0.5,
        },
        pressure: 100 + Math.random() * 50,
        lastUpdate: Date.now() - Math.random() * 3600000,
        status,
      });
    }

    return points;
  }

  static generateWaterQuality(): WaterQualityParam {
    const baseScore = 0.7 + Math.random() * 0.3;

    return {
      pH: 6.5 + Math.random() * 2,
      turbidity: Math.random() * 10 * (1 - baseScore),
      dissolvedOxygen: 5 + Math.random() * 5 * baseScore,
      temperature: 15 + Math.random() * 15,
      conductivity: 500 + Math.random() * 1000 * (1 - baseScore),
      ammoniaNitrogen: Math.random() * 1 * (1 - baseScore),
      totalPhosphorus: Math.random() * 0.2 * (1 - baseScore),
      chemicalOxygenDemand: Math.random() * 20 * (1 - baseScore),
    };
  }

  static generateChemicalTrajectories(count = 5): ChemicalDriftTrajectory[] {
    const chemicalTypes = ['有机物', '重金属', '营养盐', '石油类', '酚类'];
    const trajectories: ChemicalDriftTrajectory[] = [];

    for (let i = 0; i < count; i++) {
      const startPoint = {
        x: Math.random() * 500,
        y: Math.random() * 500,
        z: Math.random() * 5,
      };

      const positions = [startPoint];
      const timestamps = [Date.now()];
      let currentPosition = { ...startPoint };

      for (let t = 1; t < 20; t++) {
        currentPosition = {
          x: currentPosition.x + (Math.random() - 0.5) * 5,
          y: currentPosition.y + (Math.random() - 0.5) * 5,
          z: Math.max(0, currentPosition.z + (Math.random() - 0.5) * 1),
        };
        positions.push({ ...currentPosition });
        timestamps.push(Date.now() + t * 60000);
      }

      const concentration = 0.3 + Math.random() * 0.7;
      const riskLevel =
        concentration > 0.7
          ? 'extreme'
          : concentration > 0.5
          ? 'high'
          : concentration > 0.3
          ? 'medium'
          : 'low';

      trajectories.push({
        id: `traj_${i}`,
        chemicalType: chemicalTypes[i % chemicalTypes.length],
        startPoint,
        currentPosition,
        concentration,
        diffusionRate: 0.05 + Math.random() * 0.1,
        velocityVector: {
          x: (Math.random() - 0.5) * 1,
          y: (Math.random() - 0.5) * 1,
          z: (Math.random() - 0.5) * 0.2,
        },
        positions,
        timestamps,
        riskLevel,
      });
    }

    return trajectories;
  }

  static generateSystemSnapshot(
    monitoringPoints?: MonitoringPoint[],
    trajectories?: ChemicalDriftTrajectory[]
  ): SystemSnapshot {
    const points = monitoringPoints || this.generateMonitoringPoints(100);
    const trajs = trajectories || this.generateChemicalTrajectories();

    const id = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const hash = btoa(id + Date.now()).substr(0, 32);

    return {
      metadata: {
        id,
        timestamp: Date.now(),
        monitoringPointCount: points.length,
        hash,
        isOffline: !navigator.onLine,
        synchronizationStatus: 'pending',
      },
      monitoringPoints: points,
      hydrodynamicField: {
        gridSize: { x: 50, y: 50, z: 10 },
        cellSize: 10,
        velocityField: new Float32Array(50 * 50 * 10 * 3),
        pressureField: new Float32Array(50 * 50 * 10),
        concentrationField: new Float32Array(50 * 50 * 10),
        time: {
          timestamp: Date.now(),
          timeStep: 1,
        },
      },
      chemicalTrajectories: trajs,
      dispatchCommands: [],
    };
  }
}
