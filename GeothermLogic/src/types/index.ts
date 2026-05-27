export interface Borehole {
  id: string;
  name: string;
  depth: number;
  diameter: number;
  location: { lat: number; lng: number };
  status: 'active' | 'inactive' | 'maintenance';
  currentTemperature: number;
  lastSyncTime: string;
}

export interface TemperatureSnapshot {
  id: string;
  boreholeId: string;
  timestamp: string;
  temperature: number;
  depth: number;
}

export interface ThermalBalanceRecord {
  id: string;
  boreholeId: string;
  timestamp: string;
  balanceValue: number;
  efficiency: number;
  groundTemp: number;
}

export interface ThermalBalanceRequest {
  boreholeId: string;
  startDate: string;
  endDate: string;
  parameters: {
    groundThermalConductivity: number;
    specificHeatCapacity: number;
    fluidFlowRate: number;
    inletTemperature: number;
    outletTemperature: number;
  };
}

export interface ThermalBalanceResponse {
  balanceStatus: 'stable' | 'warning' | 'critical';
  heatExtractionRate: number;
  heatRejectionRate: number;
  netHeatBalance: number;
  efficiency: number;
  recommendations: string[];
}

export interface ThermalDriftRequest {
  boreholeIds: string[];
  predictionYears: number;
  scenario: 'conservative' | 'moderate' | 'aggressive';
}

export interface ThermalDriftResponse {
  predictionId: string;
  status: 'processing' | 'completed';
  results: Array<{
    year: number;
    groundTemperature: number;
    thermalSaturation: number;
    overdrawRisk: 'low' | 'medium' | 'high';
  }>;
  modelParameters: {
    thermalDiffusivity: number;
    geothermalGradient: number;
    heatPumpCoefficient: number;
  };
}

export interface DataSyncRequest {
  source: 'operations' | 'energy-management';
  target: 'operations' | 'energy-management';
  dataTypes: string[];
  schedule?: string;
}

export interface DataSyncResponse {
  syncId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  startTime: string;
  endTime?: string;
  errors: string[];
}

export interface SemanticMapping {
  id: string;
  sourceField: string;
  targetField: string;
  transformation: string;
  description: string;
}

export interface SystemStats {
  totalBoreholes: number;
  activeBoreholes: number;
  avgGroundTemp: number;
  thermalBalanceStatus: 'stable' | 'warning' | 'critical';
  overdrawRisk: 'low' | 'medium' | 'high';
  lastUpdateTime: string;
}

export interface HealthStatus {
  module: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastCheck: string;
}

export interface SyncQueueItem {
  id: string;
  type: string;
  payload: unknown;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}
