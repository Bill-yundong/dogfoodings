export const VECTOR_DIMENSIONS = 20;

export const RISK_THRESHOLDS = {
  LOW: 10,
  MEDIUM: 40,
  HIGH: 70,
} as const;

export const PROTOCOL_MAP: Record<string, number> = {
  TCP: 0.1,
  UDP: 0.2,
  ICMP: 0.3,
  HTTP: 0.4,
  MODBUS: 0.5,
  S7COMM: 0.6,
  DNP3: 0.7,
};

export const ICS_PROTOCOLS = ['MODBUS', 'S7COMM', 'DNP3'] as const;

export const CLUSTER_CONFIG = {
  EPSILON: 0.3,
  MIN_SAMPLES: 5,
  WINDOW_SIZE: 100,
} as const;

export const APT_DETECTION_CONFIG = {
  INTERVAL_VARIANCE_THRESHOLD: 1000,
  FREQUENCY_THRESHOLD: 0.7,
  AVG_RISK_THRESHOLD: 0.5,
  DURATION_THRESHOLD: 3600000,
  APT_SCORE_THRESHOLD: 60,
} as const;

export const STORAGE_CONFIG = {
  DB_NAME: 'CyberNexusFingerprints',
  DB_VERSION: 1,
  MAX_FEATURES_IN_MEMORY: 1000,
} as const;

export const ALERT_CONFIG = {
  AUTO_DISMISS_MS: 5000,
  PROCESSING_INTERVAL_MS: 10000,
} as const;

export const CLASSIFICATION_LABELS = {
  normal: '正常',
  unknown: '未知',
  suspicious: '可疑',
  malicious: '恶意',
} as const;

export const ALERT_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  DANGER: 'danger',
} as const;

export const TRAFFIC_FLAGS = ['SYN', 'ACK', 'FIN', 'PSH', 'URG', 'RST'] as const;

export const SUSPICIOUS_FLAGS = ['SYN', 'FIN', 'RST', 'URG'] as const;
