import { Location, OptimizationGoal } from '@/lib/types';
import { shuffleArray } from '@/lib/utils/helpers';
import { DistanceMatrix, AlgorithmConfig, AlgorithmResult } from '../types';
import { FitnessEvaluator } from '../fitness';

export class NearestNeighborSolver {
  private matrix: DistanceMatrix;
  private evaluator: FitnessEvaluator;
  private config: AlgorithmConfig;

  constructor(
    matrix: DistanceMatrix,
    goal: OptimizationGoal,
    config?: Partial<AlgorithmConfig>
  ) {
    this.matrix = matrix;
    this.evaluator = new FitnessEvaluator(matrix, goal);
    this.config = {
      maxIterations: 1,
      ...config,
    };
  }

  async solve(
    onProgress?: (iteration: number, progress: number) => void
  ): Promise<AlgorithmResult> {
    const startTime = Date.now();
    const locations = this.matrix.locations;
    const n = locations.length;

    if (n < 2) {
      return {
        path: locations,
        fitness: 0,
        distance: 0,
        duration: locations.reduce((sum, l) => sum + l.duration, 0),
        cost: 0,
        iterations: 0,
        timeTaken: 0,
      };
    }

    let bestPath: Location[] = [];
    let bestFitness = Infinity;

    for (let startIdx = 0; startIdx < Math.min(n, 3); startIdx++) {
      const path = this.solveFromStart(startIdx);
      const fitness = this.evaluator.evaluate(path);

      if (fitness < bestFitness) {
        bestFitness = fitness;
        bestPath = path;
      }

      onProgress?.(startIdx + 1, (startIdx + 1) / Math.min(n, 3));
      await this.yieldControl();
    }

    const improvedPath = this.improvePath(bestPath);

    return {
      path: improvedPath.map((loc, idx) => ({ ...loc, orderIndex: idx })),
      fitness: this.evaluator.evaluate(improvedPath),
      distance: this.evaluator.getDistance(improvedPath),
      duration: this.evaluator.getDuration(improvedPath),
      cost: this.evaluator.getCost(improvedPath),
      iterations: this.config.maxIterations,
      timeTaken: Date.now() - startTime,
    };
  }

  private solveFromStart(startIdx: number): Location[] {
    const locations = [...this.matrix.locations];
    const n = locations.length;
    const visited = new Set<number>();
    const path: Location[] = [];

    let currentIdx = startIdx;
    path.push(locations[currentIdx]);
    visited.add(currentIdx);

    while (visited.size < n) {
      let nearestIdx = -1;
      let nearestDist = Infinity;

      for (let i = 0; i < n; i++) {
        if (visited.has(i)) continue;

        const dist = this.matrix.distances[currentIdx][i];
        const priorityBonus = locations[i].priority === 1 ? 0.7 : locations[i].priority === 2 ? 0.85 : 1;
        const adjustedDist = dist * priorityBonus;

        if (adjustedDist < nearestDist) {
          nearestDist = adjustedDist;
          nearestIdx = i;
        }
      }

      if (nearestIdx === -1) break;

      path.push(locations[nearestIdx]);
      visited.add(nearestIdx);
      currentIdx = nearestIdx;
    }

    return path;
  }

  private improvePath(path: Location[]): Location[] {
    let bestPath = [...path];
    let improved = true;
    let iterations = 0;

    while (improved && iterations < 100) {
      improved = false;
      iterations++;

      for (let i = 1; i < bestPath.length - 2; i++) {
        for (let j = i + 1; j < bestPath.length - 1; j++) {
          const newPath = this.twoOptSwap(bestPath, i, j);
          const oldFitness = this.evaluator.evaluate(bestPath);
          const newFitness = this.evaluator.evaluate(newPath);

          if (newFitness < oldFitness) {
            bestPath = newPath;
            improved = true;
          }
        }
      }
    }

    return bestPath;
  }

  private twoOptSwap(path: Location[], i: number, j: number): Location[] {
    const newPath = [...path];
    const segment = newPath.slice(i, j + 1).reverse();
    newPath.splice(i, j - i + 1, ...segment);
    return newPath;
  }

  private async yieldControl(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}

export const solveNearestNeighbor = async (
  matrix: DistanceMatrix,
  goal: OptimizationGoal,
  onProgress?: (iteration: number, progress: number) => void
): Promise<AlgorithmResult> => {
  const solver = new NearestNeighborSolver(matrix, goal);
  return solver.solve(onProgress);
};
