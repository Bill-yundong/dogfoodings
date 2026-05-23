import { Location, TransportMode } from '@/lib/types';
import { calculateDistance, calculateTravelTime, calculateTravelCost } from '@/lib/utils/helpers';
import { DistanceMatrix } from './types';

export const buildDistanceMatrix = (
  locations: Location[],
  transportMode: TransportMode
): DistanceMatrix => {
  const n = locations.length;
  const distances: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  const durations: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  const costs: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
        durations[i][j] = 0;
        costs[i][j] = 0;
      } else {
        const distance = calculateDistance(
          locations[i].coordinates,
          locations[j].coordinates
        );
        distances[i][j] = distance;
        durations[i][j] = calculateTravelTime(distance, transportMode);
        costs[i][j] = calculateTravelCost(distance, transportMode);
      }
    }
  }

  return { locations, distances, durations, costs };
};

export const getPathDistance = (
  path: Location[],
  matrix: DistanceMatrix
): number => {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const fromIdx = matrix.locations.findIndex(l => l.id === path[i].id);
    const toIdx = matrix.locations.findIndex(l => l.id === path[i + 1].id);
    if (fromIdx !== -1 && toIdx !== -1) {
      total += matrix.distances[fromIdx][toIdx];
    }
  }
  return total;
};

export const getPathDuration = (
  path: Location[],
  matrix: DistanceMatrix
): number => {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const fromIdx = matrix.locations.findIndex(l => l.id === path[i].id);
    const toIdx = matrix.locations.findIndex(l => l.id === path[i + 1].id);
    if (fromIdx !== -1 && toIdx !== -1) {
      total += matrix.durations[fromIdx][toIdx];
    }
  }
  total += path.reduce((sum, loc) => sum + loc.duration, 0);
  return total;
};

export const getPathCost = (
  path: Location[],
  matrix: DistanceMatrix
): number => {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const fromIdx = matrix.locations.findIndex(l => l.id === path[i].id);
    const toIdx = matrix.locations.findIndex(l => l.id === path[i + 1].id);
    if (fromIdx !== -1 && toIdx !== -1) {
      total += matrix.costs[fromIdx][toIdx];
    }
  }
  return total;
};

export const normalizeMatrix = (matrix: number[][]): number[][] => {
  const n = matrix.length;
  const result: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  let max = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      max = Math.max(max, matrix[i][j]);
    }
  }
  if (max === 0) return matrix;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      result[i][j] = matrix[i][j] / max;
    }
  }
  return result;
};
