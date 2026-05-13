import { WeatherType } from '../types/energy';

export const WEATHER_TYPE_LABELS: Record<WeatherType, string> = {
  typical_summer: '典型夏季',
  typical_winter: '典型冬季',
  typical_transition: '过渡季节',
};

export const WEATHER_TYPE_SHORT_LABELS: Record<WeatherType, string> = {
  typical_summer: '夏季',
  typical_winter: '冬季',
  typical_transition: '过渡',
};

export const ENERGY_TYPE_LABELS = {
  cooling: '制冷',
  heating: '供热',
  electricity: '电力',
} as const;

export const STATION_STATUS_LABELS = {
  online: '运行中',
  offline: '已下线',
  maintenance: '维护中',
} as const;

export const SYNC_STATUS_LABELS = {
  synced: '已同步',
  syncing: '同步中',
  error: '同步失败',
} as const;

export const DEFAULT_DEMAND = {
  cooling: 900,
  heating: 750,
  electricity: 1450,
} as const;

export const DEFAULT_STATIONS = [
  {
    id: 'station-1',
    name: '北区能源站',
    location: { lat: 39.92, lng: 116.46 },
    capacity: { cooling: 500, heating: 400, electricity: 700 },
    currentOutput: { cooling: 420, heating: 320, electricity: 620 },
    efficiency: { cooling: 0.85, heating: 0.82, electricity: 0.91 },
    status: 'online' as const,
  },
  {
    id: 'station-2',
    name: '南区能源站',
    location: { lat: 39.88, lng: 116.42 },
    capacity: { cooling: 400, heating: 350, electricity: 600 },
    currentOutput: { cooling: 360, heating: 300, electricity: 540 },
    efficiency: { cooling: 0.88, heating: 0.85, electricity: 0.93 },
    status: 'online' as const,
  },
  {
    id: 'station-3',
    name: '东区能源站',
    location: { lat: 39.90, lng: 116.50 },
    capacity: { cooling: 350, heating: 300, electricity: 500 },
    currentOutput: { cooling: 280, heating: 240, electricity: 420 },
    efficiency: { cooling: 0.82, heating: 0.80, electricity: 0.88 },
    status: 'online' as const,
  },
] as const;

export const TYPICAL_WEATHER_DATA: Record<WeatherType, Omit<import('../types/energy').WeatherData, 'timestamp'>> = {
  typical_summer: {
    temperature: 32,
    humidity: 65,
    solarRadiation: 850,
    windSpeed: 3.5,
  },
  typical_winter: {
    temperature: -2,
    humidity: 45,
    solarRadiation: 280,
    windSpeed: 5.2,
  },
  typical_transition: {
    temperature: 18,
    humidity: 55,
    solarRadiation: 520,
    windSpeed: 2.8,
  },
};

export const DEFAULT_OPTIMIZATION_CONFIG = {
  maxIterations: 100,
  convergenceTolerance: 1e-6,
  learningRate: 0.01,
} as const;

export const SYNC_CONFIG = {
  DATA_SYNC_INTERVAL: 2000,
  OPTIMIZATION_INTERVAL: 10000,
  WEATHER_UPDATE_INTERVAL: 5000,
  HISTORY_UPDATE_INTERVAL: 60000,
  LATENCY_MIN: 30,
  LATENCY_MAX: 50,
} as const;

export const CARBON_EMISSION_FACTORS = {
  electricity: 0.5,
  heating: 0.3,
  cooling: 0.25,
} as const;
