import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { useMonitorStore } from '@/store/useMonitorStore';
import { calculateSolarPosition, calculateSunDirection, calculateSolarIntensity, formatTime } from '@/utils/solar';
import { processRayTracingResult } from '@/utils/mppt';
import { powerGenerationDB, mpptRecordDB, shadowRecordDB } from '@/utils/db';
import type { RayTracingWorkerInput, RayTracingWorkerOutput, TraceResultPayload } from '@/types/simulation';
import type { RayTracingResult, PowerGeneration, MPPTRecord, ShadowRecord } from '@/types/solar';

export function useRayTracing() {
  const workerRef = useRef<Worker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTraceTimeRef = useRef<number>(0);
  
  const {
    panels,
    buildings,
    config,
    simulationState,
    isWorkerReady,
    setIsWorkerReady,
    setRayTracingResults,
    setPowerGenerations,
    setSolarPosition,
    setSimulationState,
    setLastTraceDuration,
  } = useSimulationStore();
  
  const { updateFromGenerations, addPowerHistory, addEfficiencyHistory, addAlert } = useMonitorStore();

  const initWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }
    
    const worker = new Worker(new URL('../workers/rayTracer.worker.ts', import.meta.url), {
      type: 'module',
    });
    
    worker.onmessage = (e: MessageEvent<RayTracingWorkerOutput>) => {
      const { type, payload } = e.data;
      
      switch (type) {
        case 'INIT_COMPLETE':
          setIsWorkerReady(true);
          break;
        case 'TRACE_RESULT': {
          const result = payload as TraceResultPayload;
          setLastTraceDuration(result.duration);
          
          const rayResults = result.results as RayTracingResult[];
          setRayTracingResults(rayResults);
          
          const generations: PowerGeneration[] = [];
          const mpptRecords: MPPTRecord[] = [];
          const shadowRecords: ShadowRecord[] = [];
          
          for (const panel of panels) {
            const rayResult = rayResults.find((r) => r.panelId === panel.id);
            if (!rayResult) continue;
            
            const processed = processRayTracingResult(
              panel,
              rayResult,
              config.ambientTemperature,
              rayResult.timestamp
            );
            
            generations.push(processed.powerGeneration);
            mpptRecords.push(processed.mpptRecord);
            shadowRecords.push(...processed.shadowRecords);
          }
          
          setPowerGenerations(generations);
          updateFromGenerations(generations);
          
          const timeStr = formatTime(generations[0]?.timestamp || Date.now());
          const totalPower = generations.reduce((sum, g) => sum + g.outputPower, 0);
          const avgEfficiency = generations.length > 0
            ? generations.reduce((sum, g) => sum + (1 - g.lossRate), 0) / generations.length * 100
            : 0;
          
          addPowerHistory(timeStr, totalPower);
          addEfficiencyHistory(timeStr, avgEfficiency);
          
          if (generations.some((g) => g.lossRate > 0.5)) {
            addAlert({
              id: `alert-${Date.now()}`,
              type: 'high_loss',
              message: '检测到高发电损耗，请检查光伏阵列状态',
              severity: 'warning',
              timestamp: Date.now(),
              acknowledged: false,
            });
          }
          
          Promise.all([
            powerGenerationDB.bulkPut(generations),
            mpptRecordDB.bulkPut(mpptRecords),
            shadowRecordDB.bulkPut(shadowRecords),
          ]).catch((error) => {
            console.error('Failed to save records to IndexedDB:', error);
          });
          
          break;
        }
        case 'ERROR':
          console.error('Ray tracing worker error:', payload);
          addAlert({
            id: `error-${Date.now()}`,
            type: 'ray_tracing_error',
            message: '光线追踪计算出错',
            severity: 'error',
            timestamp: Date.now(),
            acknowledged: false,
          });
          break;
      }
    };
    
    worker.onerror = (error) => {
      console.error('Worker error:', error);
    };
    
    workerRef.current = worker;
    
    worker.postMessage({
      type: 'INIT',
      payload: {
        buildings,
        panels,
        config,
      },
    } as RayTracingWorkerInput);
    
    return () => {
      worker.terminate();
    };
  }, [panels, buildings, config, setIsWorkerReady, setRayTracingResults, setPowerGenerations, setLastTraceDuration, updateFromGenerations, addPowerHistory, addEfficiencyHistory, addAlert]);

  const performTrace = useCallback(() => {
    if (!workerRef.current || !isWorkerReady || panels.length === 0) return;
    
    const currentTime = simulationState.currentTime;
    const solarPos = calculateSolarPosition(currentTime, config.latitude, config.longitude);
    setSolarPosition(solarPos);
    
    if (solarPos.altitude <= 0) return;
    
    const sunDirection = calculateSunDirection(solarPos.altitude, solarPos.azimuth);
    const sunIntensity = calculateSolarIntensity(solarPos.altitude);
    
    workerRef.current.postMessage({
      type: 'TRACE',
      payload: {
        timestamp: currentTime,
        sunDirection,
        sunIntensity,
        sunAltitude: solarPos.altitude,
        sunAzimuth: solarPos.azimuth,
      },
    } as RayTracingWorkerInput);
  }, [isWorkerReady, panels.length, simulationState.currentTime, config.latitude, config.longitude, setSolarPosition]);

  useEffect(() => {
    const cleanup = initWorker();
    return cleanup;
  }, [initWorker]);

  useEffect(() => {
    if (!simulationState.isRunning || simulationState.isPaused) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }
    
    const tick = () => {
      const now = Date.now();
      const timeStep = config.timeStep * simulationState.speed;
      
      if (now - lastTraceTimeRef.current >= 100) {
        setSimulationState({
          currentTime: simulationState.currentTime + timeStep,
        });
        performTrace();
        lastTraceTimeRef.current = now;
      }
      
      animationFrameRef.current = requestAnimationFrame(tick);
    };
    
    animationFrameRef.current = requestAnimationFrame(tick);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [simulationState.isRunning, simulationState.isPaused, simulationState.currentTime, simulationState.speed, config.timeStep, performTrace, setSimulationState]);

  return {
    isWorkerReady,
    performTrace,
    initWorker,
  };
}
