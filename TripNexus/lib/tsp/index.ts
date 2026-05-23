export * from './types';
export * from './distance-matrix';
export * from './fitness';
export * from './algorithms/nearest-neighbor';
export * from './algorithms/genetic';
export * from './algorithms/simulated-annealing';
export * from './algorithms/ant-colony';
export * from './optimizer';

import { TSPOptimizer, optimizePath } from './optimizer';
import { buildDistanceMatrix } from './distance-matrix';
import { FitnessEvaluator } from './fitness';
import type { TSPSolveRequest } from '@/lib/types';
import type { OptimizationGoal } from './types';

export const TSP = {
  createOptimizer: (request: TSPSolveRequest) => new TSPOptimizer(request),
  optimize: optimizePath,
  buildDistanceMatrix,
  createEvaluator: (matrix: ReturnType<typeof buildDistanceMatrix>, goal: OptimizationGoal) => new FitnessEvaluator(matrix, goal),
};

export default TSP;
