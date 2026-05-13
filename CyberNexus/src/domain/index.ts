export type { ProtocolType, ClassificationType, AlertLevelType } from './types/protocol.types';
export { PROTOCOL_PORTS, CLASSIFICATION_LABELS, ALERT_LEVEL_LABELS } from './types/protocol.types';

export type { TrafficDirection, TimeWindow, IPacketInfo, IConnectionStats } from './types/traffic.types';

export type { ClusterType, DistanceMetric, IClusterMetrics, IAPTIndicators } from './types/cluster.types';

export { IPAddress } from './value-objects/IPAddress';
export { RiskScore } from './value-objects/RiskScore';
export { FeatureVector } from './value-objects/FeatureVector';

export type {
  TrafficFeature,
  NormalizedTraffic,
  TrafficFingerprint,
  TimeSeriesData,
  ClusterResult,
  Alert,
  Statistics,
} from './entities/traffic.entity';

export { TrafficNormalizerService } from './services/TrafficNormalizer.service';
export { TimeSeriesClusterService } from './services/TimeSeriesCluster.service';

export type { ITrafficRepository } from './repositories/ITrafficRepository';

export * from './exceptions/DomainException';
