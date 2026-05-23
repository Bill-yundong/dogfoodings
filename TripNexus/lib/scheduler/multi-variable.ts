import { generateId } from '@/lib/utils/helpers';
import { MultiVariableScanConfig, ScanResult } from './types';

export class MultiVariableScanner {
  private config: MultiVariableScanConfig;
  private results: ScanResult[] = [];

  constructor(config: MultiVariableScanConfig) {
    this.config = config;
  }

  generateParameterCombinations(): Record<string, unknown>[] {
    const { variables } = this.config;
    if (!variables) return [];
    const keys = Object.keys(variables);
    const combinations: Record<string, unknown>[] = [];

    const generate = (index: number, current: Record<string, unknown>): void => {
      if (index >= keys.length) {
        combinations.push({ ...current });
        return;
      }

      const key = keys[index];
      const values = variables[key] as unknown[];

      for (const value of values) {
        generate(index + 1, { ...current, [key]: value });
      }
    };

    generate(0, {});
    return combinations;
  }

  async scan(
    executeFn: (params: Record<string, unknown>) => Promise<unknown>,
    evaluateFn: (result: unknown) => number,
    onProgress?: (completed: number, total: number, currentResult: ScanResult) => void
  ): Promise<ScanResult[]> {
    const combinations = this.generateParameterCombinations();
    const total = combinations.length;

    for (let i = 0; i < combinations.length; i++) {
      const params = combinations[i];
      try {
        const result = await executeFn({
          ...this.config.baseRequest,
          ...params,
        });
        const score = evaluateFn(result);

        const tspResult = result as { totalDistance?: number; totalTime?: number };
        const scanResult: ScanResult = {
          id: generateId(),
          params,
          parameters: {
            algorithm: (params.algorithm as string) || 'nearest_neighbor',
            goal: (params.optimizationGoal as string) || 'balanced',
            ...params,
          },
          result,
          score,
          rank: this.results.length + 1,
          totalDistance: tspResult.totalDistance || 0,
          totalTime: tspResult.totalTime || 0,
          fitnessScore: score,
        };

        this.results.push(scanResult);
        onProgress?.(i + 1, total, scanResult);
      } catch (error) {
        console.warn(`Parameter scan failed for ${JSON.stringify(params)}:`, error);
      }
    }

    return this.getTopResults();
  }

  getTopResults(k?: number): ScanResult[] {
    const topK = k ?? this.config.topK;
    return [...this.results]
      .sort((a, b) => a.score - b.score)
      .slice(0, topK);
  }

  getAllResults(): ScanResult[] {
    return [...this.results];
  }

  getBestResult(): ScanResult | null {
    if (this.results.length === 0) return null;
    return this.results.reduce((best, current) =>
      current.score < best.score ? current : best
    );
  }

  getParameterImpact(paramName: string): { value: unknown; avgScore: number }[] {
    const grouped = new Map<unknown, number[]>();

    for (const result of this.results) {
      const value = result.params[paramName];
      if (!grouped.has(value)) {
        grouped.set(value, []);
      }
      grouped.get(value)!.push(result.score);
    }

    return Array.from(grouped.entries()).map(([value, scores]) => ({
      value,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));
  }
}

export const createMultiVariableScan = (
  config: MultiVariableScanConfig
): MultiVariableScanner => {
  return new MultiVariableScanner(config);
};
