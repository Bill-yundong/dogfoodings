export interface TrafficFeature {
  id: string;
  timestamp: number;
  sourceIP: string;
  destinationIP: string;
  sourcePort: number;
  destinationPort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'HTTP' | 'MODBUS' | 'S7COMM' | 'DNP3';
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
  classification: 'normal' | 'suspicious' | 'malicious' | 'unknown';
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

export interface DefenseHubEvent {
  eventId: string;
  type: 'alert' | 'log' | 'command' | 'sync';
  timestamp: number;
  source: 'defense-hub' | 'audit-terminal';
  payload: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditLog {
  logId: string;
  timestamp: number;
  operator: string;
  action: string;
  target: string;
  result: 'success' | 'failed' | 'pending';
  details: Record<string, unknown>;
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
