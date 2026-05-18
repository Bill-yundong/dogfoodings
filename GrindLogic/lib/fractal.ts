import type { FractalFeatures, PowerSpectrumPoint, StatisticalFeatures } from '@/types';

export function boxCountingDimension(
  data: number[],
  minBoxSize: number = 2,
  maxBoxSize: number = 64,
  steps: number = 10
): number {
  if (data.length < 2) return 1.0;

  const logBoxSizes: number[] = [];
  const logCounts: number[] = [];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  for (let s = 0; s < steps; s++) {
    const boxSize = minBoxSize * Math.pow(2, s);
    if (boxSize > maxBoxSize || boxSize >= data.length) break;

    const numBoxes = Math.ceil(data.length / boxSize);
    let count = 0;

    for (let i = 0; i < numBoxes; i++) {
      const start = i * boxSize;
      const end = Math.min(start + boxSize, data.length);
      const segment = data.slice(start, end);
      const segMin = Math.min(...segment);
      const segMax = Math.max(...segment);
      const segRange = segMax - segMin;
      const heightBoxes = Math.ceil((segRange / range) * (data.length / boxSize));
      count += heightBoxes || 1;
    }

    logBoxSizes.push(Math.log(1 / boxSize));
    logCounts.push(Math.log(count));
  }

  return linearRegressionSlope(logBoxSizes, logCounts);
}

export function informationDimension(
  data: number[],
  minBoxSize: number = 2,
  maxBoxSize: number = 64,
  steps: number = 10
): number {
  if (data.length < 2) return 1.0;

  const logBoxSizes: number[] = [];
  const logEntropies: number[] = [];

  for (let s = 0; s < steps; s++) {
    const boxSize = minBoxSize * Math.pow(2, s);
    if (boxSize > maxBoxSize || boxSize >= data.length) break;

    const numBoxes = Math.ceil(data.length / boxSize);
    const probabilities: number[] = [];
    const totalPoints = data.length;

    for (let i = 0; i < numBoxes; i++) {
      const start = i * boxSize;
      const end = Math.min(start + boxSize, data.length);
      const count = end - start;
      if (count > 0) {
        probabilities.push(count / totalPoints);
      }
    }

    const entropy = probabilities.reduce((sum, p) => {
      return sum - (p > 0 ? p * Math.log(p) : 0);
    }, 0);

    logBoxSizes.push(Math.log(1 / boxSize));
    logEntropies.push(entropy);
  }

  return linearRegressionSlope(logBoxSizes, logEntropies);
}

export function correlationDimension(
  data: number[],
  maxDistance: number = 100,
  steps: number = 20
): number {
  if (data.length < 10) return 1.0;

  const distances: number[] = [];
  const sampleSize = Math.min(data.length, 500);

  for (let i = 0; i < sampleSize; i++) {
    for (let j = i + 1; j < sampleSize; j++) {
      const dist = Math.abs(data[i] - data[j]);
      if (dist < maxDistance) {
        distances.push(dist);
      }
    }
  }

  if (distances.length < 100) return 1.0;

  distances.sort((a, b) => a - b);

  const logR: number[] = [];
  const logC: number[] = [];

  for (let s = 1; s <= steps; s++) {
    const r = (maxDistance * s) / steps;
    const count = distances.filter((d) => d <= r).length;
    const C = count / distances.length;
    if (C > 0 && C < 1) {
      logR.push(Math.log(r));
      logC.push(Math.log(C));
    }
  }

  return linearRegressionSlope(logR, logC);
}

export function lacunarity(data: number[], boxSize: number = 4): number {
  if (data.length < boxSize * 2) return 1.0;

  const numBoxes = Math.floor(data.length / boxSize);
  const boxMeans: number[] = [];

  for (let i = 0; i < numBoxes; i++) {
    const start = i * boxSize;
    const end = start + boxSize;
    const box = data.slice(start, end);
    const mean = box.reduce((a, b) => a + b, 0) / boxSize;
    boxMeans.push(mean);
  }

  const mean = boxMeans.reduce((a, b) => a + b, 0) / numBoxes;
  const variance = boxMeans.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numBoxes;

  return mean === 0 ? 1.0 : 1 + variance / (mean * mean);
}

export function multifractalSpectrum(
  data: number[],
  qValues: number[] = [-5, -3, -1, 0, 1, 3, 5]
): number[] {
  if (data.length < 32) return qValues.map(() => 1.0);

  const spectrum: number[] = [];
  const boxSize = Math.floor(Math.sqrt(data.length));

  for (const q of qValues) {
    const numBoxes = Math.floor(data.length / boxSize);
    const boxSums: number[] = [];

    for (let i = 0; i < numBoxes; i++) {
      const start = i * boxSize;
      const end = start + boxSize;
      const box = data.slice(start, end);
      const sum = box.reduce((a, b) => a + Math.abs(b), 0);
      boxSums.push(sum);
    }

    const totalSum = boxSums.reduce((a, b) => a + b, 0);
    if (totalSum === 0) {
      spectrum.push(1.0);
      continue;
    }

    const probabilities = boxSums.map((s) => s / totalSum);

    if (q === 1) {
      const entropy = probabilities.reduce((sum, p) => {
        return sum - (p > 0 ? p * Math.log(p) : 0);
      }, 0);
      spectrum.push(entropy / Math.log(numBoxes) || 1.0);
    } else {
      const moment = probabilities.reduce((sum, p) => {
        return sum + Math.pow(p, q);
      }, 0);
      spectrum.push(moment > 0 ? Math.log(moment) / ((q - 1) * Math.log(numBoxes)) || 1.0 : 1.0);
    }
  }

  return spectrum;
}

export function hurstExponent(data: number[], maxLag: number = 20): number {
  if (data.length < maxLag * 4) return 0.5;

  const lags: number[] = [];
  const rsValues: number[] = [];

  for (let lag = 2; lag <= maxLag; lag++) {
    const numSegments = Math.floor(data.length / lag);
    let totalRS = 0;

    for (let seg = 0; seg < numSegments; seg++) {
      const start = seg * lag;
      const end = start + lag;
      const segment = data.slice(start, end);

      const mean = segment.reduce((a, b) => a + b, 0) / lag;
      const adjusted = segment.map((x) => x - mean);

      let maxDev = -Infinity;
      let minDev = Infinity;
      let cumulative = 0;
      for (const val of adjusted) {
        cumulative += val;
        maxDev = Math.max(maxDev, cumulative);
        minDev = Math.min(minDev, cumulative);
      }
      const range = maxDev - minDev;

      const variance = adjusted.reduce((a, b) => a + b * b, 0) / lag;
      const stdDev = Math.sqrt(variance);

      if (stdDev > 0) {
        totalRS += range / stdDev;
      }
    }

    if (numSegments > 0) {
      lags.push(Math.log(lag));
      rsValues.push(Math.log(totalRS / numSegments));
    }
  }

  return linearRegressionSlope(lags, rsValues);
}

export function extractFractalFeatures(data: number[]): FractalFeatures {
  const normalizedData = normalizeData(data);

  return {
    boxDimension: boxCountingDimension(normalizedData),
    informationDimension: informationDimension(normalizedData),
    correlationDimension: correlationDimension(normalizedData),
    lacunarity: lacunarity(normalizedData),
    multifractalSpectrum: multifractalSpectrum(normalizedData),
    hurstExponent: hurstExponent(normalizedData),
  };
}

export function extractStatisticalFeatures(data: number[]): StatisticalFeatures {
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;

  const squaredDiffs = data.map((x) => Math.pow(x - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(variance);

  const cubedDiffs = data.map((x) => Math.pow(x - mean, 3));
  const skewness = cubedDiffs.reduce((a, b) => a + b, 0) / (n * Math.pow(stdDev, 3));

  const fourthDiffs = data.map((x) => Math.pow(x - mean, 4));
  const kurtosis = fourthDiffs.reduce((a, b) => a + b, 0) / (n * Math.pow(variance, 2)) - 3;

  const rms = Math.sqrt(data.reduce((a, b) => a + b * b, 0) / n);
  const maxAbs = Math.max(...data.map(Math.abs));
  const crestFactor = rms > 0 ? maxAbs / rms : 0;
  const meanAbs = data.reduce((a, b) => a + Math.abs(b), 0) / n;
  const impulseFactor = meanAbs > 0 ? maxAbs / meanAbs : 0;
  const marginFactor = meanAbs > 0 ? maxAbs / Math.pow(meanAbs, 2) : 0;

  return {
    mean,
    variance,
    skewness,
    kurtosis,
    rms,
    crestFactor,
    impulseFactor,
    marginFactor,
  };
}

export function extractPowerSpectrumFeatures(
  points: PowerSpectrumPoint[]
): { fractal: FractalFeatures; statistical: StatisticalFeatures } {
  const amplitudes = points.map((p) => p.amplitude);
  return {
    fractal: extractFractalFeatures(amplitudes),
    statistical: extractStatisticalFeatures(amplitudes),
  };
}

function normalizeData(data: number[]): number[] {
  if (data.length === 0) return [];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data.map((x) => (x - min) / range);
}

function linearRegressionSlope(x: number[], y: number[]): number {
  if (x.length < 2 || x.length !== y.length) return 1.0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) return 1.0;

  return (n * sumXY - sumX * sumY) / denominator;
}
