import { $state, $derived } from 'svelte';
import type { SimulationTask, SimulationResult, SwingEquationParams, SolverConfig } from '$lib/types';
import { generateDefaultParams, generateDefaultConfig } from '$lib/engine/swing-solver';
import { addSimulationTask, updateSimulationTask, addSimulationResult } from '$lib/db/indexed-db';

interface WorkerPool {
  worker: Worker;
  busy: boolean;
}

export function createSimulationStore() {
  const tasks = $state<SimulationTask[]>([]);
  const results = $state<Map<string, SimulationResult>>(new Map());
  let currentResult = $state<SimulationResult | null>(null);
  const workers = $state<WorkerPool[]>([]);
  const maxWorkers = Math.min(navigator.hardwareConcurrency || 2, 4);

  const params = $state<SwingEquationParams>(generateDefaultParams());
  const config = $state<SolverConfig>(generateDefaultConfig());

  function initWorkers() {
    for (let i = 0; i < maxWorkers; i++) {
      const worker = new Worker(new URL('../../workers/simulation.worker.ts', import.meta.url), {
        type: 'module'
      });
      
      worker.onmessage = (e) => {
        handleWorkerMessage(e, worker);
      };
      
      workers.push({ worker, busy: false });
    }
  }

  function handleWorkerMessage(e: MessageEvent, worker: Worker) {
    const data = e.data;
    const pool = workers.find(w => w.worker === worker);
    if (!pool) return;
    
    if (data.type === 'progress') {
      const task = tasks.find(t => t.id === data.taskId);
      if (task) {
        task.progress = data.progress;
      }
    } else if (data.type === 'result') {
      const task = tasks.find(t => t.id === data.taskId);
      if (task) {
        task.status = 'completed';
        task.progress = 100;
        task.completedAt = new Date();
        updateSimulationTask(task);
      }
      
      results.set(data.taskId, data.result);
      addSimulationResult(data.result);
      currentResult = data.result;
      pool.busy = false;
    } else if (data.type === 'error') {
      const task = tasks.find(t => t.id === data.taskId);
      if (task) {
        task.status = 'failed';
        updateSimulationTask(task);
      }
      pool.busy = false;
    }
  }

  async function startSimulation(): Promise<string> {
    const taskId = `task-${Date.now()}`;
    
    const task: SimulationTask = {
      id: taskId,
      systemId: 'grid-001',
      status: 'pending',
      parameters: {
        timeSpan: [0, config.tEnd],
        timeStep: config.dt,
        integrationMethod: config.method,
        disturbance: {
          type: 'load-jump',
          time: 1.0,
          magnitude: 0.2
        }
      },
      progress: 0,
      createdAt: new Date(),
      startedAt: new Date()
    };
    
    tasks.unshift(task);
    await addSimulationTask(task);
    
    const availableWorker = workers.find(w => !w.busy);
    if (availableWorker) {
      availableWorker.busy = true;
      task.status = 'running';
      await updateSimulationTask(task);
      
      availableWorker.worker.postMessage({
        type: 'start-simulation',
        params,
        config,
        taskId
      });
    }
    
    return taskId;
  }

  function updateParams(newParams: Partial<SwingEquationParams>) {
    Object.assign(params, newParams);
  }

  function updateConfig(newConfig: Partial<SolverConfig>) {
    Object.assign(config, newConfig);
  }

  function selectResult(taskId: string) {
    currentResult = results.get(taskId) || null;
  }

  function terminateAll() {
    workers.forEach(pool => {
      pool.worker.terminate();
    });
    workers.length = 0;
  }

  const runningTasks = $derived(tasks.filter(t => t.status === 'running'));
  const completedTasks = $derived(tasks.filter(t => t.status === 'completed'));
  const hasAvailableWorker = $derived(workers.some(w => !w.busy));

  initWorkers();

  return {
    tasks,
    results,
    currentResult,
    params,
    config,
    runningTasks,
    completedTasks,
    hasAvailableWorker,
    startSimulation,
    updateParams,
    updateConfig,
    selectResult,
    terminateAll
  };
}

export const simulationStore = createSimulationStore();
