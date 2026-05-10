import {
  Hydrant,
  PressureReading,
  ConflictRecord,
  WaterMain,
  SemanticMetadata,
  HydrantStatus,
  DataSource,
} from '../src/types';
import { PRESSURE_THRESHOLDS } from '../src/constants';

let hydrantCounter = 0;

export const createMockHydrant = (overrides: Partial<Hydrant> = {}): Hydrant => {
  hydrantCounter++;
  return {
    id: `HYD-${Date.now()}-${hydrantCounter}`,
    code: `HX-${String(hydrantCounter).padStart(6, '0')}`,
    name: `消火栓-${hydrantCounter}`,
    position: {
      lng: 116.2 + Math.random() * 0.6,
      lat: 39.7 + Math.random() * 0.6,
    },
    diameter: 100 + Math.floor(Math.random() * 50),
    elevation: Math.random() * 50,
    connectedMainId: `WM-${Math.floor(Math.random() * 100)}`,
    status: HydrantStatus.NORMAL,
    installationDate: `202${Math.floor(Math.random() * 10)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
    region: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区'][
      Math.floor(Math.random() * 5)
    ],
    address: `测试街道${hydrantCounter}号`,
    ...overrides,
  };
};

export const createMockPressureReading = (
  hydrantId: string,
  source: DataSource = DataSource.SIMULATED,
  overrides: Partial<PressureReading> = {}
): PressureReading => {
  return {
    hydrantId,
    pressure: PRESSURE_THRESHOLDS.LOW + Math.random() * 0.5,
    timestamp: Date.now(),
    source,
    confidence: 0.7 + Math.random() * 0.3,
    flowRate: 5 + Math.random() * 15,
    temperature: 10 + Math.random() * 15,
    ...overrides,
  };
};

export const createMockConflict = (
  hydrantId: string,
  pressureDiff: number = 0.15
): ConflictRecord => {
  const basePressure = 0.3;
  return {
    hydrantId,
    fireDeptReading: {
      hydrantId,
      pressure: basePressure + pressureDiff / 2,
      timestamp: Date.now(),
      source: DataSource.FIRE_DEPARTMENT,
      confidence: 0.8,
    },
    waterCompanyReading: {
      hydrantId,
      pressure: basePressure - pressureDiff / 2,
      timestamp: Date.now(),
      source: DataSource.WATER_COMPANY,
      confidence: 0.85,
    },
    detectedTime: Date.now(),
    resolved: false,
  };
};

export const createMockWaterMain = (overrides: Partial<WaterMain> = {}): WaterMain => {
  return {
    id: `WM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `管网-${Math.floor(Math.random() * 100)}`,
    diameter: 0.2 + Math.random() * 0.3,
    material: 'ductile_iron',
    frictionCoefficient: 130,
    maxPressure: 1.0,
    minPressure: 0.1,
    ...overrides,
  };
};

export const createMockSemanticMetadata = (
  overrides: Partial<SemanticMetadata> = {}
): SemanticMetadata => {
  return {
    fireDeptSemantic: {
      category: '消防供水设施',
      criticalThreshold: 0.1,
      alertThreshold: 0.2,
      responsePriority: 'medium',
    },
    waterCompanySemantic: {
      category: '管网末端压力点',
      supplyZone: 'default_zone',
      networkNodeType: 'terminal',
      maintenanceCycle: 90,
    },
    mappingVersion: '1.0.0',
    lastSyncTime: Date.now(),
    syncStatus: 'synced',
    ...overrides,
  };
};

export const createBatchHydrants = (count: number): Hydrant[] => {
  return Array.from({ length: count }, () => createMockHydrant());
};

export const createBatchReadings = (
  hydrants: Hydrant[],
  readingsPerHydrant: number = 24
): PressureReading[] => {
  const readings: PressureReading[] = [];
  for (const hydrant of hydrants) {
    for (let i = 0; i < readingsPerHydrant; i++) {
      const source = Math.random() > 0.5
        ? DataSource.FIRE_DEPARTMENT
        : DataSource.WATER_COMPANY;
      readings.push(
        createMockPressureReading(hydrant.id, source, {
          timestamp: Date.now() - i * 3600000,
        })
      );
    }
  }
  return readings;
};

export const createConflictingReadings = (
  hydrantId: string
): { fireDept: PressureReading; waterCompany: PressureReading } => {
  const now = Date.now();
  return {
    fireDept: createMockPressureReading(hydrantId, DataSource.FIRE_DEPARTMENT, {
      pressure: 0.45,
      timestamp: now,
      confidence: 0.8,
    }),
    waterCompany: createMockPressureReading(
      hydrantId,
      DataSource.WATER_COMPANY,
      {
        pressure: 0.25,
        timestamp: now,
        confidence: 0.85,
      }
    ),
  };
};

export const createNonConflictingReadings = (
  hydrantId: string
): { fireDept: PressureReading; waterCompany: PressureReading } => {
  const now = Date.now();
  return {
    fireDept: createMockPressureReading(hydrantId, DataSource.FIRE_DEPARTMENT, {
      pressure: 0.35,
      timestamp: now,
      confidence: 0.8,
    }),
    waterCompany: createMockPressureReading(
      hydrantId,
      DataSource.WATER_COMPANY,
      {
        pressure: 0.36,
        timestamp: now,
        confidence: 0.85,
      }
    ),
  };
};
