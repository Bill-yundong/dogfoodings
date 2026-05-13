export type ProtocolType = 'MODBUS' | 'S7COMM' | 'DNP3' | 'TCP' | 'UDP' | 'ICMP' | 'HTTP' | 'HTTPS';

export type ClassificationType = 'NORMAL' | 'SUSPICIOUS' | 'MALICIOUS';

export type AlertType = 'info' | 'warning' | 'danger';

export type TrafficDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL';

export interface TrafficFeature {
  id: string;
  timestamp: number;
  sourceIP: string;
  destIP: string;
  sourcePort: number;
  destPort: number;
  protocol: ProtocolType;
  packetCount: number;
  totalBytes: number;
  duration: number;
  packetRate: number;
  byteRate: number;
  direction: TrafficDirection;
  flags: string[];
  payloadHash: string;
  entropy: number;
  isIndustrial: boolean;
}

export interface NormalizedTraffic {
  featureId: string;
  normalizedVector: number[];
  timestamp: number;
  riskScore: number;
  classification: ClassificationType;
}

export interface TrafficFingerprint {
  id: string;
  featureHash: string;
  firstSeen: number;
  lastSeen: number;
  occurrenceCount: number;
  avgRiskScore: number;
  associatedIPs: string[];
}

export interface ClusterResult {
  clusterId: string;
  center: number[];
  points: NormalizedTraffic[];
  anomalyScore: number;
  isAPT: boolean;
  confidence: number;
}

export interface Alert {
  id: string;
  message: string;
  type: AlertType;
  timestamp: number;
}

export interface Statistics {
  totalFeatures: number;
  totalFingerprints: number;
  highRiskCount: number;
  aptClusterCount: number;
}
