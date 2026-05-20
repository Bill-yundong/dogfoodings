import { solveSwingEquation, analyzeStability, type SolverResult } from '$lib/engine/swing-solver';
import type { SwingEquationParams, SolverConfig, SimulationResult } from '$lib/types';

interface WorkerMessage {
  type: 'start-simulation';
  params: SwingEquationParams;
  config: SolverConfig;
  taskId: string;
}

interface ProgressMessage {
  type: 'progress';
  taskId: string;
  progress: number;
}

interface ResultMessage {
  type: 'result';
  taskId: string;
  result: SimulationResult;
}

interface ErrorMessage {
  type: 'error';
  taskId: string;
  error: string;
}

type WorkerResponse = ProgressMessage | ResultMessage | ErrorMessage;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, params, config, taskId } = e.data;
  
  if (type === 'start-simulation') {
    try {
      const solverResult = await runSimulation(params, config, (progress) => {
        const msg: ProgressMessage = { type: 'progress', taskId, progress };
        self.postMessage(msg);
      });
      
      const stabilityAnalysis = analyzeStability(solverResult.frequency, solverResult.time);
      
      const simulationResult: SimulationResult = {
        id: `result-${Date.now()}`,
        taskId,
        timeSeries: solverResult.time,
        frequencySeries: solverResult.frequency,
        deltaSeries: solverResult.delta,
        omegaSeries: solverResult.omega,
        stabilityMargin: stabilityAnalysis,
        createdAt: new Date()
      };
      
      const msg: ResultMessage = { type: 'result', taskId, result: simulationResult };
      self.postMessage(msg);
      
    } catch (error) {
      const msg: ErrorMessage = { 
        type: 'error', 
        taskId, 
        error: error instanceof Error ? error.message : String(error) 
      };
      self.postMessage(msg);
    }
  }
};

function runSimulation(
  params: SwingEquationParams,
  config: SolverConfig,
  onProgress: (progress: number) => void
): Promise<SolverResult> {
  return new Promise((resolve, reject) => {
    try {
      const result = solveSwingEquation(params, config, onProgress);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}
