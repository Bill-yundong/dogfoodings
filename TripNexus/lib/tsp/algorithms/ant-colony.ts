import { Location, OptimizationGoal } from '@/lib/types';
import { shuffleArray } from '@/lib/utils/helpers';
import { DistanceMatrix, AlgorithmConfig, AlgorithmResult } from '../types';
import { FitnessEvaluator } from '../fitness';

export class AntColonySolver {
  private matrix: DistanceMatrix;
  private evaluator: FitnessEvaluator;
  private config: Required<AlgorithmConfig>;
  private pheromones: number[][];
  private heuristic: number[][];
  private bestPath: Location[];
  private bestFitness: number;

  constructor(
    matrix: DistanceMatrix,
    goal: OptimizationGoal,
    config?: Partial<AlgorithmConfig>
  ) {
    this.matrix = matrix;
    this.evaluator = new FitnessEvaluator(matrix, goal);
    this.config = {
      maxIterations: 100,
      antCount: 50,
      evaporationRate: 0.5,
      alpha: 1,
      beta: 2,
      ...config,
    } as Required<AlgorithmConfig>;
    this.pheromones = [];
    this.heuristic = [];
    this.bestPath = [];
    this.bestFitness = Infinity;
  }

  async solve(
    onProgress?: (iteration: number, progress: number, bestFitness: number) => void
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

    this.initializePheromones();
    this.initializeHeuristic();

    let stagnationCount = 0;
    const maxStagnation = 20;

    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      const solutions: Location[][] = [];
      const solutionFitness: number[] = [];

      for (let ant = 0; ant < this.config.antCount; ant++) {
        const solution = this.constructSolution();
        const fitness = this.evaluator.evaluate(solution);
        solutions.push(solution);
        solutionFitness.push(fitness);

        if (fitness < this.bestFitness) {
          this.bestFitness = fitness;
          this.bestPath = [...solution];
          stagnationCount = 0;
        }
      }

      this.updatePheromones(solutions, solutionFitness);

      stagnationCount++;
      if (stagnationCount >= maxStagnation) {
        this.reinitializePheromones();
        stagnationCount = 0;
      }

      const progress = iteration / this.config.maxIterations;
      onProgress?.(iteration + 1, progress, this.bestFitness);

      if (iteration % 5 === 0) {
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
      iterations: this.config.maxIterations,
      timeTaken: Date.now() - startTime,
    };
  }

  private initializePheromones(): void {
    const n = this.matrix.locations.length;
    const initialPheromone = 1.0;
    this.pheromones = Array(n).fill(null).map(() => Array(n).fill(initialPheromone));
  }

  private reinitializePheromones(): void {
    const n = this.matrix.locations.length;
    const maxPheromone = Math.max(...this.pheromones.flat());
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          this.pheromones[i][j] = 0.5 * maxPheromone + Math.random() * 0.5 * maxPheromone;
        }
      }
    }
  }

  private initializeHeuristic(): void {
    const n = this.matrix.locations.length;
    this.heuristic = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const distance = this.matrix.distances[i][j];
          const priority = this.matrix.locations[j].priority === 1 ? 1.5 : 
                          this.matrix.locations[j].priority === 2 ? 1.2 : 1;
          this.heuristic[i][j] = (1 / Math.max(distance, 0.001)) * priority;
        }
      }
    }
  }

  private constructSolution(): Location[] {
    const locations = this.matrix.locations;
    const n = locations.length;
    const visited = new Set<number>();
    const path: Location[] = [];

    let currentIdx = this.selectStartingPoint();
    path.push(locations[currentIdx]);
    visited.add(currentIdx);

    while (visited.size < n) {
      currentIdx = this.selectNextCity(currentIdx, visited);
      if (currentIdx === -1) break;
      path.push(locations[currentIdx]);
      visited.add(currentIdx);
    }

    return path;
  }

  private selectStartingPoint(): number {
    const locations = this.matrix.locations;
    const mustVisit = locations
      .map((loc, idx) => ({ loc, idx }))
      .filter(({ loc }) => loc.constraints?.some(c => c.type === 'must_visit'));

    if (mustVisit.length > 0) {
      return mustVisit[0].idx;
    }

    return Math.floor(Math.random() * locations.length);
  }

  private selectNextCity(currentIdx: number, visited: Set<number>): number {
    const n = this.matrix.locations.length;
    const probabilities: number[] = [];
    let total = 0;

    for (let j = 0; j < n; j++) {
      if (visited.has(j)) {
        probabilities.push(0);
        continue;
      }

      const pheromone = Math.pow(this.pheromones[currentIdx][j], this.config.alpha);
      const heuristic = Math.pow(this.heuristic[currentIdx][j], this.config.beta);
      const prob = pheromone * heuristic;
      probabilities.push(prob);
      total += prob;
    }

    if (total === 0) {
      for (let j = 0; j < n; j++) {
        if (!visited.has(j)) return j;
      }
      return -1;
    }

    const random = Math.random() * total;
    let cumulative = 0;
    for (let j = 0; j < n; j++) {
      cumulative += probabilities[j];
      if (random <= cumulative) {
        return j;
      }
    }

    for (let j = 0; j < n; j++) {
      if (!visited.has(j)) return j;
    }
    return -1;
  }

  private updatePheromones(solutions: Location[][], fitnesses: number[]): void {
    const n = this.matrix.locations.length;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          this.pheromones[i][j] *= (1 - this.config.evaporationRate);
        }
      }
    }

    const bestIdx = fitnesses.indexOf(Math.min(...fitnesses));
    const bestSolution = solutions[bestIdx];
    const bestFitness = fitnesses[bestIdx];
    const deposit = 1.0 / bestFitness;

    for (let i = 0; i < bestSolution.length - 1; i++) {
      const fromIdx = this.matrix.locations.findIndex(l => l.id === bestSolution[i].id);
      const toIdx = this.matrix.locations.findIndex(l => l.id === bestSolution[i + 1].id);
      if (fromIdx !== -1 && toIdx !== -1) {
        this.pheromones[fromIdx][toIdx] += deposit;
        this.pheromones[toIdx][fromIdx] += deposit;
      }
    }

    const eliteDeposit = 2.0 / this.bestFitness;
    for (let i = 0; i < this.bestPath.length - 1; i++) {
      const fromIdx = this.matrix.locations.findIndex(l => l.id === this.bestPath[i].id);
      const toIdx = this.matrix.locations.findIndex(l => l.id === this.bestPath[i + 1].id);
      if (fromIdx !== -1 && toIdx !== -1) {
        this.pheromones[fromIdx][toIdx] += eliteDeposit;
        this.pheromones[toIdx][fromIdx] += eliteDeposit;
      }
    }
  }

  private localSearch(path: Location[]): Location[] {
    let best = [...path];
    let improved = true;
    let iterations = 0;

    while (improved && iterations < 50) {
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

export const solveAntColony = async (
  matrix: DistanceMatrix,
  goal: OptimizationGoal,
  onProgress?: (iteration: number, progress: number, bestFitness: number) => void
): Promise<AlgorithmResult> => {
  const solver = new AntColonySolver(matrix, goal);
  return solver.solve(onProgress);
};
