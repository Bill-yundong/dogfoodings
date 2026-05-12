export type ProtocolType = 'TCP' | 'UDP' | 'ICMP' | 'HTTP' | 'MODBUS' | 'S7COMM' | 'DNP3';

export type ClassificationType = 'normal' | 'unknown' | 'suspicious' | 'malicious';

export type AlertType = 'info' | 'warning' | 'danger';

export interface TrafficFeature {
  id: string;
  timestamp: number;
  sourceIP: string;
  destinationIP: string;
  sourcePort: number;
  destinationPort: number;
  protocol: ProtocolType;
  packetLength: number;
  packetCount: number;
  duration: number;
  bytesIn: number;
  bytesOut: number;
  interval: number;
  flags: string[];
  payloadHash: string;
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
  clusterLabel?: string;
}

export interface TimeSeriesData {
  timestamp: number;
  values: number[];
}

export interface ClusterResult {
  clusterId: string;
  center: number[];
  points: TimeSeriesData[];
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

export interface ICSDevice {
  deviceId: string;
  name: string;
  type: 'PLC' | 'RTU' | 'HMI' | 'SCADA' | 'EngineerStation';
  ip: string;
  status: 'online' | 'offline' | 'warning';
  lastHeartbeat: number;
  protocol: string;
}
