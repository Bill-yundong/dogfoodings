export function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function euclideanDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += Math.pow(v1[i] - v2[i], 2);
  }
  return Math.sqrt(sum);
}

export function calculateDTWDistance(seq1: number[], seq2: number[]): number {
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

export function calculateCentroid(points: number[][]): number[] {
  if (points.length === 0) return [];
  const dimensions = points[0].length;
  const centroid = new Array(dimensions).fill(0);

  for (const point of points) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += point[i];
    }
  }

  return centroid.map(v => v / points.length);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeValue(value: number, max: number): number {
  return Math.min(value / max, 1);
}
