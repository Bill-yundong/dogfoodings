import { VECTOR_DIMENSIONS, PROTOCOL_MAP, RISK_THRESHOLDS } from '../../config/constants';
import type { TrafficFeature, NormalizedTraffic, ClassificationType } from '../../@types';
import { normalizeIP, isPrivateIP } from '../utils/traffic';

export function extractFeatureVector(feature: TrafficFeature): number[] {
  const vector: number[] = new Array(VECTOR_DIMENSIONS).fill(0);

  vector[0] = normalizeIP(feature.sourceIP);
  vector[1] = normalizeIP(feature.destIP);
  vector[2] = feature.sourcePort / 65535;
  vector[3] = feature.destPort / 65535;
  vector[4] = PROTOCOL_MAP[feature.protocol] || 0;
  vector[5] = Math.min(feature.totalBytes / feature.packetCount / 1500, 1);
  vector[6] = Math.min(feature.packetCount / 1000, 1);
  vector[7] = Math.min(feature.duration / 3600, 1);
  vector[8] = Math.min(feature.packetRate / 1000, 1);
  vector[9] = Math.min(feature.byteRate / 1000000, 1);
  vector[10] = feature.direction === 'INBOUND' ? 0 : feature.direction === 'OUTBOUND' ? 1 : 2;
  vector[11] = feature.flags.length / 6;
  vector[12] = feature.isIndustrial ? 1 : 0;
  vector[13] = isPrivateIP(feature.sourceIP) ? 1 : 0;
  vector[14] = isPrivateIP(feature.destIP) ? 1 : 0;
  vector[15] = feature.entropy / 8;
  vector[16] = feature.isIndustrial ? 1 : 0;
  vector[17] = feature.destPort < 1024 ? 1 : 0;
  vector[18] = feature.packetCount > 100 ? 1 : 0;
  vector[19] = Math.random();

  return vector;
}

export function calculateRiskScore(feature: TrafficFeature): number {
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

  if (feature.flags.length > 3) {
    score += 20;
  }

  if (feature.entropy < 2) {
    score += 15;
  }

  return Math.min(score, 100);
}

export function classifyTraffic(riskScore: number): ClassificationType {
  if (riskScore >= RISK_THRESHOLDS.HIGH) return 'MALICIOUS';
  if (riskScore >= RISK_THRESHOLDS.MEDIUM) return 'SUSPICIOUS';
  return 'NORMAL';
}

export function normalizeTraffic(feature: TrafficFeature): NormalizedTraffic {
  const riskScore = calculateRiskScore(feature);
  return {
    featureId: feature.id,
    normalizedVector: extractFeatureVector(feature),
    timestamp: feature.timestamp,
    riskScore,
    classification: classifyTraffic(riskScore),
  };
}
