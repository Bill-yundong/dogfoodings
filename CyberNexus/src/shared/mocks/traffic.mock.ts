import type { TrafficFeature } from '../../domain/entities/traffic.entity';
import { generateId, generateRandomIP, generateRandomProtocol, generateRandomFlags } from '../utils/traffic.utils';

export function generateMockTrafficFeature(overrides?: Partial<TrafficFeature>): TrafficFeature {
  const sourceIP = generateRandomIP();
  const destIP = generateRandomIP();
  const sourcePort = Math.floor(Math.random() * 65535) + 1;
  const destPort = [502, 102, 20000, 80, 443, 8080][Math.floor(Math.random() * 6)];
  const protocol = generateRandomProtocol();
  const packetCount = Math.floor(Math.random() * 1000) + 1;
  const totalBytes = packetCount * (Math.floor(Math.random() * 1400) + 64);
  const duration = Math.random() * 3600;

  return {
    id: generateId('traffic'),
    timestamp: Date.now() - Math.random() * 86400000,
    sourceIP,
    destIP,
    sourcePort,
    destPort,
    protocol,
    packetCount,
    totalBytes,
    duration,
    packetRate: packetCount / Math.max(duration, 1),
    byteRate: totalBytes / Math.max(duration, 1),
    direction: sourceIP.startsWith('192.168.') ? 'OUTBOUND' : 'INBOUND',
    flags: generateRandomFlags(),
    payloadHash: Math.random().toString(36).substr(2, 16),
    entropy: Math.random() * 8,
    isIndustrial: ['MODBUS', 'S7COMM', 'DNP3'].includes(protocol),
    ...overrides,
  };
}

export function generateMockTrafficData(count: number): TrafficFeature[] {
  return Array.from({ length: count }, () => generateMockTrafficFeature());
}

export function generateAnomalousTraffic(): TrafficFeature {
  return generateMockTrafficFeature({
    destPort: 9999,
    entropy: 7.5 + Math.random() * 0.5,
    packetCount: 10000 + Math.floor(Math.random() * 10000),
    totalBytes: 10000000 + Math.floor(Math.random() * 10000000),
  });
}

export function generateAPTSuspiciousTraffic(): TrafficFeature[] {
  const baseTime = Date.now();
  const features: TrafficFeature[] = [];

  for (let i = 0; i < 10; i++) {
    features.push(
      generateMockTrafficFeature({
        timestamp: baseTime + i * 3600000,
        destPort: 502,
        protocol: 'MODBUS',
        sourceIP: '10.0.0.' + (100 + i),
        entropy: 6 + Math.random() * 2,
        packetCount: 5 + Math.floor(Math.random() * 10),
      })
    );
  }

  return features;
}
