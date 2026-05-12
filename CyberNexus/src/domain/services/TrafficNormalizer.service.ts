import {
  VECTOR_DIMENSIONS,
  PROTOCOL_MAP,
  RISK_THRESHOLDS,
} from '../../shared/constants/app.constants';
import {
  normalizeIP,
  normalizePort,
  hashFlags,
  isICSProtocol,
  isPrivateIP,
  getPacketEntropy,
  isWellKnownPort,
  hasSuspiciousFlags,
} from '../../shared/utils/traffic.utils';
import type { TrafficFeature, NormalizedTraffic, ClassificationType } from '../entities/traffic.entity';

export class TrafficNormalizerService {
  private static readonly VECTOR_DIMENSIONS = VECTOR_DIMENSIONS;
  private static readonly PROTOCOL_MAP = PROTOCOL_MAP;

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

    vector[0] = normalizeIP(feature.sourceIP);
    vector[1] = normalizeIP(feature.destinationIP);
    vector[2] = normalizePort(feature.sourcePort);
    vector[3] = normalizePort(feature.destinationPort);
    vector[4] = this.PROTOCOL_MAP[feature.protocol] || 0;
    vector[5] = Math.min(feature.packetLength / 1500, 1);
    vector[6] = Math.min(feature.packetCount / 1000, 1);
    vector[7] = Math.min(feature.duration / 60000, 1);
    vector[8] = Math.min(feature.bytesIn / 1000000, 1);
    vector[9] = Math.min(feature.bytesOut / 1000000, 1);
    vector[10] = Math.min(feature.interval / 1000, 1);
    vector[11] = hashFlags(feature.flags);
    vector[12] = isICSProtocol(feature.protocol) ? 1 : 0;
    vector[13] = isPrivateIP(feature.sourceIP) ? 1 : 0;
    vector[14] = isPrivateIP(feature.destinationIP) ? 1 : 0;
    vector[15] = getPacketEntropy(feature.payloadHash);
    vector[16] = feature.bytesOut > 0 ? Math.min(feature.bytesIn / feature.bytesOut, 2) / 2 : 0;
    vector[17] = feature.packetCount > 0 ? Math.min(feature.packetLength / feature.packetCount, 1500) / 1500 : 0;
    vector[18] = isWellKnownPort(feature.destinationPort) ? 1 : 0;
    vector[19] = hasSuspiciousFlags(feature.flags) ? 1 : 0;

    return vector;
  }

  private static calculateRiskScore(feature: TrafficFeature, vector: number[]): number {
    let score = 0;

    if (isICSProtocol(feature.protocol)) {
      if (!isPrivateIP(feature.sourceIP) || !isPrivateIP(feature.destinationIP)) {
        score += 30;
      }
    }

    if (!isPrivateIP(feature.sourceIP) && isICSProtocol(feature.protocol)) {
      score += 25;
    }

    if (feature.duration > 300000) {
      score += 15;
    }

    if (feature.packetCount > 10000) {
      score += 10;
    }

    if (hasSuspiciousFlags(feature.flags)) {
      score += 20;
    }

    if (vector[15] < 0.3) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  private static classifyTraffic(riskScore: number): ClassificationType {
    if (riskScore >= RISK_THRESHOLDS.HIGH) return 'malicious';
    if (riskScore >= RISK_THRESHOLDS.MEDIUM) return 'suspicious';
    if (riskScore >= RISK_THRESHOLDS.LOW) return 'unknown';
    return 'normal';
  }

  static syncMapping(): Record<string, number[]> {
    return {
      protocolMapping: Object.values(this.PROTOCOL_MAP),
      vectorDimensions: [this.VECTOR_DIMENSIONS],
      riskThresholds: [RISK_THRESHOLDS.LOW, RISK_THRESHOLDS.MEDIUM, RISK_THRESHOLDS.HIGH],
    };
  }
}
