export interface PowerSpectrumPoint {
  timestamp: number;
  frequency: number;
  amplitude: number;
  channel: string;
}

export interface PowerSpectrumSummary {
  minFrequency: number;
  maxFrequency: number;
  dominantFrequency: number;
  averageAmplitude: number;
  peakAmplitude: number;
  rmsAmplitude: number;
  totalEnergy: number;
}

export interface FractalFeatures {
  boxDimension: number;
  informationDimension: number;
  correlationDimension: number;
  lacunarity: number;
  multifractalSpectrum: number[];
  hurstExponent: number;
}

export interface StatisticalFeatures {
  mean: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  rms: number;
  crestFactor: number;
  impulseFactor: number;
  marginFactor: number;
}

export interface ProcessingParams {
  feedRate: number;
  spindleSpeed: number;
  depthOfCut: number;
  grindingWheelSpeed: number;
  coolantPressure: number;
}

export interface RoughnessPrediction {
  id: string;
  partId: string;
  timestamp: number;
  predictedRa: number;
  predictedRz: number;
  predictedRq: number;
  confidence: number;
  confidenceInterval: [number, number];
  features: FractalFeatures;
  statisticalFeatures: StatisticalFeatures;
  processingParams: ProcessingParams;
  modelVersion: string;
}

export interface MeasuredRoughness {
  ra: number;
  rz: number;
  rq: number;
  measuredAt: number;
  inspector: string;
  measurementMethod: string;
}

export type QualityStatus = 'PASS' | 'FAIL' | 'PENDING';

export interface PartFingerprint {
  id: string;
  partNumber: string;
  batchId: string;
  startTime: number;
  endTime: number;
  processingParams: ProcessingParams;
  powerSpectrumSummary: PowerSpectrumSummary;
  predictedRoughness: RoughnessPrediction;
  measuredRoughness?: MeasuredRoughness;
  qualityStatus: QualityStatus;
  createdAt: number;
  notes?: string;
  tags?: string[];
}

export interface ParameterOptimizationResult {
  id: string;
  timestamp: number;
  baseParams: ProcessingParams;
  optimizedParams: ProcessingParams;
  predictedImprovement: number;
  tradeOffAnalysis: {
    roughnessImprovement: number;
    efficiencyChange: number;
    toolWearChange: number;
  };
  paretoFront: Array<{
    params: ProcessingParams;
    roughness: number;
    efficiency: number;
    toolWear: number;
  }>;
}

export interface SystemConfig {
  dataSource: {
    mesEndpoint: string;
    qmsEndpoint: string;
    websocketUrl: string;
    pollingInterval: number;
  };
  thresholds: {
    maxRa: number;
    maxRz: number;
    warningThreshold: number;
    criticalThreshold: number;
  };
  modelConfig: {
    activeModel: string;
    autoRetrain: boolean;
    retrainThreshold: number;
  };
  displayConfig: {
    theme: 'dark' | 'light';
    refreshRate: number;
    chartPoints: number;
  };
}

export interface RealtimeDataFrame {
  timestamp: number;
  source: 'MES' | 'QMS' | 'SIMULATED';
  type: 'POWER_SPECTRUM' | 'PROCESSING_PARAMS' | 'MEASUREMENT';
  payload: any;
}

export interface PredictionHistoryItem {
  id: string;
  timestamp: number;
  partNumber: string;
  predictedRa: number;
  actualRa?: number;
  accuracy?: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
}
