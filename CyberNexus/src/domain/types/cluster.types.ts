export type ClusterType = 'NORMAL' | 'ANOMALY' | 'APT_SUSPICIOUS';

export type DistanceMetric = 'EUCLIDEAN' | 'MANHATTAN' | 'DTW' | 'COSINE';

export interface IClusterMetrics {
  silhouetteScore: number;
  daviesBouldinIndex: number;
  calinskiHarabaszIndex: number;
}

export interface IAPTIndicators {
  unusualPortAccess: boolean;
  highEntropyPayload: boolean;
  anomalousTiming: boolean;
  unusualDirection: boolean;
  rareProtocol: boolean;
  score: number;
}
