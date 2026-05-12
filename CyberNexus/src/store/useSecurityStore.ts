import { createSignal, onCleanup } from 'solid-js';
import type { TrafficFeature, NormalizedTraffic, TrafficFingerprint, ClusterResult } from '../types';
import { TrafficNormalizer } from '../modules/TrafficNormalizer';
import { TimeSeriesClusterEngine } from '../modules/TimeSeriesClusterEngine';
import { FingerprintStore } from '../modules/FingerprintStore';

export function useSecurityStore() {
  const [trafficFeatures, setTrafficFeatures] = createSignal<TrafficFeature[]>([]);
  const [normalizedTraffic, setNormalizedTraffic] = createSignal<NormalizedTraffic[]>([]);
  const [fingerprints, setFingerprints] = createSignal<TrafficFingerprint[]>([]);
  const [clusters, setClusters] = createSignal<ClusterResult[]>([]);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [statistics, setStatistics] = createSignal({
    totalFeatures: 0,
    totalFingerprints: 0,
    highRiskCount: 0,
    aptClusterCount: 0,
  });
  const [activeTab, setActiveTab] = createSignal<'dashboard' | 'analysis' | 'fingerprints' | 'settings'>('dashboard');
  const [alerts, setAlerts] = createSignal<Array<{ id: string; message: string; type: 'info' | 'warning' | 'danger'; timestamp: number }>>([]);

  const store = new FingerprintStore();
  const clusterEngine = new TimeSeriesClusterEngine();

  let processingInterval: number | null = null;

  const init = async () => {
    await store.init();
    await updateStatistics();
    startProcessing();
  };

  const addAlert = (message: string, type: 'info' | 'warning' | 'danger') => {
    const alert = {
      id: 'alert_' + Date.now(),
      message,
      type,
      timestamp: Date.now(),
    };
    setAlerts(prev => [...prev, alert]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 5000);
  };

  const addTrafficFeature = async (feature: TrafficFeature) => {
    setIsProcessing(true);
    try {
      const normalized = TrafficNormalizer.normalize(feature);
      await store.addTrafficFeature(feature);
      await store.addNormalizedTraffic(normalized);
      await store.updateOrCreateFingerprint(feature, normalized);

      setTrafficFeatures(prev => [...prev.slice(-999), feature]);
      setNormalizedTraffic(prev => [...prev.slice(-999), normalized]);

      if (normalized.riskScore >= 70) {
        addAlert(`检测到高风险流量: ${feature.sourceIP} -> ${feature.destinationIP}`, 'danger');
      } else if (normalized.riskScore >= 40) {
        addAlert(`检测到可疑流量: ${feature.protocol} 协议`, 'warning');
      }

      await updateStatistics();
    } finally {
      setIsProcessing(false);
    }
  };

  const performClustering = async () => {
    setIsProcessing(true);
    try {
      const timeSeriesData = clusterEngine.convertToTimeSeries(normalizedTraffic());
      const windowResults = await Promise.all(clusterEngine.slidingWindowAnalysis(timeSeriesData));
      const allClusters = windowResults.flat();

      for (const cluster of allClusters) {
        await store.addClusterResult(cluster);
        if (cluster.isAPT) {
          addAlert(`检测到潜在 APT 攻击! 置信度: ${cluster.confidence.toFixed(1)}%`, 'danger');
        }
      }

      setClusters(allClusters);
      await updateStatistics();
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMockData = async (count: number = 50) => {
    const protocols: TrafficFeature['protocol'][] = ['TCP', 'UDP', 'MODBUS', 'S7COMM', 'DNP3', 'HTTP'];
    const flags = ['SYN', 'ACK', 'FIN', 'PSH', 'URG'];

    for (let i = 0; i < count; i++) {
      const feature: TrafficFeature = {
        id: 'feat_' + Date.now() + '_' + i,
        timestamp: Date.now() - Math.random() * 86400000,
        sourceIP: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        destinationIP: Math.random() > 0.8
          ? `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
          : `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        sourcePort: Math.floor(Math.random() * 65535),
        destinationPort: Math.floor(Math.random() * 65535),
        protocol: protocols[Math.floor(Math.random() * protocols.length)],
        packetLength: Math.floor(Math.random() * 1500),
        packetCount: Math.floor(Math.random() * 1000),
        duration: Math.floor(Math.random() * 60000),
        bytesIn: Math.floor(Math.random() * 1000000),
        bytesOut: Math.floor(Math.random() * 1000000),
        interval: Math.floor(Math.random() * 10000),
        flags: flags.slice(0, Math.floor(Math.random() * 3) + 1),
        payloadHash: Math.random().toString(36).substr(2, 32),
      };

      await addTrafficFeature(feature);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    addAlert(`已生成 ${count} 条流量数据`, 'info');
    await performClustering();
  };

  const updateStatistics = async () => {
    const stats = await store.getStatistics();
    setStatistics(stats);
  };

  const loadFingerprints = async () => {
    const fps = await store.getHighRiskFingerprints(0);
    setFingerprints(fps);
  };

  const clearAllData = async () => {
    await store.clearAll();
    setTrafficFeatures([]);
    setNormalizedTraffic([]);
    setFingerprints([]);
    setClusters([]);
    await updateStatistics();
    addAlert('所有数据已清除', 'info');
  };

  const startProcessing = () => {
    if (processingInterval) return;
    processingInterval = window.setInterval(async () => {
      if (normalizedTraffic().length > 10 && normalizedTraffic().length % 20 === 0) {
        await performClustering();
      }
      await updateStatistics();
    }, 10000);
  };

  const stopProcessing = () => {
    if (processingInterval) {
      clearInterval(processingInterval);
      processingInterval = null;
    }
  };

  onCleanup(() => {
    stopProcessing();
    store.close();
  });

  return {
    trafficFeatures,
    normalizedTraffic,
    fingerprints,
    clusters,
    isProcessing,
    statistics,
    activeTab,
    alerts,
    setActiveTab,
    init,
    addTrafficFeature,
    performClustering,
    generateMockData,
    loadFingerprints,
    clearAllData,
    updateStatistics,
  };
}

export type SecurityStore = ReturnType<typeof useSecurityStore>;
