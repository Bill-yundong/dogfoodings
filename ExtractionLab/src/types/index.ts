export interface CoffeeBean {
  id: string;
  name: string;
  origin: string;
  region: string;
  altitude: number;
  process: 'washed' | 'natural' | 'honey' | 'anaerobic';
  processingMethod: 'washed' | 'natural' | 'honey' | 'anaerobic';
  roastLevel: 'light' | 'medium' | 'medium-dark' | 'dark';
  variety: string;
  flavorNotes: string[];
  density: number;
  moistureContent: number;
  createdAt: number;
  updatedAt: number;
}

export interface FlavorProfile {
  acidity: number;
  sweetness: number;
  bitterness: number;
  body: number;
  aroma: number;
  aftertaste: number;
  complexity: number;
  balance: number;
}

export interface ExtractionDataPoint {
  time: number;
  temperature: number;
  pressure: number;
  flowRate: number;
  tds: number;
  weight: number;
}

export interface ExtractionCurve {
  id: string;
  presetId: string;
  storeId: string;
  beanId: string;
  dataPoints: ExtractionDataPoint[];
  startTime: number;
  endTime: number;
  totalWeight: number;
  averageFlowRate: number;
  peakPressure: number;
  finalTDS: number;
  extractionYield: number;
}

export interface BrewingPreset {
  id: string;
  name: string;
  description: string;
  beanId: string;
  bean: CoffeeBean;
  method: 'espresso' | 'pour-over' | 'french-press' | 'aeropress' | 'cold-brew';
  grindSize: number;
  dose: number;
  waterTemperature: number;
  totalWater: number;
  ratio: number;
  brewRatio: number;
  brewTime: number;
  targetTDS: number;
  targetYield: number;
  targetExtractionYield: number;
  pressureProfile?: PressureProfilePoint[];
  temperatureProfile?: TemperatureProfilePoint[];
  targetFlavor: FlavorProfile;
  tolerance: FlavorProfile;
  status: 'draft' | 'testing' | 'approved' | 'archived' | 'deprecated';
  version: number;
  createdBy: string;
  approvedBy?: string;
  region: string;
  storeIds: string[];
  lastSyncedAt: number;
  syncHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface PressureProfilePoint {
  time: number;
  pressure: number;
}

export interface TemperatureProfilePoint {
  time: number;
  temperature: number;
}

export interface StoreLocation {
  id: string;
  name: string;
  region: string;
  country: string;
  city: string;
  timezone: string;
  altitude: number;
  atmosphericPressure: number;
  waterHardness: number;
  waterAlkalinity: number;
  lastSyncAt: number;
  syncStatus: 'online' | 'offline' | 'syncing' | 'error';
  activePresets: string[];
  equipment: EquipmentInfo[];
  qualityScore: number;
  consistencyScore: number;
  qualityIssues?: string[];
  lastQualityCheck?: string;
  createdAt: number;
  updatedAt: number;
}

export interface EquipmentInfo {
  id: string;
  name: string;
  type: 'espresso-machine' | 'grinder' | 'scale' | 'temperature-probe';
  model: string;
  status: 'operational' | 'maintenance' | 'error';
  serialNumber: string;
  calibrationDate: number;
  nextCalibrationDate: number;
}

export interface BrewingRecord {
  id: string;
  presetId: string;
  storeId: string;
  beanBatchId: string;
  baristaId: string;
  barista: string;
  brewedAt: string;
  startTime: number;
  endTime: number;
  actualDose: number;
  actualWater: number;
  actualTemperature: number;
  actualBrewTime: number;
  brewTime: number;
  extractionCurve: ExtractionDataPoint[];
  finalTDS: number;
  extractionYield: number;
  flavorRating: FlavorProfile;
  qualityScore: number;
  notes: string;
  createdAt: number;
}

export interface SyncOperation {
  id: string;
  type: SyncEntityType;
  operation: 'create' | 'update' | 'delete';
  entityId: string;
  source: 'rnd' | 'store';
  sourceId: string;
  targetId: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  payload: Record<string, any>;
  error?: string;
  attempts: number;
  createdAt: number;
  completedAt?: number;
}

export interface QualityConsistencyReport {
  id: string;
  storeId: string;
  presetId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: number;
  endDate: number;
  totalBrews: number;
  withinTolerance: number;
  consistencyScore: number;
  flavorVariance: FlavorProfile;
  tdsVariance: number;
  yieldVariance: number;
  temperatureVariance: number;
  createdAt: number;
}

export interface OptimizationResult {
  presetId: string;
  storeId: string;
  originalPreset: BrewingPreset;
  optimizedPreset: BrewingPreset;
  optimizedParameters: Partial<BrewingPreset>;
  qualityImprovement: number;
  improvements: OptimizationImprovement[];
  confidence: number;
  factors: OptimizationFactor[];
  topFactors: string[];
  costSaving: number;
  createdAt: number;
}

export interface OptimizationImprovement {
  category: 'flavor' | 'consistency' | 'efficiency' | 'yield';
  metric: string;
  before: number;
  after: number;
  changePercent: number;
  description: string;
}

export interface OptimizationFactor {
  name: string;
  weight: number;
  value: number;
  unit: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface RnDExperiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  beanId: string;
  basePresetId: string;
  variants: ExperimentVariant[];
  variables: {
    name: string;
    min: number;
    max: number;
    step: number;
    unit: string;
  }[];
  status: 'planned' | 'running' | 'completed' | 'analyzed' | 'paused';
  trials: number;
  completedTrials: number;
  startedAt?: number;
  completedAt?: number;
  conclusion?: string;
  recommendedPresetId?: string;
  createdBy: string;
  createdAt: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  parameters: Partial<BrewingPreset>;
  trialCount: number;
  averageScore: number;
  results: BrewingRecord[];
}

export type SyncEntityType = 'preset' | 'record' | 'bean' | 'store' | 'experiment';
export type StoreName = 'presets' | 'beans' | 'stores' | 'records' | 'syncQueue' | 'experiments' | 'reports' | 'extractionCurves';
