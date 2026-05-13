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
    const riskScore = this.calculateRiskScore(feature);
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
    vector[1] = normalizeIP(feature.destIP);
    vector[2] = normalizePort(feature.sourcePort);
    vector[3] = normalizePort(feature.destPort);
    vector[4] = this.PROTOCOL_MAP[feature.protocol] || 0;
    vector[5] = Math.min(feature.totalBytes / feature.packetCount / 1500, 1);
    vector[6] = Math.min(feature.packetCount / 1000, 1);
    vector[7] = Math.min(feature.duration / 3600, 1);
    vector[8] = Math.min(feature.packetRate / 1000, 1);
    vector[9] = Math.min(feature.byteRate / 1000000, 1);
    vector[10] = feature.direction === 'INBOUND' ? 0 : feature.direction === 'OUTBOUND' ? 1 : 2;
    vector[11] = hashFlags(feature.flags);
    vector[12] = isICSProtocol(feature.protocol) ? 1 : 0;
    vector[13] = isPrivateIP(feature.sourceIP) ? 1 : 0;
    vector[14] = isPrivateIP(feature.destIP) ? 1 : 0;
    vector[15] = getPacketEntropy(feature.payloadHash);
    vector[16] = feature.entropy / 8;
    vector[17] = feature.isIndustrial ? 1 : 0;
    vector[18] = isWellKnownPort(feature.destPort) ? 1 : 0;
    vector[19] = hasSuspiciousFlags(feature.flags) ? 1 : 0;

    return vector;
  }

  private static calculateRiskScore(feature: TrafficFeature): number {
    let score = 0;

    if (feature.isIndustrial) {
      if (!isPrivateIP(feature.sourceIP) || !isPrivateIP(feature.destIP)) {
        score += 30;
      }
    }

    if (!isPrivateIP(feature.sourceIP) && feature.isIndustrial) {
      score += 25;
    }

    if (feature.duration > 300) {
      score += 15;
    }

    if (feature.packetCount > 10000) {
      score += 10;
    }

    if (hasSuspiciousFlags(feature.flags)) {
      score += 20;
    }

    if (feature.entropy < 2) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  private static classifyTraffic(riskScore: number): ClassificationType {
    if (riskScore >= RISK_THRESHOLDS.HIGH) return 'MALICIOUS';
    if (riskScore >= RISK_THRESHOLDS.MEDIUM) return 'SUSPICIOUS';
    return 'NORMAL';
  }

  static syncMapping(): Record<string, number[]> {
    return {
      protocolMapping: Object.values(this.PROTOCOL_MAP),
      vectorDimensions: [this.VECTOR_DIMENSIONS],
      riskThresholds: [RISK_THRESHOLDS.LOW, RISK_THRESHOLDS.MEDIUM, RISK_THRESHOLDS.HIGH],
    };
  }
}
