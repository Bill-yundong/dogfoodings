import { createSignal } from 'solid-js';
import { createTrafficStore } from '../features/traffic/model';
import { createFingerprintStore } from '../features/fingerprint/model';
import { createClusteringStore } from '../features/clustering/model';
import { createAlertStore } from '../features/alerts/model';
import { generateMockTrafficFeature } from '../shared/utils/generateMockData';
import type { Statistics, TrafficFeature } from '../core/types';

export function createAppStore() {
  const trafficStore = createTrafficStore();
  const fingerprintStore = createFingerprintStore(trafficStore);
  const clusteringStore = createClusteringStore(trafficStore);
  const alertStore = createAlertStore();

  const [activeTab, setActiveTab] = createSignal<'dashboard' | 'analysis' | 'fingerprints' | 'settings'>('dashboard');
  const [statistics, setStatistics] = createSignal<Statistics>({
    totalFeatures: 0,
    totalFingerprints: 0,
    highRiskCount: 0,
    aptClusterCount: 0,
  });

  const updateStatistics = async () => {
    const stats = await trafficStore.getStore().getStatistics();
    setStatistics(stats);
  };

  const init = async () => {
    await trafficStore.init();
    await fingerprintStore.loadFingerprints(100);
    await clusteringStore.loadClusters();
    await updateStatistics();
  };

  const addTrafficFeature = async (feature: TrafficFeature) => {
    const result = await trafficStore.addFeature(feature);
    await fingerprintStore.addOrUpdateFingerprint(feature, result.riskScore);
    
    if (result.riskScore >= 70) {
      alertStore.addAlert(`检测到高风险流量: ${feature.sourceIP} -> ${feature.destIP}`, 'danger');
    } else if (result.riskScore >= 40) {
      alertStore.addAlert(`检测到可疑流量: ${feature.protocol} 协议`, 'warning');
    }

    await updateStatistics();
    return result;
  };

  const generateMockData = async (count: number = 50) => {
    for (let i = 0; i < count; i++) {
      const feature = generateMockTrafficFeature();
      await addTrafficFeature(feature);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    alertStore.addAlert(`已生成 ${count} 条测试流量数据`, 'info');
  };

  const performClustering = async () => {
    const results = await clusteringStore.performClustering();
    await updateStatistics();
    
    if (results.length > 0) {
      const aptCount = results.filter(r => r.isAPT).length;
      if (aptCount > 0) {
        alertStore.addAlert(`检测到 ${aptCount} 个潜在 APT 攻击集群`, 'danger');
      }
      alertStore.addAlert(`聚类分析完成，共发现 ${results.length} 个集群`, 'info');
    }
    return results;
  };

  const clearAllData = async () => {
    await trafficStore.clearAll();
    alertStore.addAlert('所有数据已清除', 'warning');
    await updateStatistics();
  };

  return {
    traffic: trafficStore,
    fingerprint: fingerprintStore,
    clustering: clusteringStore,
    alerts: alertStore,
    activeTab,
    setActiveTab,
    statistics,
    init,
    addTrafficFeature,
    generateMockData,
    performClustering,
    updateStatistics,
    clearAllData,
  };
}

export type AppStore = ReturnType<typeof createAppStore>;
