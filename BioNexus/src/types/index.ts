export interface BiomassComposition {
  id: string;
  source: string;
  moisture: number;
  carbon: number;
  hydrogen: number;
  oxygen: number;
  nitrogen: number;
  sulfur: number;
  ash: number;
  volatileMatter: number;
  fixedCarbon: number;
  calorificValue: number;
  timestamp: number;
  spectralData: number[];
}

export interface CalibrationPoint {
  wavelength: number;
  absorbance: number;
  component: string;
}

export interface SemanticAlignment {
  fuelManagementId: string;
  combustionControlId: string;
  alignedParameters: string[];
  confidence: number;
  timestamp: number;
}

export interface FeedingOptimization {
  optimalFrequency: number;
  currentFrequency: number;
  predictedCalorificValue: number;
  efficiencyGain: number;
  factors: {
    moisture: number;
    composition: number;
    boilerLoad: number;
    historical: number;
  };
}

export interface CombustionParams {
  boilerLoad: number;
  oxygenLevel: number;
  temperature: number;
  steamPressure: number;
  efficiency: number;
}

export interface SnapshotMetadata {
  id: string;
  source: string;
  batchId: string;
  collectedAt: number;
  storedAt: number;
  version: number;
}
