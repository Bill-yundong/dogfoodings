import { NoiseSample, KrigingResult } from '../types';

export const variogram = (h: number, nugget: number, sill: number, range: number): number => {
  if (h === 0) return 0;
  return nugget + (sill - nugget) * (1 - Math.exp(-h / range));
};

export const gaussianVariogram = (h: number, nugget: number, sill: number, range: number): number => {
  if (h === 0) return 0;
  return nugget + (sill - nugget) * (1 - Math.exp(-(h * h) / (range * range)));
};

export const sphericalVariogram = (h: number, nugget: number, sill: number, range: number): number => {
  if (h === 0) return 0;
  if (h >= range) return sill;
  return nugget + (sill - nugget) * ((3 * h) / (2 * range) - (h * h * h) / (2 * range * range * range));
};

export const exponentialVariogram = (h: number, nugget: number, sill: number, range: number): number => {
  if (h === 0) return 0;
  return nugget + (sill - nugget) * (1 - Math.exp(-3 * h / range));
};

export const distance2D = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

export const estimateVariogramParameters = (
  samples: NoiseSample[]
): { nugget: number; sill: number; range: number } => {
  if (samples.length < 2) {
    return { nugget: 0.1, sill: 10, range: 50 };
  }

  let maxDist = 0;
  let maxValue = -Infinity;
  let minValue = Infinity;

  for (let i = 0; i < samples.length; i++) {
    maxValue = Math.max(maxValue, samples[i].value);
    minValue = Math.min(minValue, samples[i].value);
    for (let j = i + 1; j < samples.length; j++) {
      const dist = distance2D(samples[i].x, samples[i].y, samples[j].x, samples[j].y);
      maxDist = Math.max(maxDist, dist);
    }
  }

  const nugget = 0.5;
  const sill = maxValue - minValue;
  const range = maxDist * 0.5;

  return { nugget, sill, range };
};

export const createCovarianceMatrix = (
  samples: NoiseSample[],
  variogramFn: (h: number) => number
): number[][] => {
  const n = samples.length;
  const matrix: number[][] = [];

  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      const dist = distance2D(samples[i].x, samples[i].y, samples[j].x, samples[j].y);
      matrix[i][j] = variogramFn(dist);
    }
    matrix[i][n] = samples[i].value;
  }

  return matrix;
};

export const solveLinearSystem = (matrix: number[][]): number[] | null => {
  const n = matrix.length;

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k;
      }
    }

    [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];

    if (Math.abs(matrix[i][i]) < 1e-10) {
      return null;
    }

    for (let k = i + 1; k < n; k++) {
      const factor = matrix[k][i] / matrix[i][i];
      for (let j = i; j <= n; j++) {
        matrix[k][j] -= factor * matrix[i][j];
      }
    }
  }

  const solution: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    solution[i] = matrix[i][n] / matrix[i][i];
    for (let k = i - 1; k >= 0; k--) {
      matrix[k][n] -= matrix[k][i] * solution[i];
    }
  }

  return solution;
};

export const krigingInterpolate = (
  x: number,
  y: number,
  samples: NoiseSample[],
  variogramFn: (h: number) => number,
  weights?: number[]
): KrigingResult => {
  const n = samples.length;

  if (n === 0) {
    return { x, y, value: 0, variance: 0 };
  }

  if (n === 1) {
    return { x, y, value: samples[0].value, variance: 0 };
  }

  const distances: number[] = [];
  for (let i = 0; i < n; i++) {
    distances.push(distance2D(x, y, samples[i].x, samples[i].y));
  }

  if (!weights) {
    const matrix = createCovarianceMatrix(samples, variogramFn);
    weights = solveLinearSystem(matrix);
    
    if (!weights) {
      let totalWeight = 0;
      weights = distances.map(d => {
        const w = 1 / (d + 1e-10);
        totalWeight += w;
        return w;
      });
      weights = weights.map(w => w / totalWeight);
    }
  }

  let interpolatedValue = 0;
  for (let i = 0; i < n; i++) {
    interpolatedValue += weights[i] * samples[i].value;
  }

  let variance = 0;
  for (let i = 0; i < n; i++) {
    variance += weights[i] * variogramFn(distances[i]);
  }

  return { x, y, value: interpolatedValue, variance };
};

export const interpolateGrid = (
  samples: NoiseSample[],
  gridWidth: number,
  gridHeight: number,
  cellSize: number = 5
): number[][] => {
  const cols = Math.ceil(gridWidth / cellSize);
  const rows = Math.ceil(gridHeight / cellSize);
  const grid: number[][] = Array(rows).fill(null).map(() => Array(cols).fill(0));

  if (samples.length === 0) return grid;

  const { nugget, sill, range } = estimateVariogramParameters(samples);
  const variogramFn = (h: number) => sphericalVariogram(h, nugget, sill, range);

  const matrix = createCovarianceMatrix(samples, variogramFn);
  const weights = solveLinearSystem(matrix);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellSize + cellSize / 2;
      const y = row * cellSize + cellSize / 2;
      const result = krigingInterpolate(x, y, samples, variogramFn, weights || undefined);
      grid[row][col] = Math.max(0, result.value);
    }
  }

  return grid;
};
