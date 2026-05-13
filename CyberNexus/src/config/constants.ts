export const VECTOR_DIMENSIONS = 20;

export const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 80,
};

export const PROTOCOL_PORTS = {
  MODBUS: 502,
  S7COMM: 102,
  DNP3: 20000,
  HTTP: 80,
  HTTPS: 443,
};

export const PROTOCOL_MAP: Record<string, number> = {
  TCP: 0,
  UDP: 1,
  ICMP: 2,
  HTTP: 3,
  HTTPS: 4,
  MODBUS: 5,
  S7COMM: 6,
  DNP3: 7,
};

export const CLASSIFICATION_LABELS: Record<string, string> = {
  NORMAL: '正常',
  SUSPICIOUS: '可疑',
  MALICIOUS: '恶意',
};

export const TRAFFIC_FLAGS = ['SYN', 'ACK', 'FIN', 'RST', 'PSH', 'URG'];

export const STORAGE_CONFIG = {
  DB_NAME: 'cybernexus-db',
  DB_VERSION: 1,
};

export const CLUSTER_CONFIG = {
  EPSILON: 0.3,
  MIN_SAMPLES: 5,
  WINDOW_SIZE: 100,
  ANOMALY_THRESHOLD: 0.7,
  APT_THRESHOLD: 0.85,
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: '仪表盘', icon: '📊' },
  { id: 'analysis', label: '流量分析', icon: '🔍' },
  { id: 'fingerprints', label: '指纹库', icon: '🔐' },
  { id: 'settings', label: '设置', icon: '⚙️' },
] as const;
