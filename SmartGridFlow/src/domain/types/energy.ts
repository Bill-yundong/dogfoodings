export interface EnergyData {
  cooling: number;
  heating: number;
  electricity: number;
}

export interface EnergyBalance {
  timestamp: number;
  supply: EnergyData;
  demand: EnergyData;
  surplus: EnergyData;
  deficit: EnergyData;
}

export interface EnergyStation {
  id: string;
  name: string;
  location: Coordinates;
  capacity: EnergyData;
  currentOutput: EnergyData;
  efficiency: EnergyData;
  status: StationStatus;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export type StationStatus = 'online' | 'offline' | 'maintenance';

export interface WeatherData {
  temperature: number;
  humidity: number;
  solarRadiation: number;
  windSpeed: number;
  timestamp: number;
}

export interface OperationalSnapshot {
  id?: string;
  weatherType: WeatherType;
  timestamp: number;
  weatherData: WeatherData;
  energyBalance: EnergyBalance;
  stations: EnergyStation[];
  optimizationScore: number;
  carbonEmission: number;
}

export type WeatherType = 'typical_summer' | 'typical_winter' | 'typical_transition';

export interface OptimizationResult {
  optimalOutput: EnergyData;
  stationAllocations: { stationId: string; output: EnergyData }[];
  cost: number;
  efficiency: number;
  convergence: boolean;
  iterations: number;
}

export interface SyncStatus {
  stationId: string;
  lastSync: number;
  latency: number;
  status: SyncState;
}

export type SyncState = 'synced' | 'syncing' | 'error';

export interface OptimizationConfig {
  maxIterations: number;
  convergenceTolerance: number;
  learningRate: number;
}
