import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SimulationConfig,
  SimulationResult,
  WorkerMessage,
} from '@/types';
import {
  runCompoundInterestSimulation,
  runScenarioAnalysis,
  calculateRiskMetrics,
  createSimulationWorker,
} from '@/utils/calculations/simulationEngine';
import { SIMULATION_SCENARIOS } from '@/constants';

export const useSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [scenarioResults, setScenarioResults] = useState<
    { name: string; color: string; results: SimulationResult[] }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const abortControllerRef = useRef(false);

  const runSimulation = useCallback(
    async (config: SimulationConfig, useWorker: boolean = true) => {
      setIsRunning(true);
      setProgress(0);
      setError(null);
      abortControllerRef.current = false;

      if (useWorker && typeof Worker !== 'undefined') {
        if (workerRef.current) {
          workerRef.current.terminate();
        }

        const worker = createSimulationWorker();
        workerRef.current = worker;

        return new Promise<SimulationResult[]>((resolve, reject) => {
          if (!worker) {
            reject(new Error('Worker not supported'));
            return;
          }

          worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
            const { type, result, progress: workerProgress, error: workerError } = event.data;

            if (type === 'progress') {
              setProgress(workerProgress || 0);
            } else if (type === 'complete') {
                setResults(result || []);
                setIsRunning(false);
                setProgress(1);
                resolve(result || []);
                worker.terminate();
              } else if (type === 'error') {
                setError(workerError || '模拟失败');
                setIsRunning(false);
                reject(new Error(workerError || '模拟失败'));
                worker.terminate();
              }
            };

            worker.onerror = (errorEvent) => {
              setError(errorEvent.message || 'Worker 错误');
              setIsRunning(false);
              reject(new Error(errorEvent.message || 'Worker 错误'));
              worker.terminate();
            };

            worker.postMessage({ type: 'start', config });
          });
        } else {
          try {
            const result = runCompoundInterestSimulation(config, (p) => {
              setProgress(p);
            });
            setResults(result);
            setProgress(1);
            setIsRunning(false);
            return result;
          } catch (err) {
            setError(err instanceof Error ? err.message : '模拟失败');
            setIsRunning(false);
            throw err;
          }
        }
      },
      []
    );

  const runScenarios = useCallback((baseConfig: SimulationConfig) => {
    setIsRunning(true);
    setError(null);

    try {
      const results = runScenarioAnalysis(baseConfig, SIMULATION_SCENARIOS);
      setScenarioResults(results);
      setIsRunning(false);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : '情景分析失败');
      setIsRunning(false);
      throw err;
    }
  }, []);

  const getRiskMetrics = useCallback(() => {
    return calculateRiskMetrics(results);
  }, [results]);

  const cancelSimulation = useCallback(() => {
    abortControllerRef.current = true;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setScenarioResults([]);
    setProgress(0);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  return {
    isRunning,
    progress,
    results,
    scenarioResults,
    error,
    runSimulation,
    runScenarios,
    getRiskMetrics,
    cancelSimulation,
    clearResults,
  };
};
