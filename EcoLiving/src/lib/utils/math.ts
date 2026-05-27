export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  return values.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / values.length;
}

export function stdDev(values: number[]): number {
  return Math.sqrt(variance(values));
}

export function skewness(values: number[]): number {
  if (values.length < 3) return 0;
  const m = mean(values);
  const s = stdDev(values);
  if (s === 0) return 0;
  const n = values.length;
  const sum = values.reduce((acc, val) => acc + Math.pow((val - m) / s, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

export function kurtosis(values: number[]): number {
  if (values.length < 4) return 0;
  const m = mean(values);
  const s = stdDev(values);
  if (s === 0) return 0;
  const n = values.length;
  const sum = values.reduce((acc, val) => acc + Math.pow((val - m) / s, 4), 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - 
         (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
}

export function min(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.min(...values);
}

export function max(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function slope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += Math.pow(a[i], 2);
    normB += Math.pow(b[i], 2);
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

export function normalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const minVal = min(values);
  const maxVal = max(values);
  const range = maxVal - minVal;
  if (range === 0) return values.map(() => 0.5);
  return values.map(v => (v - minVal) / range);
}

export function fft(values: number[]): { magnitude: number[]; phase: number[] } {
  const n = values.length;
  if (n === 0) return { magnitude: [], phase: [] };
  
  const paddedLength = Math.pow(2, Math.ceil(Math.log2(n)));
  const padded = [...values, ...Array(paddedLength - n).fill(0)];
  
  const result = recursiveFFT(padded);
  const magnitude = result.slice(0, n / 2).map(c => Math.sqrt(c.re * c.re + c.im * c.im));
  const phase = result.slice(0, n / 2).map(c => Math.atan2(c.im, c.re));
  
  return { magnitude, phase };
}

function recursiveFFT(a: number[]): { re: number; im: number }[] {
  const n = a.length;
  if (n === 1) {
    return [{ re: a[0], im: 0 }];
  }
  
  const even: number[] = [];
  const odd: number[] = [];
  for (let i = 0; i < n; i += 2) {
    even.push(a[i]);
    odd.push(a[i + 1]);
  }
  
  const yEven = recursiveFFT(even);
  const yOdd = recursiveFFT(odd);
  const result: { re: number; im: number }[] = Array(n);
  
  for (let k = 0; k < n / 2; k++) {
    const omegaK = {
      re: Math.cos(-2 * Math.PI * k / n),
      im: Math.sin(-2 * Math.PI * k / n),
    };
    const oddTerm = {
      re: omegaK.re * yOdd[k].re - omegaK.im * yOdd[k].im,
      im: omegaK.re * yOdd[k].im + omegaK.im * yOdd[k].re,
    };
    result[k] = {
      re: yEven[k].re + oddTerm.re,
      im: yEven[k].im + oddTerm.im,
    };
    result[k + n / 2] = {
      re: yEven[k].re - oddTerm.re,
      im: yEven[k].im - oddTerm.im,
    };
  }
  
  return result;
}

export function movingAverage(values: number[], window: number): number[] {
  if (values.length < window) return values;
  const result: number[] = [];
  let sum = values.slice(0, window).reduce((a, b) => a + b, 0);
  result.push(sum / window);
  for (let i = window; i < values.length; i++) {
    sum = sum - values[i - window] + values[i];
    result.push(sum / window);
  }
  return result;
}

export function exponentialMovingAverage(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

export function detectAnomalies(values: number[], threshold: number = 3): number[] {
  if (values.length < 4) return [];
  const m = mean(values);
  const s = stdDev(values);
  if (s === 0) return [];
  const anomalies: number[] = [];
  values.forEach((v, i) => {
    const zScore = Math.abs((v - m) / s);
    if (zScore > threshold) {
      anomalies.push(i);
    }
  });
  return anomalies;
}
