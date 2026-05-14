export interface WaveObservationLog {
  id?: string;
  timestamp: number;
  waveHeight: number;
  wavePeriod: number;
  waterDepth: number;
  location: string;
  energyDensity?: number;
  breakingProbability?: number;
  source: "maritime" | "energy" | "simulation";
  quality: number;
}

export interface DataSyncRecord {
  id?: string;
  syncTime: number;
  sourceSystem: "maritime" | "energy";
  recordCount: number;
  status: "pending" | "completed" | "failed";
  dataHash: string;
}

export interface ShoreProtectionLog {
  id?: string;
  timestamp: number;
  structureType: string;
  structureHeight: number;
  structureWidth: number;
  protectionIndex: number;
  waveConditions: {
    waveHeight: number;
    wavePeriod: number;
  };
  stormIntensity?: number;
}

export interface WaveParams {
  waveHeight: number;
  wavePeriod: number;
  waterDepth: number;
  wavelength: number;
  waveNumber: number;
  angularFrequency: number;
  phaseVelocity: number;
  groupVelocity: number;
  energyDensity: number;
  powerPerUnitWidth: number;
}

export interface EnergyFlowResult {
  energyDensity: number[][];
  breakingZones: boolean[][];
  flowVectors: { x: number; y: number; u: number; v: number }[];
  totalEnergy: number;
  dissipatedEnergy: number;
}
