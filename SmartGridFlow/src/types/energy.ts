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
  location: { lat: number; lng: number };
  capacity: EnergyData;
  currentOutput: EnergyData;
  efficiency: EnergyData;
  status: 'online' | 'offline' | 'maintenance';
}

export interface CommandCenter {
  id: string;
  name: string;
  connectedStations: string[];
  lastSyncTime: number;
  totalDemand: EnergyData;
  totalSupply: EnergyData;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  solarRadiation: number;
  windSpeed: number;
  timestamp: number;
}

export interface OperationalSnapshot {
  id?: string;
  weatherType: 'typical_summer' | 'typical_winter' | 'typical_transition';
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
  status: 'synced' | 'syncing' | 'error';
}
