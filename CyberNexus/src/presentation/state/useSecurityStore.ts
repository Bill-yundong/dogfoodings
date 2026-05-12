import { createSignal, onCleanup } from 'solid-js';
import { TrafficAnalysisAppService } from '../../application/TrafficAnalysisAppService';
import { ALERT_CONFIG } from '../../shared/constants/app.constants';
import type {
  TrafficFeature,
  NormalizedTraffic,
  TrafficFingerprint,
  ClusterResult,
  Statistics,
  Alert,
  AlertType,
} from '../../domain/entities/traffic.entity';

export function useSecurityStore() {
  const [trafficFeatures, setTrafficFeatures] = createSignal<TrafficFeature[]>([]);
  const [normalizedTraffic, setNormalizedTraffic] = createSignal<NormalizedTraffic[]>([]);
  const [fingerprints, setFingerprints] = createSignal<TrafficFingerprint[]>([]);
  const [clusters, setClusters] = createSignal<ClusterResult[]>([]);
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [statistics, setStatistics] = createSignal<Statistics>({
    totalFeatures: 0,
    totalFingerprints: 0,
    highRiskCount: 0,
    aptClusterCount: 0,
  });
  const [activeTab, setActiveTab] = createSignal<'dashboard' | 'analysis' | 'fingerprints' | 'settings'>('dashboard');
  const [alerts, setAlerts] = createSignal<Alert[]>([]);

  const appService = new TrafficAnalysisAppService();
  let processingInterval: number | null = null;

  const init = async () => {
    await appService.init();
    await updateStatistics();
    startProcessing();
  };

  const addAlert = (message: string, type: AlertType) => {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      timestamp: Date.now(),
    };
    setAlerts(prev => [...prev, alert]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, ALERT_CONFIG.AUTO_DISMISS_MS);
  };

  const addTrafficFeature = async (feature: TrafficFeature) => {
    setIsProcessing(true);
    try {
      const { normalized, riskScore } = await appService.processTrafficFeature(feature);

      setTrafficFeatures(prev => [...prev.slice(-999), feature]);
      setNormalizedTraffic(prev => [...prev.slice(-999), normalized]);

      if (riskScore >= 70) {
        addAlert(`检测到高风险流量: ${feature.sourceIP} -> ${feature.destinationIP}`, 'danger');
      } else if (riskScore >= 40) {
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
      const allClusters = await appService.performClusteringAnalysis(normalizedTraffic());
      setClusters(allClusters);

      const aptCount = allClusters.filter(c => c.isAPT).length;
      if (aptCount > 0) {
        addAlert(`检测到 ${aptCount} 个潜在 APT 攻击行为模式`, 'danger');
      }

      await updateStatistics();
      return allClusters;
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMockData = async (count: number = 50) => {
    setIsProcessing(true);
    try {
      const features = await appService.generateMockTrafficData(count);
      addAlert(`已生成 ${count} 条流量数据`, 'info');
      await performClustering();
      return features;
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStatistics = async () => {
    const stats = await appService.getStatistics();
    setStatistics(stats);
  };

  const loadFingerprints = async () => {
    const fps = await appService.getHighRiskFingerprints(0);
    setFingerprints(fps);
  };

  const clearAllData = async () => {
    await appService.clearAllData();
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
    }, ALERT_CONFIG.PROCESSING_INTERVAL_MS);
  };

  const stopProcessing = () => {
    if (processingInterval) {
      clearInterval(processingInterval);
      processingInterval = null;
    }
  };

  onCleanup(() => {
    stopProcessing();
    appService.close();
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
