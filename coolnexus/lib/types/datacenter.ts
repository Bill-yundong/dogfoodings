export interface Server {
  id: string;
  name: string;
  rackId: string;
  position: { row: number; col: number; u: number };
  powerConsumption: number;
  cpuUtilization: number;
  inletTemperature: number;
  outletTemperature: number;
  status: 'running' | 'idle' | 'warning' | 'critical';
}

export interface Rack {
  id: string;
  name: string;
  position: { row: number; col: number };
  servers: Server[];
  maxPower: number;
  currentPower: number;
  inletTemperature: number;
  outletTemperature: number;
}

export interface PrecisionAC {
  id: string;
  name: string;
  position: { row: number; col: number };
  coolingCapacity: number;
  currentCooling: number;
  supplyTemperature: number;
  returnTemperature: number;
  fanSpeed: number;
  status: 'running' | 'standby' | 'fault';
}

export interface TemperaturePoint {
  x: number;
  y: number;
  z: number;
  temperature: number;
  velocity?: { x: number; y: number; z: number };
}

export interface HeatLoadDistribution {
  timestamp: number;
  racks: {
    rackId: string;
    heatLoad: number;
    temperature: number;
  }[];
  totalHeatLoad: number;
  maxTemperature: number;
  minTemperature: number;
}

export interface AirflowRisk {
  id: string;
  type: 'short_circuit' | 'hot_spot' | 'recirculation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: { x: number; y: number; z: number };
  affectedRacks: string[];
  description: string;
  temperature: number;
}

export interface PowerSnapshot {
  id: string;
  timestamp: number;
  totalITPower: number;
  totalCoolingPower: number;
  totalPower: number;
  pue: number;
  rackPowers: { rackId: string; power: number }[];
  acPowers: { acId: string; power: number }[];
}

export interface PUEStats {
  currentPUE: number;
  targetPUE: number;
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  trend: 'improving' | 'worsening' | 'stable';
}

export interface DataCenterConfig {
  id: string;
  name: string;
  dimensions: { width: number; height: number; depth: number };
  rackRows: number;
  rackCols: number;
  racksPerRow: number;
  ambientTemperature: number;
  targetTemperature: number;
}
