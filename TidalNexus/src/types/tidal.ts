export interface GeoLocation {
  latitude: number;
  longitude: number;
  depth?: number;
}

export interface TidalData {
  timestamp: number;
  waterLevel: number;
  velocity: {
    magnitude: number;
    direction: number;
  };
}

export interface TidalForecast {
  location: GeoLocation;
  data: TidalData[];
}

export interface PowerDensityResult {
  timestamp: number;
  powerDensity: number;
  powerDensity: number;
  location: GeoLocation;
}

export interface Turbine {
  id: string;
  location: GeoLocation;
  ratedPower: number;
  efficiency: number;
  rotorDiameter: number;
  cutInSpeed: number;
  cutOutSpeed: number;
}

export interface ArrayLayout {
  turbines: Turbine[];
  centerLocation: GeoLocation;
  spacing: {
    longitudinal: number;
    lateral: number;
  };
}

export interface GenerationResult {
  timestamp: number;
  totalPower: number;
  efficiency: number;
  turbineOutput: Turbine;
}

export interface HistoricalTidalRecord {
  id?: number;
  locationId: string;
  timestamp: number;
  waterLevel: number;
  velocityMagnitude: number;
  velocityDirection: number;
  createdAt: number;
}

export interface LocationAnalysis {
  locationId: string;
  location: GeoLocation;
  avgPowerDensity: number;
  maxPowerDensity: number;
  minPowerDensity: number;
  capacityFactor: number;
  annualEnergyProduction: number;
}

export type WorkerMessageType = 
  | 'CALCULATE_POWER_DENSITY'
  | 'CALCULATE_ARRAY_OUTPUT'
  | 'OPTIMIZE_LAYOUT';

export interface WorkerMessage<T = unknown> {
  type: WorkerMessageType;
  payload: T;
}

export interface PowerDensityPayload {
  tidalData: TidalData[];
  location: GeoLocation;
}

export interface ArrayOutputPayload {
  layout: ArrayLayout;
  tidalData: TidalData[];
}

export interface LayoutOptimizationPayload {
  siteLocation: GeoLocation;
  tidalData: TidalData[];
  turbineCount: number;
  constraints: {
    minSpacing: number;
    areaBounds: {
      width: number;
      height: number;
    };
  };
}

export interface WorkerResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  progress?: number;
}