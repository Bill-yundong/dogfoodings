import { createSignal, onCleanup } from 'solid-js';
import type { TrafficFeature, NormalizedTraffic } from '../../core/types';
import { normalizeTraffic } from '../../core/algorithms/normalizer';
import { FingerprintStore } from '../../core/storage/indexedDB';

export function createTrafficStore() {
  const [features, setFeatures] = createSignal<TrafficFeature[]>([]);
  const [normalized, setNormalized] = createSignal<NormalizedTraffic[]>([]);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [store] = createSignal(new FingerprintStore());

  const init = async () => {
    await store().init();
    const savedFeatures = await store().getTrafficFeatures(100);
    const savedNormalized = await store().getNormalizedTraffic(100);
    setFeatures(savedFeatures);
    setNormalized(savedNormalized);
  };

  const addFeature = async (feature: TrafficFeature) => {
    setIsProcessing(true);
    try {
      const normalizedResult = normalizeTraffic(feature);
      
      await store().addTrafficFeature(feature);
      await store().addNormalizedTraffic(normalizedResult);

      setFeatures(prev => [...prev.slice(-999), feature]);
      setNormalized(prev => [...prev.slice(-999), normalizedResult]);

      return { normalized: normalizedResult, riskScore: normalizedResult.riskScore };
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = async () => {
    await store().clearAll();
    setFeatures([]);
    setNormalized([]);
  };

  onCleanup(() => {
    store().close();
  });

  return {
    features,
    normalized,
    isProcessing,
    init,
    addFeature,
    clearAll,
    getStore: () => store(),
  };
}

export type TrafficStore = ReturnType<typeof createTrafficStore>;
