export const mean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

export const variance = (values: number[]): number => {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / (values.length - 1);
};

export const stdDev = (values: number[]): number => {
  return Math.sqrt(variance(values));
};

export const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
};

export const ewma = (values: number[], alpha: number): number => {
  if (values.length === 0) return 0;
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
};

export const linearRegression = (
  values: number[]
): { slope: number; intercept: number; rSquared: number } => {
  if (values.length < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);

  let ssXY = 0;
  let ssXX = 0;

  for (let i = 0; i < n; i++) {
    ssXY += (i - xMean) * (values[i] - yMean);
    ssXX += Math.pow(i - xMean, 2);
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = yMean - slope * xMean;

  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssTotal += Math.pow(values[i] - yMean, 2);
    ssResidual += Math.pow(values[i] - predicted, 2);
  }

  const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

  return { slope, intercept, rSquared };
};

export const predictNext = (
  values: number[],
  steps: number,
  alpha: number = 0.3
): { predictions: number[]; confidence: number } => {
  if (values.length < 3) {
    return {
      predictions: Array(steps).fill(mean(values)),
      confidence: 0.5,
    };
  }

  const smoothed = values.map((_, i) =>
    ewma(values.slice(0, i + 1), alpha)
  );
  const regression = linearRegression(smoothed);
  const lastValue = smoothed[smoothed.length - 1];

  const predictions: number[] = [];
  for (let i = 1; i <= steps; i++) {
    const trend = regression.slope * (smoothed.length + i - 1) + regression.intercept;
    const ewmaPred = alpha * trend + (1 - alpha) * lastValue;
    predictions.push(ewmaPred);
  }

  const confidence = Math.max(0.3, Math.min(0.95, regression.rSquared));

  return { predictions, confidence };
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const formatMs = (ms: number): string => {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const formatPercent = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatMbps = (mbps: number): string => {
  if (mbps < 1) return `${(mbps * 1000).toFixed(0)}kbps`;
  return `${mbps.toFixed(1)}Mbps`;
};

export const generateId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
