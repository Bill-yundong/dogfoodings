export type ProtocolType = 'MODBUS' | 'S7COMM' | 'DNP3' | 'TCP' | 'UDP' | 'ICMP' | 'HTTP' | 'HTTPS';

export type ClassificationType = 'NORMAL' | 'SUSPICIOUS' | 'MALICIOUS';

export type AlertLevelType = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const PROTOCOL_PORTS: Record<ProtocolType, number[]> = {
  MODBUS: [502],
  S7COMM: [102],
  DNP3: [20000],
  TCP: [],
  UDP: [],
  ICMP: [],
  HTTP: [80, 8080],
  HTTPS: [443],
};

export const CLASSIFICATION_LABELS: Record<ClassificationType, string> = {
  NORMAL: '正常',
  SUSPICIOUS: '可疑',
  MALICIOUS: '恶意',
};

export const ALERT_LEVEL_LABELS: Record<AlertLevelType, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  CRITICAL: '严重',
};
