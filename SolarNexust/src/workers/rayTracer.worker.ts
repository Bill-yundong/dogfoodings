import type {
  RayTracingWorkerInput,
  RayTracingWorkerOutput,
  InitPayload,
  TracePayload,
  TraceResultPayload,
  BVHNode,
} from '../types/simulation';
import type { Building, SolarPanel } from '../types/solar';
import { performRayTracing } from '../utils/rayTracing';

let buildings: Building[] = [];
let panels: SolarPanel[] = [];
let bvh: BVHNode | null = null;
let config = {
  latitude: 31.2304,
  longitude: 121.4737,
  startTime: 0,
  endTime: 0,
  timeStep: 60000,
  rayCount: 100,
  ambientTemperature: 25,
};

function handleInit(payload: InitPayload): void {
  buildings = payload.buildings;
  panels = payload.panels;
  config = { ...config, ...payload.config };
  
  self.postMessage({
    type: 'INIT_COMPLETE',
    payload: null,
  } as RayTracingWorkerOutput);
}

function handleTrace(payload: TracePayload): void {
  const startTime = performance.now();
  
  const results = performRayTracing(
    panels,
    buildings,
    payload.sunDirection,
    payload.sunIntensity,
    payload.timestamp,
    payload.sunAltitude,
    payload.sunAzimuth,
    'medium'
  );
  
  const duration = performance.now() - startTime;
  
  const resultPayload: TraceResultPayload = {
    results,
    duration,
  };
  
  self.postMessage({
    type: 'TRACE_RESULT',
    payload: resultPayload,
  } as RayTracingWorkerOutput);
}

self.onmessage = (e: MessageEvent<RayTracingWorkerInput>) => {
  const { type, payload } = e.data;
  
  try {
    switch (type) {
      case 'INIT':
        handleInit(payload as InitPayload);
        break;
      case 'TRACE':
        handleTrace(payload as TracePayload);
        break;
      case 'UPDATE_BUILDINGS':
        buildings = (payload as { buildings: Building[] }).buildings;
        break;
      case 'UPDATE_PANELS':
        panels = (payload as { panels: SolarPanel[] }).panels;
        break;
      default:
        break;
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'WORKER_ERROR',
      },
    } as RayTracingWorkerOutput);
  }
};
