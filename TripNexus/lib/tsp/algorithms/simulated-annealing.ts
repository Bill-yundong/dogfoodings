import { Location, OptimizationGoal } from '@/lib/types';
import { shuffleArray, clamp } from '@/lib/utils/helpers';
import { DistanceMatrix, AlgorithmConfig, AlgorithmResult } from '../types';
import { FitnessEvaluator } from '../fitness';

export class SimulatedAnnealingSolver {
  private matrix: DistanceMatrix;
  private evaluator: FitnessEvaluator;
  private config: Required<AlgorithmConfig>;
  private currentPath: Location[];
  private currentFitness: number;
  private bestPath: Location[];
  private bestFitness: number;
  private temperature: number;

  constructor(
    matrix: DistanceMatrix,
    goal: OptimizationGoal,
    config?: Partial<AlgorithmConfig>
  ) {
    this.matrix = matrix;
    this.evaluator = new FitnessEvaluator(matrix, goal);
    this.config = {
      maxIterations: 10000,
      initialTemperature: 1000,
      coolingRate: 0.995,
      ...config,
    } as Required<AlgorithmConfig>;
    this.currentPath = [];
    this.currentFitness = Infinity;
    this.bestPath = [];
    this.bestFitness = Infinity;
    this.temperature = this.config.initialTemperature;
  }

  async solve(
    onProgress?: (iteration: number, progress: number, temperature: number, bestFitness: number) => void
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

    this.initializeSolution();
    let iteration = 0;

    while (this.temperature > 0.1 && iteration < this.config.maxIterations) {
      const neighbor = this.generateNeighbor();
      const neighborFitness = this.evaluator.evaluate(neighbor);
      const delta = neighborFitness - this.currentFitness;

      if (delta < 0 || this.shouldAccept(delta)) {
        this.currentPath = neighbor;
        this.currentFitness = neighborFitness;

        if (this.currentFitness < this.bestFitness) {
          this.bestFitness = this.currentFitness;
          this.bestPath = [...this.currentPath];
        }
      }

      this.temperature *= this.config.coolingRate;
      iteration++;

      if (iteration % 100 === 0) {
        const progress = iteration / this.config.maxIterations;
        onProgress?.(iteration, progress, this.temperature, this.bestFitness);
        await this.yieldControl();
      }
    }

    const finalPath = this.localSearch(this.bestPath);

    return {
      path: finalPath.map((loc, idx) => ({ ...loc, orderIndex: idx })),
      fitness: this.evaluator.evaluate(finalPath),
      distance: this.evaluator.getDistance(finalPath),
      duration: this.evaluator.getDuration(finalPath),
      cost: this.evaluator.getCost(finalPath),
      iterations: iteration,
      timeTaken: Date.now() - startTime,
    };
  }

  private initializeSolution(): void {
    const locations = [...this.matrix.locations];
    
    const mustVisit = locations.filter(l => 
      l.constraints?.some(c => c.type === 'must_visit')
    );
    const others = locations.filter(l => 
      !mustVisit.some(mv => mv.id === l.id)
    );
    
    this.currentPath = [...mustVisit, ...shuffleArray(others)];
    this.currentFitness = this.evaluator.evaluate(this.currentPath);
    this.bestPath = [...this.currentPath];
    this.bestFitness = this.currentFitness;
  }

  private generateNeighbor(): Location[] {
    const n = this.currentPath.length;
    const neighbor = [...this.currentPath];
    const moveType = Math.random();

    if (moveType < 0.3) {
      const i = Math.floor(Math.random() * n);
      const j = Math.floor(Math.random() * n);
      [neighbor[i], neighbor[j]] = [neighbor[j], neighbor[i]];
    } else if (moveType < 0.6) {
      const i = Math.floor(Math.random() * n);
      const j = i + Math.floor(Math.random() * (n - i));
      const segment = neighbor.slice(i, j + 1).reverse();
      neighbor.splice(i, j - i + 1, ...segment);
    } else if (moveType < 0.8) {
      const i = Math.floor(Math.random() * n);
      const j = Math.floor(Math.random() * n);
      const [removed] = neighbor.splice(i, 1);
      neighbor.splice(j, 0, removed);
    } else {
      const i = Math.floor(Math.random() * (n - 3));
      const j = i + 2;
      const k = Math.floor(Math.random() * (n - j)) + j;
      const segment = neighbor.slice(i, j + 1);
      neighbor.splice(i, j - i + 1);
      neighbor.splice(k - (j - i), 0, ...segment);
    }

    return neighbor;
  }

  private shouldAccept(delta: number): boolean {
    const probability = Math.exp(-delta / this.temperature);
    return Math.random() < probability;
  }

  private localSearch(path: Location[]): Location[] {
    let best = [...path];
    let improved = true;
    let iterations = 0;

    while (improved && iterations < 100) {
      improved = false;
      iterations++;

      for (let i = 0; i < best.length - 2; i++) {
        for (let j = i + 2; j < best.length; j++) {
          const candidate = this.twoOpt(best, i, j);
          if (this.evaluator.evaluate(candidate) < this.evaluator.evaluate(best)) {
            best = candidate;
            improved = true;
          }
        }
      }
    }

    return best;
  }

  private twoOpt(path: Location[], i: number, j: number): Location[] {
    const newPath = [...path];
    const segment = newPath.slice(i, j + 1).reverse();
    newPath.splice(i, j - i + 1, ...segment);
    return newPath;
  }

  private async yieldControl(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}

export const solveSimulatedAnnealing = async (
  matrix: DistanceMatrix,
  goal: OptimizationGoal,
  onProgress?: (iteration: number, progress: number, temperature: number, bestFitness: number) => void
): Promise<AlgorithmResult> => {
  const solver = new SimulatedAnnealingSolver(matrix, goal);
  return solver.solve(onProgress);
};
