export interface CoolingLoad {
  current: number;
  target: number;
  capacity: number;
  efficiency: number;
}

export interface HeatingLoad {
  current: number;
  target: number;
  capacity: number;
  efficiency: number;
}

export interface ElectricityLoad {
  current: number;
  target: number;
  capacity: number;
  efficiency: number;
  renewableRatio: number;
}

export interface EnergyBalance {
  cooling: CoolingLoad;
  heating: HeatingLoad;
  electricity: ElectricityLoad;
  timestamp: number;
}

export interface EnergyStation {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  balance: EnergyBalance;
  status: 'normal' | 'warning' | 'critical';
  lastUpdate: number;
}

export interface CommandCenterData {
  stations: EnergyStation[];
  totalBalance: EnergyBalance;
  carbonEmission: number;
  carbonReduction: number;
  efficiencyScore: number;
  lastAlignment: number;
}

export interface WeatherCondition {
  temperature: number;
  humidity: number;
  solarRadiation: number;
  windSpeed: number;
  timestamp: number;
}

export interface Snapshot {
  id: string;
  weatherType: 'typical_summer' | 'typical_winter' | 'typical_spring' | 'typical_autumn';
  weather: WeatherCondition;
  commandCenterData: CommandCenterData;
  timestamp: number;
  createdAt: number;
}

export type EnergyType = 'cooling' | 'heating' | 'electricity';

export interface OptimizationResult {
  stationId: string;
  adjustments: {
    cooling: number;
    heating: number;
    electricity: number;
  };
  objectiveValue: number;
  constraintsSatisfied: boolean;
}

export interface MultiEnergyFlowResult {
  optimizations: OptimizationResult[];
  totalEfficiency: number;
  carbonSaved: number;
  convergence: boolean;
  iterations: number;
}
