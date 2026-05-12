export interface LeakageCurrentData {
  id: string;
  insulatorId: string;
  timestamp: number;
  rawData: number[];
  samplingRate: number;
}

export interface FrequencyDomainFeatures {
  fundamentalFrequency: number;
  harmonicRatios: number[];
  totalHarmonicDistortion: number;
  peakValue: number;
  rmsValue: number;
  crestFactor: number;
  spectralEntropy: number;
}

export interface TimeDomainFeatures {
  peakValue: number;
  rmsValue: number;
  meanValue: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  pulseCount: number;
}

export interface CombinedFeatures {
  timeDomain: TimeDomainFeatures;
  frequencyDomain: FrequencyDomainFeatures;
}

export interface FlashoverPrediction {
  probability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  predictedTime: number;
  contributingFactors: string[];
}

export interface Insulator {
  id: string;
  name: string;
  location: string;
  voltageLevel: number;
  type: string;
  installationDate: number;
  lastMaintenanceDate: number;
  status: 'normal' | 'warning' | 'critical' | 'maintenance';
}

export interface HealthRecord {
  id: string;
  insulatorId: string;
  timestamp: number;
  features: CombinedFeatures;
  prediction: FlashoverPrediction;
  environmentalData: EnvironmentalData;
  maintenanceRecommendation?: string;
}

export interface EnvironmentalData {
  temperature: number;
  humidity: number;
  pollutionLevel: number;
  windSpeed: number;
  precipitation: number;
}

export interface SemanticSyncMessage {
  id: string;
  timestamp: number;
  source: 'maintenance' | 'dispatch';
  target: 'maintenance' | 'dispatch';
  type: 'status_update' | 'prediction' | 'maintenance_request' | 'command';
  payload: any;
  status: 'pending' | 'confirmed' | 'rejected';
}

export interface MaintenanceTask {
  id: string;
  insulatorId: string;
  type: 'inspection' | 'cleaning' | 'replacement';
  priority: 'low' | 'medium' | 'high';
  scheduledTime: number;
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
}

export interface DispatchCommand {
  id: string;
  timestamp: number;
  type: 'load_adjustment' | 'isolation' | 'inspection_order';
  targetInsulators: string[];
  parameters: Record<string, any>;
  status: 'issued' | 'executing' | 'completed';
}