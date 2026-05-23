import { Location, OptimizationGoal } from '@/lib/types';
import { DistanceMatrix, FitnessWeights, PathEvaluator } from './types';
import { getFitnessWeights } from './types';
import { getPathDistance, getPathDuration, getPathCost, normalizeMatrix } from './distance-matrix';

export class FitnessEvaluator implements PathEvaluator {
  private matrix: DistanceMatrix;
  private weights: FitnessWeights;
  private normalizedDistances: number[][];
  private normalizedDurations: number[][];
  private normalizedCosts: number[][];

  constructor(matrix: DistanceMatrix, goal: OptimizationGoal) {
    this.matrix = matrix;
    this.weights = getFitnessWeights(goal);
    this.normalizedDistances = normalizeMatrix(matrix.distances);
    this.normalizedDurations = normalizeMatrix(matrix.durations);
    this.normalizedCosts = normalizeMatrix(matrix.costs);
  }

  evaluate(path: Location[]): number {
    if (path.length < 2) return Infinity;

    let distanceScore = 0;
    let timeScore = 0;
    let costScore = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const fromIdx = this.matrix.locations.findIndex(l => l.id === path[i].id);
      const toIdx = this.matrix.locations.findIndex(l => l.id === path[i + 1].id);
      
      if (fromIdx === -1 || toIdx === -1) continue;

      distanceScore += this.normalizedDistances[fromIdx][toIdx];
      timeScore += this.normalizedDurations[fromIdx][toIdx];
      costScore += this.normalizedCosts[fromIdx][toIdx];
    }

    const penalty = this.calculateConstraintPenalty(path);
    const rawFitness = 
      this.weights.distance * distanceScore +
      this.weights.time * timeScore +
      this.weights.cost * costScore;

    return rawFitness * (1 + penalty);
  }

  private calculateConstraintPenalty(path: Location[]): number {
    let penalty = 0;

    for (const loc of path) {
      if (loc.constraints) {
        for (const constraint of loc.constraints) {
          if (constraint.type === 'must_visit') {
            continue;
          }
          if (constraint.type === 'avoid') {
            penalty += 10;
          }
        }
      }
      if (loc.priority === 1) {
        penalty -= 0.1;
      }
    }

    return Math.max(0, penalty);
  }

  getDistance(path: Location[]): number {
    return getPathDistance(path, this.matrix);
  }

  getDuration(path: Location[]): number {
    return getPathDuration(path, this.matrix);
  }

  getCost(path: Location[]): number {
    return getPathCost(path, this.matrix);
  }

  updateWeights(weights: Partial<FitnessWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }
}

export const calculateFitness = (
  path: Location[],
  matrix: DistanceMatrix,
  goal: OptimizationGoal
): number => {
  const evaluator = new FitnessEvaluator(matrix, goal);
  return evaluator.evaluate(path);
};

export const comparePaths = (
  path1: Location[],
  path2: Location[],
  matrix: DistanceMatrix,
  goal: OptimizationGoal
): number => {
  const fit1 = calculateFitness(path1, matrix, goal);
  const fit2 = calculateFitness(path2, matrix, goal);
  return fit1 - fit2;
};
