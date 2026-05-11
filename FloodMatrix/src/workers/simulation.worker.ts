import { RainfallRunoffModel } from '../models/RainfallRunoffModel';
import type { SimulationConfig, GridCell, PipeNode, PipeConnection, FloodArea } from '../types';

interface WorkerMessage {
  type: 'init' | 'start' | 'pause' | 'stop' | 'step';
  config?: SimulationConfig;
  steps?: number;
}

interface WorkerResponse {
  type: 'progress' | 'complete' | 'error' | 'initialized';
  progress?: number;
  grid?: GridCell[][];
  nodes?: PipeNode[];
  connections?: PipeConnection[];
  floodAreas?: FloodArea[];
  currentStep?: number;
  totalSteps?: number;
  error?: string;
}

let model: RainfallRunoffModel | null = null;
let isRunning = false;
let currentStep = 0;
let totalSteps = 0;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, config, steps } = e.data;

  switch (type) {
    case 'init':
      if (config) {
        model = new RainfallRunoffModel(config);
        currentStep = 0;
        totalSteps = 0;
        self.postMessage({
          type: 'initialized',
          grid: model.getGrid(),
          nodes: model.getNodes(),
          connections: model.getConnections()
        } as WorkerResponse);
      }
      break;

    case 'start':
      if (model && steps) {
        isRunning = true;
        totalSteps = steps;
        currentStep = 0;
        runSimulation();
      }
      break;

    case 'step':
      if (model) {
        const intensity = config?.rainfallIntensity || 50;
        for (let i = 0; i < 10; i++) {
          model.step(intensity);
        }
        self.postMessage({
          type: 'progress',
          progress: 100,
          grid: model.getGrid(),
          nodes: model.getNodes(),
          connections: model.getConnections(),
          floodAreas: convertFloodAreas(model.getFloodAreas()),
          currentStep: 1,
          totalSteps: 1
        } as WorkerResponse);
      }
      break;

    case 'pause':
      isRunning = false;
      break;

    case 'stop':
      isRunning = false;
      model = null;
      currentStep = 0;
      totalSteps = 0;
      break;
  }
};

async function runSimulation() {
  if (!model || !isRunning) return;

  while (isRunning && currentStep < totalSteps) {
    for (let i = 0; i < 10; i++) {
      model!.step(model!.config.rainfallIntensity);
    }
    currentStep++;

    const progress = (currentStep / totalSteps) * 100;

    self.postMessage({
      type: 'progress',
      progress,
      grid: model.getGrid(),
      nodes: model.getNodes(),
      connections: model.getConnections(),
      floodAreas: convertFloodAreas(model.getFloodAreas()),
      currentStep,
      totalSteps
    } as WorkerResponse);

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  if (currentStep >= totalSteps) {
    self.postMessage({
      type: 'complete',
      grid: model!.getGrid(),
      nodes: model!.getNodes(),
      connections: model!.getConnections(),
      floodAreas: convertFloodAreas(model!.getFloodAreas())
    } as WorkerResponse);
  }
}

function convertFloodAreas(areas: { x: number; y: number; depth: number; severity: string }[]): FloodArea[] {
  return areas.map((area, index) => ({
    id: `flood_${index}`,
    centerX: area.x,
    centerY: area.y,
    radius: 1,
    maxDepth: area.depth,
    severity: area.severity as FloodArea['severity']
  }));
}

export {};
