import { Location, OptimizationGoal } from '@/lib/types';
import { shuffleArray, clamp } from '@/lib/utils/helpers';
import { DistanceMatrix, AlgorithmConfig, AlgorithmResult } from '../types';
import { FitnessEvaluator } from '../fitness';

export class GeneticSolver {
  private matrix: DistanceMatrix;
  private evaluator: FitnessEvaluator;
  private config: Required<AlgorithmConfig>;
  private population: Location[][];
  private populationSize: number;
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
      maxIterations: 500,
      populationSize: 100,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      ...config,
    } as Required<AlgorithmConfig>;
    this.populationSize = this.config.populationSize;
    this.population = [];
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

    this.initializePopulation();
    this.evaluatePopulation();

    let stagnationCount = 0;
    const maxStagnation = 50;

    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      const newPopulation: Location[][] = [];

      while (newPopulation.length < this.populationSize) {
        const parent1 = this.tournamentSelection();
        const parent2 = this.tournamentSelection();

        if (Math.random() < this.config.crossoverRate) {
          const [child1, child2] = this.crossover(parent1, parent2);
          newPopulation.push(this.mutate(child1));
          if (newPopulation.length < this.populationSize) {
            newPopulation.push(this.mutate(child2));
          }
        } else {
          newPopulation.push([...parent1]);
          if (newPopulation.length < this.populationSize) {
            newPopulation.push([...parent2]);
          }
        }
      }

      this.population = newPopulation;
      const prevBest = this.bestFitness;
      this.evaluatePopulation();

      if (this.bestFitness >= prevBest) {
        stagnationCount++;
      } else {
        stagnationCount = 0;
      }

      if (stagnationCount >= maxStagnation) {
        break;
      }

      const progress = iteration / this.config.maxIterations;
      onProgress?.(iteration + 1, progress, this.bestFitness);

      if (iteration % 10 === 0) {
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

  private initializePopulation(): void {
    const locations = this.matrix.locations;
    this.population = [];

    this.population.push([...locations]);

    const mustVisitFirst = locations
      .filter(l => l.constraints?.some(c => c.type === 'must_visit'))
      .sort((a, b) => a.priority - b.priority);
    if (mustVisitFirst.length > 0) {
      const ordered = [...mustVisitFirst, ...locations.filter(l => 
        !mustVisitFirst.some(mv => mv.id === l.id)
      )];
      this.population.push(ordered);
    }

    for (let i = this.population.length; i < this.populationSize; i++) {
      this.population.push(this.createRandomIndividual());
    }
  }

  private createRandomIndividual(): Location[] {
    const locations = [...this.matrix.locations];
    return shuffleArray(locations);
  }

  private evaluatePopulation(): void {
    for (const individual of this.population) {
      const fitness = this.evaluator.evaluate(individual);
      if (fitness < this.bestFitness) {
        this.bestFitness = fitness;
        this.bestPath = [...individual];
      }
    }
  }

  private tournamentSelection(): Location[] {
    const tournamentSize = 5;
    let best: Location[] | null = null;
    let bestFitness = Infinity;

    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * this.populationSize);
      const individual = this.population[idx];
      const fitness = this.evaluator.evaluate(individual);

      if (fitness < bestFitness) {
        bestFitness = fitness;
        best = individual;
      }
    }

    return best ? [...best] : this.createRandomIndividual();
  }

  private crossover(parent1: Location[], parent2: Location[]): [Location[], Location[]] {
    const n = parent1.length;
    const start = Math.floor(Math.random() * n);
    const end = start + Math.floor(Math.random() * (n - start));

    const child1: Location[] = Array(n).fill(null);
    const child2: Location[] = Array(n).fill(null);

    for (let i = start; i <= end; i++) {
      child1[i] = parent1[i];
      child2[i] = parent2[i];
    }

    this.fillRemaining(child1, parent2, end + 1);
    this.fillRemaining(child2, parent1, end + 1);

    return [child1, child2];
  }

  private fillRemaining(child: Location[], parent: Location[], startPos: number): void {
    const n = parent.length;
    const used = new Set(child.filter(l => l).map(l => l.id));
    let pos = startPos % n;

    for (const loc of parent) {
      if (!used.has(loc.id)) {
        while (child[pos] !== null) {
          pos = (pos + 1) % n;
        }
        child[pos] = loc;
        used.add(loc.id);
      }
    }
  }

  private mutate(individual: Location[]): Location[] {
    if (Math.random() > this.config.mutationRate) {
      return individual;
    }

    const n = individual.length;
    const mutationType = Math.random();

    if (mutationType < 0.4) {
      const i = Math.floor(Math.random() * n);
      const j = Math.floor(Math.random() * n);
      [individual[i], individual[j]] = [individual[j], individual[i]];
    } else if (mutationType < 0.7) {
      const i = Math.floor(Math.random() * n);
      const j = i + Math.floor(Math.random() * (n - i));
      const segment = individual.slice(i, j + 1).reverse();
      individual.splice(i, j - i + 1, ...segment);
    } else {
      const i = Math.floor(Math.random() * n);
      const j = Math.floor(Math.random() * n);
      const [removed] = individual.splice(i, 1);
      individual.splice(j, 0, removed);
    }

    return individual;
  }

  private localSearch(path: Location[]): Location[] {
    let best = [...path];
    let improved = true;
    let iterations = 0;

    while (improved && iterations < 50) {
      improved = false;
      iterations++;

      for (let i = 0; i < best.length - 1; i++) {
        for (let j = i + 1; j < best.length; j++) {
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

export const solveGenetic = async (
  matrix: DistanceMatrix,
  goal: OptimizationGoal,
  onProgress?: (iteration: number, progress: number, bestFitness: number) => void
): Promise<AlgorithmResult> => {
  const solver = new GeneticSolver(matrix, goal);
  return solver.solve(onProgress);
};
