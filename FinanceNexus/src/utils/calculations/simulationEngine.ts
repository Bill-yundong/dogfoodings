import type { SimulationConfig, SimulationResult, WorkerMessage } from '@/types';

const gaussianRandom = (mean: number = 0, stdDev: number = 1): number => {
  const u1 = Math.random();
  const u2 = Math.random();

  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  return mean + z * stdDev;
};

const runSingleSimulation = (config: SimulationConfig): number[] => {
  const {
    initialPrincipal,
    monthlyContribution,
    annualReturnRate,
    volatility,
    years,
  } = config;

  const monthlyRate = annualReturnRate / 12;
  const monthlyVolatility = volatility / Math.sqrt(12);
  const months = years * 12;

  const yearlyValues: number[] = [initialPrincipal];
  let currentValue = initialPrincipal;

  for (let month = 1; month <= months; month++) {
    const randomReturn = gaussianRandom(monthlyRate, monthlyVolatility);
    currentValue = currentValue * (1 + randomReturn) + monthlyContribution;

    if (month % 12 === 0) {
      yearlyValues.push(currentValue);
    }
  }

  return yearlyValues;
};

const calculatePercentiles = (
  values: number[],
  percentiles: number[]
): Record<number, number> => {
  const sorted = [...values].sort((a, b) => a - b);
  const result: Record<number, number> = {};

  for (const p of percentiles) {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    result[p] = sorted[Math.max(0, Math.min(sorted.length - 1, index))];
  }

  return result;
};

export const runCompoundInterestSimulation = (
  config: SimulationConfig,
  onProgress?: (progress: number) => void
): SimulationResult[] => {
  const { simulations, inflationRate, years } = config;

  const allResults: number[][] = [];

  for (let i = 0; i < simulations; i++) {
    const result = runSingleSimulation(config);
    allResults.push(result);

    if (onProgress && (i + 1) % Math.max(1, Math.floor(simulations / 100)) === 0) {
      onProgress((i + 1) / simulations);
    }
  }

  const yearlyResults: SimulationResult[] = [];

  for (let year = 0; year <= years; year++) {
    const yearValues = allResults.map((r) => r[year] || 0);
    const percentiles = calculatePercentiles(yearValues, [5, 25, 50, 75, 95]);

    const inflationFactor = Math.pow(1 + inflationRate, year);

    yearlyResults.push({
      year,
      median: percentiles[50],
      p5: percentiles[5],
      p25: percentiles[25],
      p75: percentiles[75],
      p95: percentiles[95],
      inflationAdjusted: {
        median: percentiles[50] / inflationFactor,
        p5: percentiles[5] / inflationFactor,
        p95: percentiles[95] / inflationFactor,
      },
    });
  }

  return yearlyResults;
};

export const runScenarioAnalysis = (
  baseConfig: SimulationConfig,
  scenarios: {
    name: string;
    returnRate: number;
    inflationRate: number;
    volatility: number;
    color: string;
  }[]
): {
  name: string;
  color: string;
  results: SimulationResult[];
}[] => {
  return scenarios.map((scenario) => {
    const config: SimulationConfig = {
      ...baseConfig,
      annualReturnRate: scenario.returnRate,
      inflationRate: scenario.inflationRate,
      volatility: scenario.volatility,
    };

    const results = runCompoundInterestSimulation(config);

    return {
      name: scenario.name,
      color: scenario.color,
      results,
    };
  });
};

export const calculateRiskMetrics = (
  results: SimulationResult[]
): {
  expectedReturn: number;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  var95: number;
  var99: number;
} => {
  if (results.length < 2) {
    return {
      expectedReturn: 0,
      volatility: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      var95: 0,
      var99: 0,
    };
  }

  const returns: number[] = [];
  let maxDrawdown = 0;
  let peak = results[0].median;

  for (let i = 1; i < results.length; i++) {
    const currentValue = results[i].median;
    const prevValue = results[i - 1].median;

    if (prevValue > 0) {
      const annualReturn = (currentValue / prevValue) ** 12 - 1;
      returns.push(annualReturn);
    }

    if (currentValue > peak) {
      peak = currentValue;
    }

    const drawdown = (peak - currentValue) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  const expectedReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  const variance =
    returns.reduce((sum, r) => sum + (r - expectedReturn) ** 2, 0) /
    returns.length;
  const volatility = Math.sqrt(variance);

  const sharpeRatio = volatility > 0 ? expectedReturn / volatility : 0;

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95Index = Math.ceil(0.05 * sortedReturns.length) - 1;
  const var99Index = Math.ceil(0.01 * sortedReturns.length) - 1;

  return {
    expectedReturn,
    volatility,
    maxDrawdown,
    sharpeRatio,
    var95: -sortedReturns[var95Index] || 0,
    var99: -sortedReturns[var99Index] || 0,
  };
};

export const calculateWithdrawalRate = (
  currentValue: number,
  annualWithdrawal: number,
  years: number,
  returnRate: number,
  inflationRate: number
): {
  successRate: number;
  finalValues: number[];
} => {
  const simulations = 1000;
  const volatility = 0.1;
  const monthlyRate = returnRate / 12;
  const monthlyWithdrawal = annualWithdrawal / 12;
  const months = years * 12;

  let successCount = 0;
  const finalValues: number[] = [];

  for (let sim = 0; sim < simulations; sim++) {
    let value = currentValue;
    let success = true;

    for (let month = 0; month < months; month++) {
      const inflationAdjustment = Math.pow(1 + inflationRate / 12, month);
      const adjustedWithdrawal = monthlyWithdrawal * inflationAdjustment;

      const randomReturn = gaussianRandom(monthlyRate, volatility / Math.sqrt(12));
      value = value * (1 + randomReturn) - adjustedWithdrawal;

      if (value <= 0) {
        success = false;
        break;
      }
    }

    if (success) successCount++;
    finalValues.push(Math.max(0, value));
  }

  return {
    successRate: successCount / simulations,
    finalValues,
  };
};

if (typeof self !== 'undefined') {
  self.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const { type, config } = event.data;

    if (type === 'start' && config) {
      try {
        const results = runCompoundInterestSimulation(config, (progress) => {
          (self as unknown as Worker).postMessage({
            type: 'progress',
            progress,
          } as WorkerMessage);
        });

        (self as unknown as Worker).postMessage({
          type: 'complete',
          result: results,
        } as WorkerMessage);
      } catch (error) {
        (self as unknown as Worker).postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        } as WorkerMessage);
      }
    }
  };
}

export const createSimulationWorker = (): Worker | null => {
  if (typeof Worker === 'undefined') {
    return null;
  }

  const workerCode = `
    ${gaussianRandom.toString()}
    ${runSingleSimulation.toString()}
    ${calculatePercentiles.toString()}
    ${runCompoundInterestSimulation.toString()}
    
    self.onmessage = function(event) {
      const { type, config } = event.data;
      
      if (type === 'start' && config) {
        try {
          const results = runCompoundInterestSimulation(config, (progress) => {
            self.postMessage({ type: 'progress', progress });
          });
          
          self.postMessage({ type: 'complete', result: results });
        } catch (error) {
          self.postMessage({ type: 'error', error: error.message });
        }
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);

  worker.addEventListener('error', (event) => {
    console.error('Simulation worker error:', event);
  });

  return worker;
};
