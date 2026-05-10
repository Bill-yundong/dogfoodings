import { FireDeptSemantic, WaterCompanySemantic } from '../types';

export const SEMANTIC_MAPPING_VERSION = '1.0.0';

export const PRESSURE_THRESHOLDS = {
  CRITICAL: 0.1,
  LOW: 0.2,
  NORMAL: 0.3,
  MAX: 1.0,
} as const;

export const DEFAULT_FIRE_DEPT_SEMANTIC: FireDeptSemantic = {
  category: '消防供水设施',
  criticalThreshold: 0.1,
  alertThreshold: 0.2,
  responsePriority: 'medium',
};

export const DEFAULT_WATER_COMPANY_SEMANTIC: WaterCompanySemantic = {
  category: '管网末端压力点',
  supplyZone: 'default_zone',
  networkNodeType: 'terminal',
  maintenanceCycle: 90,
};

export const PIPE_MATERIAL_FRICTION: Record<string, number> = {
  cast_iron: 120,
  ductile_iron: 130,
  steel: 140,
  pvc: 150,
  hdpe: 145,
} as const;

export const WATER_VISCOSITY = 1.004e-6;

export const SYNC_INTERVAL = 5 * 60 * 1000;
export const CACHE_TTL = 30 * 60 * 1000;
export const MAX_HISTORY_POINTS = 100;
