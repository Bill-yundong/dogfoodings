import type { TrafficFeature, NormalizedTraffic } from '../types';

export class TrafficNormalizer {
  private static readonly PROTOCOL_MAP: Record<string, number> = {
    TCP: 0.1,
    UDP: 0.2,
    ICMP: 0.3,
    HTTP: 0.4,
    MODBUS: 0.5,
    S7COMM: 0.6,
    DNP3: 0.7,
  };

  private static readonly VECTOR_DIMENSIONS = 20;

  static normalize(feature: TrafficFeature): NormalizedTraffic {
    const normalizedVector = this.extractFeatureVector(feature);
    const riskScore = this.calculateRiskScore(feature, normalizedVector);
    const classification = this.classifyTraffic(riskScore);

    return {
      featureId: feature.id,
      normalizedVector,
      timestamp: feature.timestamp,
      riskScore,
      classification,
    };
  }

  private static extractFeatureVector(feature: TrafficFeature): number[] {
    const vector: number[] = new Array(this.VECTOR_DIMENSIONS).fill(0);

    vector[0] = this.normalizeIP(feature.sourceIP);
    vector[1] = this.normalizeIP(feature.destinationIP);
    vector[2] = this.normalizePort(feature.sourcePort);
    vector[3] = this.normalizePort(feature.destinationPort);
    vector[4] = this.PROTOCOL_MAP[feature.protocol] || 0;
    vector[5] = Math.min(feature.packetLength / 1500, 1);
    vector[6] = Math.min(feature.packetCount / 1000, 1);
    vector[7] = Math.min(feature.duration / 60000, 1);
    vector[8] = Math.min(feature.bytesIn / 1000000, 1);
    vector[9] = Math.min(feature.bytesOut / 1000000, 1);
    vector[10] = Math.min(feature.interval / 1000, 1);
    vector[11] = this.hashFlags(feature.flags);
    vector[12] = this.isICSProtocol(feature.protocol) ? 1 : 0;
    vector[13] = this.isPrivateIP(feature.sourceIP) ? 1 : 0;
    vector[14] = this.isPrivateIP(feature.destinationIP) ? 1 : 0;
    vector[15] = this.getPacketEntropy(feature.payloadHash);
    vector[16] = feature.bytesOut > 0 ? Math.min(feature.bytesIn / feature.bytesOut, 2) / 2 : 0;
    vector[17] = feature.packetCount > 0 ? Math.min(feature.packetLength / feature.packetCount, 1500) / 1500 : 0;
    vector[18] = this.isWellKnownPort(feature.destinationPort) ? 1 : 0;
    vector[19] = this.hasSuspiciousFlags(feature.flags) ? 1 : 0;

    return vector;
  }

  private static normalizeIP(ip: string): number {
    const parts = ip.split('.');
    if (parts.length !== 4) return 0;
    const hash = parts.reduce((acc, part, i) => acc + parseInt(part) * Math.pow(2, 8 * (3 - i)), 0);
    return (hash % 1000000) / 1000000;
  }

  private static normalizePort(port: number): number {
    return port / 65535;
  }

  private static hashFlags(flags: string[]): number {
    return flags.reduce((acc, flag) => acc + flag.charCodeAt(0), 0) / 1000;
  }

  private static isICSProtocol(protocol: string): boolean {
    return ['MODBUS', 'S7COMM', 'DNP3'].includes(protocol);
  }

  private static isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }

  private static getPacketEntropy(hash: string): number {
    const chars = new Set(hash);
    return chars.size / hash.length;
  }

  private static isWellKnownPort(port: number): boolean {
    return port < 1024;
  }

  private static hasSuspiciousFlags(flags: string[]): boolean {
    const suspicious = ['SYN', 'FIN', 'RST', 'URG'];
    return suspicious.some(f => flags.includes(f)) && flags.length > 2;
  }

  private static calculateRiskScore(feature: TrafficFeature, vector: number[]): number {
    let score = 0;

    if (this.isICSProtocol(feature.protocol)) {
      if (!this.isPrivateIP(feature.sourceIP) || !this.isPrivateIP(feature.destinationIP)) {
        score += 30;
      }
    }

    if (!this.isPrivateIP(feature.sourceIP) && this.isICSProtocol(feature.protocol)) {
      score += 25;
    }

    if (feature.duration > 300000) {
      score += 15;
    }

    if (feature.packetCount > 10000) {
      score += 10;
    }

    if (this.hasSuspiciousFlags(feature.flags)) {
      score += 20;
    }

    if (vector[15] < 0.3) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  private static classifyTraffic(riskScore: number): NormalizedTraffic['classification'] {
    if (riskScore >= 70) return 'malicious';
    if (riskScore >= 40) return 'suspicious';
    if (riskScore >= 10) return 'unknown';
    return 'normal';
  }

  static generateFeatureHash(feature: TrafficFeature): string {
    const key = `${feature.sourceIP}:${feature.destinationIP}:${feature.protocol}:${feature.payloadHash}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  static syncMapping(): Record<string, number[]> {
    return {
      protocolMapping: Object.values(this.PROTOCOL_MAP),
      vectorDimensions: [this.VECTOR_DIMENSIONS],
      riskThresholds: [10, 40, 70],
    };
  }
}
