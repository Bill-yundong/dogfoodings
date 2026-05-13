import { createSignal } from 'solid-js';
import type { TrafficFingerprint, TrafficFeature } from '../../core/types';

export function createFingerprintStore(trafficStore: { getStore: () => { getFingerprints: (limit?: number) => Promise<TrafficFingerprint[]>; getFingerprintByHash: (hash: string) => Promise<TrafficFingerprint | null>; addFingerprint: (fp: TrafficFingerprint) => Promise<void>; updateFingerprint: (fp: TrafficFingerprint) => Promise<void>; }; }) {
  const [fingerprints, setFingerprints] = createSignal<TrafficFingerprint[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);

  const loadFingerprints = async (limit?: number) => {
    setIsLoading(true);
    try {
      const data = await trafficStore.getStore().getFingerprints(limit);
      setFingerprints(data);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFeatureHash = (feature: TrafficFeature): string => {
    const key = `${feature.sourceIP}:${feature.destIP}:${feature.protocol}:${feature.payloadHash}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };

  const addOrUpdateFingerprint = async (feature: TrafficFeature, riskScore: number) => {
    const hash = generateFeatureHash(feature);
    const existing = await trafficStore.getStore().getFingerprintByHash(hash);

    if (existing) {
      existing.lastSeen = feature.timestamp;
      existing.occurrenceCount += 1;
      existing.avgRiskScore = (existing.avgRiskScore * (existing.occurrenceCount - 1) + riskScore) / existing.occurrenceCount;
      if (!existing.associatedIPs.includes(feature.sourceIP)) {
        existing.associatedIPs.push(feature.sourceIP);
      }
      await trafficStore.getStore().updateFingerprint(existing);
    } else {
      const fingerprint: TrafficFingerprint = {
        id: `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        featureHash: hash,
        firstSeen: feature.timestamp,
        lastSeen: feature.timestamp,
        occurrenceCount: 1,
        avgRiskScore: riskScore,
        associatedIPs: [feature.sourceIP],
      };
      await trafficStore.getStore().addFingerprint(fingerprint);
    }

    await loadFingerprints(100);
  };

  return {
    fingerprints,
    isLoading,
    loadFingerprints,
    addOrUpdateFingerprint,
    generateFeatureHash,
  };
}

export type FingerprintStore = ReturnType<typeof createFingerprintStore>;
