export interface ProbeResult {
  timestamp: number;
  pathId: string;
  latency: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number;
  hopCount: number;
}

export interface PathQuality {
  pathId: string;
  overallScore: number;
  latencyScore: number;
  jitterScore: number;
  lossScore: number;
  stability: number;
  prediction: {
    trend: 'improving' | 'stable' | 'deteriorating';
    next5sLatency: number;
    switchRisk: number;
  };
}

export interface SwitchEvent {
  id: string;
  timestamp: number;
  fromPath: string;
  toPath: string;
  reason: 'latency' | 'jitter' | 'loss' | 'manual' | 'predictive';
  switchTime: number;
  success: boolean;
}

export interface AcceleratorNode {
  id: string;
  name: string;
  location: {
    city: string;
    country: string;
    lat: number;
    lng: number;
  };
  status: 'online' | 'offline' | 'maintenance';
  load: number;
  currentUsers: number;
  maxCapacity: number;
  protocols: string[];
}

export interface ClientState {
  activePath: string | null;
  isMonitoring: boolean;
  config: ClientConfig;
  lastSyncTime: number;
}

export interface ClientConfig {
  probeInterval: number;
  switchSensitivity: 'low' | 'medium' | 'high';
  latencyThreshold: number;
  jitterThreshold: number;
  lossThreshold: number;
  dataRetentionDays: number;
  autoSwitch: boolean;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'path' | 'config' | 'protocol';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImprovement: {
    latency?: number;
    jitter?: number;
    loss?: number;
  };
}

export interface DailySummary {
  date: string;
  avgLatency: number;
  avgJitter: number;
  avgPacketLoss: number;
  totalSwitches: number;
  uptime: number;
  qualityDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

export interface SyncHandshake {
  clientVersion: string;
  protocolVersion: string;
  supportedMetrics: string[];
  syncInterval: number;
}

export type ClientMessage =
  | { type: 'PROBE_REPORT'; data: ProbeResult[] }
  | { type: 'PATH_SWITCH_REQUEST'; targetPathId: string; reason: string }
  | { type: 'STATUS_SYNC'; clientState: ClientState }
  | { type: 'NODE_DISCOVERY' }
  | { type: 'HANDSHAKE'; handshake: SyncHandshake };

export type ServerMessage =
  | { type: 'NODE_STATUS'; nodes: AcceleratorNode[] }
  | { type: 'PATH_SWITCH_ACK'; switchId: string; approved: boolean; estimatedTime: number }
  | { type: 'QUALITY_ALERT'; pathId: string; severity: 'warning' | 'critical'; metric: string }
  | { type: 'OPTIMIZATION_SUGGESTION'; suggestion: OptimizationSuggestion }
  | { type: 'HANDSHAKE_ACK'; serverTime: number; syncInterval: number };

export const PROTOCOL_VERSION = '1.0.0';
export const CLIENT_VERSION = '1.0.0';

export const DEFAULT_CONFIG: ClientConfig = {
  probeInterval: 1000,
  switchSensitivity: 'medium',
  latencyThreshold: 100,
  jitterThreshold: 30,
  lossThreshold: 2,
  dataRetentionDays: 30,
  autoSwitch: true,
};

export const MOCK_NODES: AcceleratorNode[] = [
  {
    id: 'node-bj-01',
    name: '北京 BGP 节点',
    location: { city: '北京', country: 'CN', lat: 39.9042, lng: 116.4074 },
    status: 'online',
    load: 0.45,
    currentUsers: 1234,
    maxCapacity: 5000,
    protocols: ['TCP', 'UDP', 'QUIC'],
  },
  {
    id: 'node-sh-01',
    name: '上海电信节点',
    location: { city: '上海', country: 'CN', lat: 31.2304, lng: 121.4737 },
    status: 'online',
    load: 0.72,
    currentUsers: 2880,
    maxCapacity: 4000,
    protocols: ['TCP', 'UDP', 'QUIC'],
  },
  {
    id: 'node-gz-01',
    name: '广州联通节点',
    location: { city: '广州', country: 'CN', lat: 23.1291, lng: 113.2644 },
    status: 'online',
    load: 0.38,
    currentUsers: 950,
    maxCapacity: 2500,
    protocols: ['TCP', 'UDP'],
  },
  {
    id: 'node-sz-01',
    name: '深圳移动节点',
    location: { city: '深圳', country: 'CN', lat: 22.5431, lng: 114.0579 },
    status: 'maintenance',
    load: 0.0,
    currentUsers: 0,
    maxCapacity: 3000,
    protocols: ['TCP', 'UDP', 'QUIC'],
  },
  {
    id: 'node-hk-01',
    name: '香港国际节点',
    location: { city: '香港', country: 'HK', lat: 22.3193, lng: 114.1694 },
    status: 'online',
    load: 0.85,
    currentUsers: 3400,
    maxCapacity: 4000,
    protocols: ['TCP', 'UDP', 'QUIC', 'WireGuard'],
  },
  {
    id: 'node-sg-01',
    name: '新加坡优化节点',
    location: { city: '新加坡', country: 'SG', lat: 1.3521, lng: 103.8198 },
    status: 'online',
    load: 0.55,
    currentUsers: 1650,
    maxCapacity: 3000,
    protocols: ['TCP', 'UDP', 'QUIC'],
  },
];
