import { TrafficNormalizerService } from '../domain/services/TrafficNormalizer.service';
import { TimeSeriesClusterService } from '../domain/services/TimeSeriesCluster.service';
import { FingerprintStore } from '../infrastructure/storage/FingerprintStore';
import {
  generateId,
  generateRandomProtocol,
  generateRandomIP,
  generateRandomFlags,
} from '../shared/utils/traffic.utils';
import type {
  TrafficFeature,
  NormalizedTraffic,
  ClusterResult,
  TrafficFingerprint,
  Statistics,
} from '../domain/entities/traffic.entity';

export class TrafficAnalysisAppService {
  private clusterService: TimeSeriesClusterService;
  private store: FingerprintStore;

  constructor(
    clusterService: TimeSeriesClusterService = new TimeSeriesClusterService(),
    store: FingerprintStore = new FingerprintStore()
  ) {
    this.clusterService = clusterService;
    this.store = store;
  }

  async init(): Promise<void> {
    await this.store.init();
  }

  async processTrafficFeature(feature: TrafficFeature): Promise<{
    normalized: NormalizedTraffic;
    riskScore: number;
  }> {
    const normalized = TrafficNormalizerService.normalize(feature);

    await this.store.addTrafficFeature(feature);
    await this.store.addNormalizedTraffic(normalized);
    await this.store.updateOrCreateFingerprint(feature, normalized);

    return {
      normalized,
      riskScore: normalized.riskScore,
    };
  }

  async performClusteringAnalysis(normalizedTraffic: NormalizedTraffic[]): Promise<ClusterResult[]> {
    const timeSeriesData = this.clusterService.convertToTimeSeries(normalizedTraffic);
    const windowResults = await Promise.all(this.clusterService.slidingWindowAnalysis(timeSeriesData));
    const allClusters = windowResults.flat();

    for (const cluster of allClusters) {
      await this.store.addClusterResult(cluster);
    }

    return allClusters;
  }

  async generateMockTrafficData(count: number = 50): Promise<TrafficFeature[]> {
    const features: TrafficFeature[] = [];

    for (let i = 0; i < count; i++) {
      const feature: TrafficFeature = {
        id: generateId('feat'),
        timestamp: Date.now() - Math.random() * 86400000,
        sourceIP: generateRandomIP(),
        destinationIP: Math.random() > 0.8 ? generateRandomIP() : generateRandomIP(),
        sourcePort: Math.floor(Math.random() * 65535),
        destinationPort: Math.floor(Math.random() * 65535),
        protocol: generateRandomProtocol(),
        packetLength: Math.floor(Math.random() * 1500),
        packetCount: Math.floor(Math.random() * 1000),
        duration: Math.floor(Math.random() * 60000),
        bytesIn: Math.floor(Math.random() * 1000000),
        bytesOut: Math.floor(Math.random() * 1000000),
        interval: Math.floor(Math.random() * 10000),
        flags: generateRandomFlags(),
        payloadHash: Math.random().toString(36).substr(2, 32),
      };

      features.push(feature);
      await this.processTrafficFeature(feature);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return features;
  }

  async getStatistics(): Promise<Statistics> {
    return this.store.getStatistics();
  }

  async getHighRiskFingerprints(threshold?: number): Promise<TrafficFingerprint[]> {
    return this.store.getHighRiskFingerprints(threshold);
  }

  async getAPTClusters(): Promise<ClusterResult[]> {
    return this.store.getAPTClusters();
  }

  async getTrafficFeaturesByTimeRange(startTime: number, endTime: number): Promise<TrafficFeature[]> {
    return this.store.getTrafficFeaturesByTimeRange(startTime, endTime);
  }

  async getNormalizedTrafficByTimeRange(startTime: number, endTime: number): Promise<NormalizedTraffic[]> {
    return this.store.getNormalizedTrafficByTimeRange(startTime, endTime);
  }

  async clearAllData(): Promise<void> {
    await this.store.clearAll();
  }

  async close(): Promise<void> {
    await this.store.close();
  }

  getSyncMapping(): Record<string, number[]> {
    return TrafficNormalizerService.syncMapping();
  }
}
