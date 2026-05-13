import type { TrafficFeature } from '../../core/types';

const PROTOCOLS: TrafficFeature['protocol'][] = ['MODBUS', 'S7COMM', 'DNP3', 'TCP', 'UDP', 'HTTP', 'HTTPS'];

export function generateMockTrafficFeature(overrides?: Partial<TrafficFeature>): TrafficFeature {
  const sourceIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const destIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const protocol = PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)];
  const packetCount = Math.floor(Math.random() * 1000) + 1;
  const totalBytes = packetCount * (Math.floor(Math.random() * 1400) + 64);
  const duration = Math.random() * 3600;

  return {
    id: `traffic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    payloadHash: Math.random().toString(36).substr(2, 16),
    entropy: Math.random() * 8,
    isIndustrial: ['MODBUS', 'S7COMM', 'DNP3'].includes(protocol),
    ...overrides,
  };
}

export function generateMockTrafficData(count: number): TrafficFeature[] {
  return Array.from({ length: count }, () => generateMockTrafficFeature());
}
