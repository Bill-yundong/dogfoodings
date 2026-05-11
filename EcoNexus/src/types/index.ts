export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: Date;
}

export interface MigrationPath {
  id: string;
  birdId: string;
  birdSpecies: string;
  locations: GeoLocation[];
  startDate: Date;
  endDate?: Date;
  distance: number;
  status: "active" | "completed" | "paused";
}

export interface EnvironmentalFactor {
  id: string;
  location: GeoLocation;
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  vegetationIndex: number;
  waterQuality?: number;
  timestamp: Date;
  source: "satellite" | "ground_station" | "weather_api";
}

export interface HabitatQuality {
  id: string;
  location: GeoLocation;
  habitatType: string;
  overallScore: number;
  foodAvailability: number;
  waterAvailability: number;
  shelterQuality: number;
  disturbanceLevel: number;
  biodiversityIndex: number;
  lastUpdated: Date;
  confidence: number;
}

export interface SemanticMapping {
  id: string;
  researchTerm: string;
  managementTerm: string;
  mappingType: "equivalent" | "broader" | "narrower" | "related";
  confidence: number;
  domain: string;
  lastVerified: Date;
  sources: string[];
}

export interface TrackingLog {
  id: string;
  birdId: string;
  location: GeoLocation;
  deviceId: string;
  signalStrength: number;
  batteryLevel: number;
  temperature?: number;
  heartRate?: number;
  version: number;
  syncStatus: "local" | "synced" | "conflict";
  timestamp: Date;
}

export interface CorrelationResult {
  factorA: string;
  factorB: string;
  correlationCoefficient: number;
  pValue: number;
  sampleSize: number;
  significance: boolean;
  lag?: number;
}
