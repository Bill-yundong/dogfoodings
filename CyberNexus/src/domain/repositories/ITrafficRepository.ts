import type { TrafficFeature, TrafficFingerprint, ClusterResult, Statistics } from '../entities/traffic.entity';

export interface ITrafficRepository {
  init(): Promise<void>;

  addTrafficFeature(feature: TrafficFeature): Promise<void>;
  addTrafficFeatures(features: TrafficFeature[]): Promise<void>;
  getTrafficFeatures(limit?: number, offset?: number): Promise<TrafficFeature[]>;
  getTrafficFeatureById(id: string): Promise<TrafficFeature | null>;
  getTrafficFeaturesByTimeRange(start: number, end: number): Promise<TrafficFeature[]>;
  countTrafficFeatures(): Promise<number>;
  clearTrafficFeatures(): Promise<void>;

  addFingerprint(fingerprint: TrafficFingerprint): Promise<void>;
  getFingerprints(limit?: number, offset?: number): Promise<TrafficFingerprint[]>;
  getFingerprintByHash(hash: string): Promise<TrafficFingerprint | null>;
  updateFingerprintCount(hash: string): Promise<void>;
  countFingerprints(): Promise<number>;
  clearFingerprints(): Promise<void>;

  addClusterResult(result: ClusterResult): Promise<void>;
  getClusterResults(limit?: number, offset?: number): Promise<ClusterResult[]>;
  getLatestClusterResult(): Promise<ClusterResult | null>;
  countClusterResults(): Promise<number>;
  clearClusterResults(): Promise<void>;

  getStatistics(): Promise<Statistics>;
  clearAll(): Promise<void>;
  close(): Promise<void>;
}
