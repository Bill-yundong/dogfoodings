import type { WeatherCondition } from '../types';

export const GEOLOGY_TYPES = {
  MUD: 'mud',
  SAND: 'sand',
  ROCK: 'rock',
  CLAY: 'clay',
  MIXED: 'mixed'
} as const;

export const GEOLOGY_LABELS: Record<string, string> = {
  [GEOLOGY_TYPES.MUD]: '泥质',
  [GEOLOGY_TYPES.SAND]: '沙质',
  [GEOLOGY_TYPES.ROCK]: '岩质',
  [GEOLOGY_TYPES.CLAY]: '黏质',
  [GEOLOGY_TYPES.MIXED]: '混合'
};

export const DRAG_RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const DRAG_RISK_LABELS: Record<string, string> = {
  [DRAG_RISK_LEVELS.LOW]: '低风险',
  [DRAG_RISK_LEVELS.MEDIUM]: '中等风险',
  [DRAG_RISK_LEVELS.HIGH]: '高风险',
  [DRAG_RISK_LEVELS.CRITICAL]: '危急风险'
};

export const DRAG_RISK_COLORS: Record<string, string> = {
  [DRAG_RISK_LEVELS.LOW]: '#22c55e',
  [DRAG_RISK_LEVELS.MEDIUM]: '#eab308',
  [DRAG_RISK_LEVELS.HIGH]: '#f97316',
  [DRAG_RISK_LEVELS.CRITICAL]: '#ef4444'
};

export const MESSAGE_SOURCES = {
  MONITORING: 'monitoring',
  SHIP: 'ship'
} as const;

export const MESSAGE_TYPES = {
  STATUS_UPDATE: 'status_update',
  ALERT: 'alert',
  COMMAND: 'command',
  ACKNOWLEDGMENT: 'acknowledgment'
} as const;

export const MESSAGE_SOURCE_LABELS: Record<string, string> = {
  [MESSAGE_SOURCES.MONITORING]: '监控中心',
  [MESSAGE_SOURCES.SHIP]: '船舶终端'
};

export const MESSAGE_TYPE_LABELS: Record<string, string> = {
  [MESSAGE_TYPES.STATUS_UPDATE]: '状态更新',
  [MESSAGE_TYPES.ALERT]: '警报',
  [MESSAGE_TYPES.COMMAND]: '指令',
  [MESSAGE_TYPES.ACKNOWLEDGMENT]: '确认'
};

export const ENVIRONMENT_CONSTANTS = {
  WATER_DENSITY: 1025,
  GRAVITY: 9.81,
  AIR_DENSITY: 1.225,
  CHAIN_WEIGHT_PER_METER: 0.15
} as const;

export const HOLDING_CAPACITY_FACTORS: Record<string, number> = {
  [GEOLOGY_TYPES.MUD]: 12,
  [GEOLOGY_TYPES.CLAY]: 10,
  [GEOLOGY_TYPES.SAND]: 8,
  [GEOLOGY_TYPES.ROCK]: 5,
  [GEOLOGY_TYPES.MIXED]: 9
};

export const THRESHOLDS = {
  TYPHOON_WIND_SPEED: 25,
  CRITICAL_WIND_SPEED: 40,
  MIN_SCOPE: 4,
  OPTIMAL_SCOPE: 5,
  MAX_SCOPE: 8
} as const;

export const SAMPLE_DATA = {
  SHIPS: [
    {
      id: 'ship-001',
      name: '东方明珠号',
      mmsi: '413123456',
      length: 225,
      width: 32,
      draft: 12.5,
      grossTonnage: 65000,
      anchorChainLength: 350,
      anchorWeight: 12
    },
    {
      id: 'ship-002',
      name: '南海远航号',
      mmsi: '413654321',
      length: 180,
      width: 28,
      draft: 10.2,
      grossTonnage: 42000,
      anchorChainLength: 300,
      anchorWeight: 10
    },
    {
      id: 'ship-003',
      name: '渤海之星',
      mmsi: '413987654',
      length: 260,
      width: 40,
      draft: 14.8,
      grossTonnage: 88000,
      anchorChainLength: 420,
      anchorWeight: 15
    }
  ],
  ANCHORAGES: [
    {
      id: 'anchorage-001',
      name: '一号避风锚地',
      latitude: 30.1234,
      longitude: 122.5678,
      radius: 1.5,
      maxCapacity: 20,
      geologyType: GEOLOGY_TYPES.MUD,
      holdingCapacity: 0.85,
      depth: 25
    },
    {
      id: 'anchorage-002',
      name: '二号避风锚地',
      latitude: 30.2345,
      longitude: 122.6789,
      radius: 2.0,
      maxCapacity: 30,
      geologyType: GEOLOGY_TYPES.SAND,
      holdingCapacity: 0.72,
      depth: 20
    },
    {
      id: 'anchorage-003',
      name: '三号应急锚地',
      latitude: 30.3456,
      longitude: 122.7890,
      radius: 1.0,
      maxCapacity: 10,
      geologyType: GEOLOGY_TYPES.CLAY,
      holdingCapacity: 0.90,
      depth: 30
    }
  ]
} as const;

export const DEFAULT_WEATHER: WeatherCondition = {
  windSpeed: 15,
  windDirection: 180,
  waveHeight: 2,
  wavePeriod: 8
};

export const DEFAULT_CURRENT_SPEED = 0.8;
