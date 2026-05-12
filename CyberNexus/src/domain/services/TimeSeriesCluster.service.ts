import {
  CLUSTER_CONFIG,
  APT_DETECTION_CONFIG,
} from '../../shared/constants/app.constants';
import {
  calculateVariance,
  calculateDTWDistance,
  calculateCentroid,
  euclideanDistance,
} from '../../shared/utils/math.utils';
import { generateId } from '../../shared/utils/traffic.utils';
import type {
  TimeSeriesData,
  ClusterResult,
  NormalizedTraffic,
} from '../entities/traffic.entity';

export class TimeSeriesClusterService {
  private epsilon: number;
  private minSamples: number;
  private windowSize: number;

  constructor(
    epsilon = CLUSTER_CONFIG.EPSILON,
    minSamples = CLUSTER_CONFIG.MIN_SAMPLES,
    windowSize = CLUSTER_CONFIG.WINDOW_SIZE
  ) {
    this.epsilon = epsilon;
    this.minSamples = minSamples;
    this.windowSize = windowSize;
  }

  async clusterAsync(timeSeries: TimeSeriesData[]): Promise<ClusterResult[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const clusters = this.performDBSCAN(timeSeries);
        const results = clusters.map(cluster => this.analyzeCluster(cluster));
        resolve(results);
      }, 0);
    });
  }

  private performDBSCAN(points: TimeSeriesData[]): TimeSeriesData[][] {
    const visited = new Set<number>();
    const clusters: TimeSeriesData[][] = [];

    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;

      const neighbors = this.findNeighbors(i, points);
      if (neighbors.length >= this.minSamples) {
        const cluster = this.expandCluster(i, neighbors, points, visited);
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  private findNeighbors(index: number, points: TimeSeriesData[]): number[] {
    const neighbors: number[] = [];
    const target = points[index];

    for (let i = 0; i < points.length; i++) {
      if (i === index) continue;
      const distance = calculateDTWDistance(target.values, points[i].values);
      if (distance <= this.epsilon) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  private expandCluster(
    index: number,
    neighbors: number[],
    points: TimeSeriesData[],
    visited: Set<number>
  ): TimeSeriesData[] {
    const cluster: TimeSeriesData[] = [points[index]];
    visited.add(index);

    let i = 0;
    while (i < neighbors.length) {
      const neighborIndex = neighbors[i];
      if (!visited.has(neighborIndex)) {
        visited.add(neighborIndex);
        cluster.push(points[neighborIndex]);

        const newNeighbors = this.findNeighbors(neighborIndex, points);
        if (newNeighbors.length >= this.minSamples) {
          for (const newNeighbor of newNeighbors) {
            if (!neighbors.includes(newNeighbor)) {
              neighbors.push(newNeighbor);
            }
          }
        }
      }
      i++;
    }

    return cluster;
  }

  private detectAPTIndicators(cluster: TimeSeriesData[]): { isAPT: boolean; confidence: number } {
    if (cluster.length < this.minSamples * 2) {
      return { isAPT: false, confidence: 0 };
    }

    let aptScore = 0;
    const timestamps = cluster.map(p => p.timestamp);
    const timeIntervals = timestamps.slice(1).map((t, i) => t - timestamps[i]);

    const intervalVariance = calculateVariance(timeIntervals);
    if (intervalVariance < APT_DETECTION_CONFIG.INTERVAL_VARIANCE_THRESHOLD) {
      aptScore += 25;
    }

    const frequency = this.calculateFrequency(cluster);
    if (frequency > APT_DETECTION_CONFIG.FREQUENCY_THRESHOLD) {
      aptScore += 20;
    }

    const avgRisk = cluster.reduce((sum, p) => sum + (p.values[0] || 0), 0) / cluster.length;
    if (avgRisk > APT_DETECTION_CONFIG.AVG_RISK_THRESHOLD) {
      aptScore += 30;
    }

    const duration = timestamps[timestamps.length - 1] - timestamps[0];
    if (duration > APT_DETECTION_CONFIG.DURATION_THRESHOLD) {
      aptScore += 25;
    }

    return {
      isAPT: aptScore >= APT_DETECTION_CONFIG.APT_SCORE_THRESHOLD,
      confidence: Math.min(aptScore, 100),
    };
  }

  private calculateFrequency(cluster: TimeSeriesData[]): number {
    if (cluster.length < 2) return 0;
    const timeSpan = cluster[cluster.length - 1].timestamp - cluster[0].timestamp;
    if (timeSpan === 0) return 1;
    return cluster.length / (timeSpan / 1000);
  }

  private analyzeCluster(cluster: TimeSeriesData[]): ClusterResult {
    const center = calculateCentroid(cluster.map(p => p.values));
    const anomalyScore = this.calculateAnomalyScore(cluster, center);
    const { isAPT, confidence } = this.detectAPTIndicators(cluster);

    return {
      clusterId: generateId('cluster'),
      center,
      points: cluster,
      anomalyScore,
      isAPT,
      confidence,
    };
  }

  private calculateAnomalyScore(cluster: TimeSeriesData[], centroid: number[]): number {
    if (cluster.length === 0) return 0;

    let totalDistance = 0;
    for (const point of cluster) {
      totalDistance += euclideanDistance(point.values, centroid);
    }

    return totalDistance / cluster.length;
  }

  convertToTimeSeries(normalizedTraffic: NormalizedTraffic[]): TimeSeriesData[] {
    return normalizedTraffic.map(traffic => ({
      timestamp: traffic.timestamp,
      values: [
        traffic.riskScore / 100,
        ...traffic.normalizedVector,
      ],
    }));
  }

  slidingWindowAnalysis(data: TimeSeriesData[], windowSize?: number): Promise<ClusterResult[]>[] {
    const size = windowSize || this.windowSize;
    const windows: Promise<ClusterResult[]>[] = [];

    for (let i = 0; i <= data.length - size; i += Math.floor(size / 2)) {
      const window = data.slice(i, i + size);
      windows.push(this.clusterAsync(window));
    }

    return windows;
  }

  updateParameters(params: { epsilon?: number; minSamples?: number; windowSize?: number }): void {
    if (params.epsilon !== undefined) this.epsilon = params.epsilon;
    if (params.minSamples !== undefined) this.minSamples = params.minSamples;
    if (params.windowSize !== undefined) this.windowSize = params.windowSize;
  }
}
