import { createSignal } from 'solid-js';
import type { ClusterResult, NormalizedTraffic } from '../../core/types';
import { slidingWindowClustering, detectAPTClusters } from '../../core/algorithms/clustering';

export function createClusteringStore(trafficStore: { normalized: () => NormalizedTraffic[]; getStore: () => { addClusterResult: (result: ClusterResult) => Promise<void>; getClusterResults: (limit?: number) => Promise<ClusterResult[]>; }; }) {
  const [clusters, setClusters] = createSignal<ClusterResult[]>([]);
  const [aptClusters, setAPTClusters] = createSignal<ClusterResult[]>([]);
  const [isClustering, setIsClustering] = createSignal(false);

  const loadClusters = async (limit?: number) => {
    const data = await trafficStore.getStore().getClusterResults(limit);
    setClusters(data);
    setAPTClusters(detectAPTClusters(data));
  };

  const performClustering = async () => {
    setIsClustering(true);
    try {
      const normalizedData = trafficStore.normalized();
      if (normalizedData.length < 5) {
        return [];
      }

      const results = slidingWindowClustering(normalizedData);
      
      for (const result of results) {
        await trafficStore.getStore().addClusterResult(result);
      }

      await loadClusters();
      return results;
    } finally {
      setIsClustering(false);
    }
  };

  return {
    clusters,
    aptClusters,
    isClustering,
    loadClusters,
    performClustering,
  };
}

export type ClusteringStore = ReturnType<typeof createClusteringStore>;
