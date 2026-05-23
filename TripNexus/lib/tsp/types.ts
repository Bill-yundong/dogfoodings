import { Location, TransportMode, OptimizationGoal, AlgorithmProgress, AlgorithmType } from '@/lib/types';

export type { AlgorithmType, OptimizationGoal };

export interface DistanceMatrix {
  locations: Location[];
  distances: number[][];
  durations: number[][];
  costs: number[][];
}

export interface AlgorithmConfig {
  maxIterations: number;
  populationSize?: number;
  mutationRate?: number;
  crossoverRate?: number;
  initialTemperature?: number;
  coolingRate?: number;
  antCount?: number;
  evaporationRate?: number;
  alpha?: number;
  beta?: number;
}

export interface FitnessWeights {
  distance: number;
  time: number;
  cost: number;
}

export interface TSPState {
  bestPath: Location[];
  bestFitness: number;
  currentPath: Location[];
  currentFitness: number;
  iteration: number;
  progress: AlgorithmProgress;
}

export interface AlgorithmResult {
  path: Location[];
  fitness: number;
  distance: number;
  duration: number;
  cost: number;
  iterations: number;
  timeTaken: number;
}

export interface PathEvaluator {
  evaluate: (path: Location[]) => number;
  getDistance: (path: Location[]) => number;
  getDuration: (path: Location[]) => number;
  getCost: (path: Location[]) => number;
}

export const DEFAULT_CONFIG: Record<string, AlgorithmConfig> = {
  nearest_neighbor: {
    maxIterations: 1,
  },
  genetic: {
    maxIterations: 500,
    populationSize: 100,
    mutationRate: 0.1,
    crossoverRate: 0.8,
  },
  simulated_annealing: {
    maxIterations: 10000,
    initialTemperature: 1000,
    coolingRate: 0.995,
  },
  ant_colony: {
    maxIterations: 100,
    antCount: 50,
    evaporationRate: 0.5,
    alpha: 1,
    beta: 2,
  },
};

export const getFitnessWeights = (goal: OptimizationGoal): FitnessWeights => {
  switch (goal) {
    case 'distance':
      return { distance: 1, time: 0, cost: 0 };
    case 'time':
      return { distance: 0, time: 1, cost: 0 };
    case 'cost':
      return { distance: 0, time: 0, cost: 1 };
    case 'balanced':
      return { distance: 0.4, time: 0.3, cost: 0.3 };
    default:
      return { distance: 0.4, time: 0.3, cost: 0.3 };
  }
};
