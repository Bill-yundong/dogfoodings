import type { TrafficFeature, ProtocolType } from '../../@types';

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeIP(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  const hash = parts.reduce((acc, part, i) => acc + parseInt(part) * Math.pow(2, 8 * (3 - i)), 0);
  return (hash % 1000000) / 1000000;
}

export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

export function generateFeatureHash(feature: Pick<TrafficFeature, 'sourceIP' | 'destIP' | 'protocol' | 'payloadHash'>): string {
  const key = `${feature.sourceIP}:${feature.destIP}:${feature.protocol}:${feature.payloadHash}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

const PROTOCOLS: ProtocolType[] = ['MODBUS', 'S7COMM', 'DNP3', 'TCP', 'UDP', 'HTTP', 'HTTPS'];

export function generateMockTrafficFeature(overrides?: Partial<TrafficFeature>): TrafficFeature {
  const sourceIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const destIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const protocol = PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)];
  const packetCount = Math.floor(Math.random() * 1000) + 1;
  const totalBytes = packetCount * (Math.floor(Math.random() * 1400) + 64);
  const duration = Math.random() * 3600;

  return {
    id: generateId('traffic'),
    timestamp: Date.now() - Math.random() * 86400000,
    sourceIP,
    destIP,
    sourcePort: Math.floor(Math.random() * 65535) + 1,
    destPort: [502, 102, 20000, 80, 443, 8080][Math.floor(Math.random() * 6)],
    protocol,
    packetCount,
    totalBytes,
    duration,
    packetRate: packetCount / Math.max(duration, 1),
    byteRate: totalBytes / Math.max(duration, 1),
    direction: Math.random() > 0.5 ? 'INBOUND' : 'OUTBOUND',
    flags: [],
    payloadHash: Math.random().toString(36).slice(2, 16),
    entropy: Math.random() * 8,
    isIndustrial: ['MODBUS', 'S7COMM', 'DNP3'].includes(protocol),
    ...overrides,
  };
}

export function generateMockTrafficData(count: number): TrafficFeature[] {
  return Array.from({ length: count }, () => generateMockTrafficFeature());
}
