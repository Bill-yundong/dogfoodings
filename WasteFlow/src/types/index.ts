export interface WasteData {
  id: string;
  timestamp: number;
  source: 'sanitation' | 'recycling';
  location: string;
  wasteType: 'organic' | 'recyclable' | 'hazardous' | 'residual';
  weight: number;
  volume: number;
  qualityScore: number;
  metadata: Record<string, unknown>;
}

export interface StandardizedWasteData extends WasteData {
  standardizedAt: number;
  transferStatus: 'pending' | 'transferred' | 'verified' | 'rejected';
  verificationHash: string;
}

export interface RoadNetworkLoad {
  id: string;
  roadId: string;
  timestamp: number;
  currentLoad: number;
  maxCapacity: number;
  flowRate: number;
  congestionLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PeakPrediction {
  id: string;
  roadId: string;
  predictedAt: number;
  predictedPeakTime: number;
  predictedLoad: number;
  confidence: number;
  timeWindow: {
    start: number;
    end: number;
  };
  recommendedAction: string;
}

export interface CarbonFootprintLog {
  id: string;
  timestamp: number;
  actionType: 'collection' | 'transport' | 'processing' | 'recycling' | 'disposal';
  wasteType: string;
  weight: number;
  distance?: number;
  co2Saved: number;
  co2Emitted: number;
  netReduction: number;
  metadata: Record<string, unknown>;
}

export interface SyncStatus {
  lastSync: number;
  pendingItems: number;
  syncing: boolean;
}

export type WasteSource = 'sanitation' | 'recycling';
