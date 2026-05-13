import { CLUSTER_CONFIG } from '../../config/constants';
import type { NormalizedTraffic, ClusterResult } from '../../@types';

export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function calculateCentroid(points: NormalizedTraffic[]): number[] {
  if (points.length === 0) return [];

  const dimension = points[0].normalizedVector.length;
  const centroid = new Array(dimension).fill(0);

  for (const point of points) {
    for (let i = 0; i < dimension; i++) {
      centroid[i] += point.normalizedVector[i];
    }
  }

  for (let i = 0; i < dimension; i++) {
    centroid[i] /= points.length;
  }

  return centroid;
}

export function findNeighbors(
  point: NormalizedTraffic,
  allPoints: NormalizedTraffic[],
  epsilon: number
): NormalizedTraffic[] {
  return allPoints.filter(p => {
    if (p.featureId === point.featureId) return false;
    return euclideanDistance(p.normalizedVector, point.normalizedVector) <= epsilon;
  });
}

export function dbscanClustering(
  points: NormalizedTraffic[],
  epsilon: number = CLUSTER_CONFIG.EPSILON,
  minSamples: number = CLUSTER_CONFIG.MIN_SAMPLES
): ClusterResult[] {
  const clusters: ClusterResult[] = [];
  const visited = new Set<string>();
  const clustered = new Set<string>();

  for (const point of points) {
    if (visited.has(point.featureId)) continue;
    visited.add(point.featureId);

    const neighbors = findNeighbors(point, points, epsilon);

    if (neighbors.length < minSamples) {
      continue;
    }

    const clusterPoints: NormalizedTraffic[] = [];
    const queue = [...neighbors];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!clustered.has(current.featureId)) {
        clusterPoints.push(current);
        clustered.add(current.featureId);

        const currentNeighbors = findNeighbors(current, points, epsilon);
        if (currentNeighbors.length >= minSamples) {
          for (const neighbor of currentNeighbors) {
            if (!visited.has(neighbor.featureId)) {
              visited.add(neighbor.featureId);
              queue.push(neighbor);
            }
          }
        }
      }
    }

    if (clusterPoints.length >= minSamples) {
      const centroid = calculateCentroid(clusterPoints);
      const avgDistance = clusterPoints.reduce(
        (sum, p) => sum + euclideanDistance(p.normalizedVector, centroid),
        0
      ) / clusterPoints.length;

      const anomalyScore = avgDistance / epsilon;
      const isAPT = anomalyScore > CLUSTER_CONFIG.ANOMALY_THRESHOLD;
      const confidence = Math.min(1, anomalyScore / CLUSTER_CONFIG.APT_THRESHOLD);

      clusters.push({
        clusterId: `cluster_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        center: centroid,
        points: clusterPoints,
        anomalyScore,
        isAPT,
        confidence: confidence * 100,
      });
    }
  }

  return clusters;
}

export function slidingWindowClustering(
  allPoints: NormalizedTraffic[],
  windowSize: number = CLUSTER_CONFIG.WINDOW_SIZE
): ClusterResult[] {
  const sortedPoints = [...allPoints].sort((a, b) => a.timestamp - b.timestamp);
  const allClusters: ClusterResult[] = [];

  for (let i = 0; i < sortedPoints.length; i += Math.floor(windowSize / 2)) {
    const window = sortedPoints.slice(i, i + windowSize);
    if (window.length >= CLUSTER_CONFIG.MIN_SAMPLES) {
      const clusters = dbscanClustering(window);
      allClusters.push(...clusters);
    }
  }

  return allClusters;
}

export function detectAPTClusters(clusters: ClusterResult[]): ClusterResult[] {
  return clusters.filter(c => c.isAPT);
}
