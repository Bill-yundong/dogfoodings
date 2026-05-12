import type { TimeSeriesData, ClusterResult, NormalizedTraffic } from '../types';

export class TimeSeriesClusterEngine {
  private epsilon: number;
  private minSamples: number;
  private windowSize: number;

  constructor(epsilon = 0.3, minSamples = 5, windowSize = 100) {
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
      const distance = this.calculateDTWDistance(target.values, points[i].values);
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

  private calculateDTWDistance(seq1: number[], seq2: number[]): number {
    const n = seq1.length;
    const m = seq2.length;
    const dtw: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = Math.abs(seq1[i - 1] - seq2[j - 1]);
        dtw[i][j] = cost + Math.min(
          dtw[i - 1][j],
          dtw[i][j - 1],
          dtw[i - 1][j - 1]
        );
      }
    }

    return dtw[n][m] / Math.max(n, m);
  }

  private calculateCentroid(cluster: TimeSeriesData[]): number[] {
    if (cluster.length === 0) return [];
    const dimensions = cluster[0].values.length;
    const centroid = new Array(dimensions).fill(0);

    for (const point of cluster) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += point.values[i];
      }
    }

    return centroid.map(v => v / cluster.length);
  }

  private calculateAnomalyScore(cluster: TimeSeriesData[], centroid: number[]): number {
    if (cluster.length === 0) return 0;

    let totalDistance = 0;
    for (const point of cluster) {
      totalDistance += this.euclideanDistance(point.values, centroid);
    }

    return totalDistance / cluster.length;
  }

  private euclideanDistance(v1: number[], v2: number[]): number {
    if (v1.length !== v2.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
      sum += Math.pow(v1[i] - v2[i], 2);
    }
    return Math.sqrt(sum);
  }

  private detectAPTIndicators(cluster: TimeSeriesData[]): { isAPT: boolean; confidence: number } {
    if (cluster.length < this.minSamples * 2) {
      return { isAPT: false, confidence: 0 };
    }

    let aptScore = 0;
    const timestamps = cluster.map(p => p.timestamp);
    const timeIntervals = timestamps.slice(1).map((t, i) => t - timestamps[i]);

    const intervalVariance = this.calculateVariance(timeIntervals);
    if (intervalVariance < 1000) {
      aptScore += 25;
    }

    const frequency = this.calculateFrequency(cluster);
    if (frequency > 0.7) {
      aptScore += 20;
    }

    const avgRisk = cluster.reduce((sum, p) => sum + (p.values[0] || 0), 0) / cluster.length;
    if (avgRisk > 0.5) {
      aptScore += 30;
    }

    const duration = timestamps[timestamps.length - 1] - timestamps[0];
    if (duration > 3600000) {
      aptScore += 25;
    }

    return {
      isAPT: aptScore >= 60,
      confidence: Math.min(aptScore, 100),
    };
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateFrequency(cluster: TimeSeriesData[]): number {
    if (cluster.length < 2) return 0;
    const timeSpan = cluster[cluster.length - 1].timestamp - cluster[0].timestamp;
    if (timeSpan === 0) return 1;
    return cluster.length / (timeSpan / 1000);
  }

  private analyzeCluster(cluster: TimeSeriesData[]): ClusterResult {
    const center = this.calculateCentroid(cluster);
    const anomalyScore = this.calculateAnomalyScore(cluster, center);
    const { isAPT, confidence } = this.detectAPTIndicators(cluster);

    return {
      clusterId: this.generateClusterId(),
      center,
      points: cluster,
      anomalyScore,
      isAPT,
      confidence,
    };
  }

  private generateClusterId(): string {
    return 'cluster_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
