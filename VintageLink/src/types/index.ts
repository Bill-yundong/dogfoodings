export interface WineLabel {
  id: string;
  chateau: string;
  vintage: number;
  region: string;
  appellation: string;
  grapeVarieties: string[];
  classification: string;
  alcoholContent: number;
  bottleSize: number;
  producer: string;
  country: string;
  imageUrl?: string;
  tastingNotes: string[];
  agingPotential: AgingPotential;
  createdAt: number;
  updatedAt: number;
}

export interface AgingPotential {
  minYears: number;
  maxYears: number;
  peakStart: number;
  peakEnd: number;
  confidence: number;
}

export interface SensorReading {
  id: string;
  timestamp: number;
  zoneId: string;
  temperature: number;
  humidity: number;
  lightIntensity?: number;
  vibration?: number;
}

export interface CellarZone {
  id: string;
  name: string;
  description: string;
  targetTemperature: { min: number; max: number; optimal: number };
  targetHumidity: { min: number; max: number; optimal: number };
  sensorIds: string[];
  wineBottleIds: string[];
}

export interface WineBottle {
  id: string;
  labelId: string;
  purchaseDate: number;
  purchasePrice: number;
  location: { zoneId: string; position: string };
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  storageStartDate: number;
  lastInspectionDate?: number;
  notes?: string;
}

export interface SemanticMapping {
  sensorMetric: string;
  wineProperty: string;
  correlation: number;
  impactFactor: number;
  description: string;
  units: string;
}

export interface MaturationModel {
  wineId: string;
  currentAge: number;
  maturityScore: number;
  tanninLevel: number;
  acidityLevel: number;
  fruitLevel: number;
  complexityLevel: number;
  lastUpdated: number;
  predictedDevelopment: MaturationPrediction[];
}

export interface MaturationPrediction {
  date: number;
  predictedScore: number;
  confidence: number;
  scenario: 'optimal' | 'conservative' | 'aggressive';
}

export interface DrinkingWindow {
  wineId: string;
  windowStart: number;
  windowEnd: number;
  peakDate: number;
  confidence: number;
  drinkingRecommendation: string;
  foodPairings: string[];
  decantingTime: number;
  servingTemperature: number;
}

export interface Alert {
  id: string;
  type: 'temperature' | 'humidity' | 'vibration' | 'storage' | 'maturation';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  zoneId?: string;
  wineId?: string;
  resolved: boolean;
}

export interface SystemStatus {
  databaseReady: boolean;
  sensorCount: number;
  wineCount: number;
  activeAlerts: number;
  lastSyncTime: number;
}

export type TabType = 'dashboard' | 'monitoring' | 'assets' | 'prediction' | 'alignment';
