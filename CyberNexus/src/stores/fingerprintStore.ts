import { createSignal } from 'solid-js';
import type { TrafficFingerprint, TrafficFeature } from '../@types';
import { generateFeatureHash } from '../lib/utils/traffic';
import type { TrafficStore } from './trafficStore';

export function createFingerprintStore(trafficStore: TrafficStore) {
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
        id: `fp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
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
  };
}

export type FingerprintStore = ReturnType<typeof createFingerprintStore>;
