import {
  ICS_PROTOCOLS,
  SUSPICIOUS_FLAGS,
  TRAFFIC_FLAGS,
} from '../constants/app.constants';
import type { TrafficFeature } from '../../domain/entities/traffic.entity';

export function normalizeIP(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  const hash = parts.reduce((acc, part, i) => acc + parseInt(part) * Math.pow(2, 8 * (3 - i)), 0);
  return (hash % 1000000) / 1000000;
}

export function normalizePort(port: number): number {
  return port / 65535;
}

export function hashFlags(flags: string[]): number {
  return flags.reduce((acc, flag) => acc + flag.charCodeAt(0), 0) / 1000;
}

export function isICSProtocol(protocol: string): boolean {
  return ICS_PROTOCOLS.includes(protocol as typeof ICS_PROTOCOLS[number]);
}

export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

export function getPacketEntropy(hash: string): number {
  const chars = new Set(hash);
  return chars.size / hash.length;
}

export function isWellKnownPort(port: number): boolean {
  return port < 1024;
}

export function hasSuspiciousFlags(flags: string[]): boolean {
  return SUSPICIOUS_FLAGS.some(f => flags.includes(f)) && flags.length > 2;
}

export function generateFeatureHash(feature: Pick<TrafficFeature, 'sourceIP' | 'destinationIP' | 'protocol' | 'payloadHash'>): string {
  const key = `${feature.sourceIP}:${feature.destinationIP}:${feature.protocol}:${feature.payloadHash}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateRandomProtocol(): TrafficFeature['protocol'] {
  const protocols: TrafficFeature['protocol'][] = ['TCP', 'UDP', 'MODBUS', 'S7COMM', 'DNP3', 'HTTP'];
  return protocols[Math.floor(Math.random() * protocols.length)];
}

export function generateRandomFlags(): string[] {
  const count = Math.floor(Math.random() * 3) + 1;
  return TRAFFIC_FLAGS.slice(0, count);
}

export function generateRandomIP(forcePrivate = false): string {
  if (forcePrivate || Math.random() > 0.2) {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function formatRiskScore(score: number): string {
  return `${score.toFixed(1)} 分`;
}
