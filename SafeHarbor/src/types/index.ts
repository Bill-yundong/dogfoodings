export type GeologyType = 'mud' | 'sand' | 'rock' | 'clay' | 'mixed';
export type DragRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type MessageSource = 'monitoring' | 'ship';
export type MessageType = 'status_update' | 'alert' | 'command' | 'acknowledgment';

export interface Ship {
  id: string;
  name: string;
  mmsi: string;
  length: number;
  width: number;
  draft: number;
  grossTonnage: number;
  anchorChainLength: number;
  anchorWeight: number;
}

export interface Anchorage {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  maxCapacity: number;
  geologyType: GeologyType;
  holdingCapacity: number;
  depth: number;
}

export interface TidalRecord {
  id?: string;
  timestamp: number;
  anchorageId: string;
  height: number;
  currentSpeed: number;
  currentDirection: number;
}

export interface WeatherCondition {
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
  wavePeriod: number;
}

export interface AnchorStatus {
  shipId: string;
  anchorageId: string;
  timestamp: number;
  scope: number;
  holdingPower: number;
  dragRisk: DragRiskLevel;
  position: {
    latitude: number;
    longitude: number;
  };
  weather: WeatherCondition;
}

export interface SemanticSyncMessage {
  id: string;
  source: MessageSource;
  timestamp: number;
  type: MessageType;
  payload: any;
  semanticHash: string;
}

export interface CatenaryPoint {
  x: number;
  y: number;
  tension: number;
}
