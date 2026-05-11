import { useState, useCallback, useRef, useEffect } from 'react';
import {
  WorkerMessageType,
  WorkerResult,
  PowerDensityPayload,
  ArrayOutputPayload,
  LayoutOptimizationPayload,
} from '../types/tidal';

type WorkerState = 'idle' | 'processing' | 'completed' | 'error';

export const useTidalWorker = () => {
  const [state, setState] = useState<WorkerState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/tidalWorker.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent<WorkerResult>) => {
      const { success, data, error: errMsg, progress: prog } = e.data;

      if (prog !== undefined) {
        setProgress(prog);
      }

      if (success && data !== undefined) {
        setResult(data);
        setState('completed');
        setProgress(1);
      }

      if (!success && errMsg) {
        setError(errMsg);
        setState('error');
      }
    };

    workerRef.current.onerror = (e) => {
      setError(e.message);
      setState('error');
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const sendMessage = useCallback((type: WorkerMessageType, payload: unknown) => {
    if (!workerRef.current) {
      setError('Worker not initialized');
      setState('error');
      return;
    }

    setState('processing');
    setProgress(0);
    setResult(null);
    setError(null);

    workerRef.current.postMessage({ type, payload });
  }, []);

  const calculatePowerDensity = useCallback((payload: PowerDensityPayload) => {
    sendMessage('CALCULATE_POWER_DENSITY', payload);
  }, [sendMessage]);

  const calculateArrayOutput = useCallback((payload: ArrayOutputPayload) => {
    sendMessage('CALCULATE_ARRAY_OUTPUT', payload);
  }, [sendMessage]);

  const optimizeLayout = useCallback((payload: LayoutOptimizationPayload) => {
    sendMessage('OPTIMIZE_LAYOUT', payload);
  }, [sendMessage]);

  const reset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  return {
    state,
    progress,
    result,
    error,
    calculatePowerDensity,
    calculateArrayOutput,
    optimizeLayout,
    reset,
  };
};