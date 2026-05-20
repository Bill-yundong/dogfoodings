import { writable, derived, get } from 'svelte/store';
import type { SimulationTask, SimulationResult, SwingEquationParams, SolverConfig } from '$lib/types';
import { generateDefaultParams, generateDefaultConfig } from '$lib/engine/swing-solver';
import { addSimulationTask, updateSimulationTask, addSimulationResult } from '$lib/db/indexed-db';

interface WorkerPool {
  worker: Worker;
  busy: boolean;
}

export function createSimulationStore() {
  const tasks = writable<SimulationTask[]>([]);
  const results = writable<Map<string, SimulationResult>>(new Map());
  const currentResult = writable<SimulationResult | null>(null);
  const workers = writable<WorkerPool[]>([]);
  const maxWorkers = Math.min(navigator.hardwareConcurrency || 2, 4);

  const params = writable<SwingEquationParams>(generateDefaultParams());
  const config = writable<SolverConfig>(generateDefaultConfig());

  function initWorkers() {
    for (let i = 0; i < maxWorkers; i++) {
      const worker = new Worker(new URL('../../workers/simulation.worker.ts', import.meta.url), {
        type: 'module'
      });
      
      worker.onmessage = (e) => {
        handleWorkerMessage(e, worker);
      };
      
      workers.update(list => [...list, { worker, busy: false }]);
    }
  }

  function handleWorkerMessage(e: MessageEvent, worker: Worker) {
    const data = e.data;
    const workerList = get(workers);
    const pool = workerList.find(w => w.worker === worker);
    if (!pool) return;
    
    if (data.type === 'progress') {
      tasks.update(list => 
        list.map(t => t.id === data.taskId ? { ...t, progress: data.progress } : t)
      );
    } else if (data.type === 'result') {
      tasks.update(list => 
        list.map(t => t.id === data.taskId ? { 
          ...t, 
          status: 'completed', 
          progress: 100, 
          completedAt: new Date() 
        } : t)
      );
      
      const task = get(tasks).find(t => t.id === data.taskId);
      if (task) {
        updateSimulationTask(task);
      }
      
      results.update(map => {
        const newMap = new Map(map);
        newMap.set(data.taskId, data.result);
        return newMap;
      });
      addSimulationResult(data.result);
      currentResult.set(data.result);
      workers.update(list => 
        list.map(w => w.worker === worker ? { ...w, busy: false } : w)
      );
    } else if (data.type === 'error') {
      tasks.update(list => 
        list.map(t => t.id === data.taskId ? { ...t, status: 'failed' } : t)
      );
      const task = get(tasks).find(t => t.id === data.taskId);
      if (task) {
        updateSimulationTask(task);
      }
      workers.update(list => 
        list.map(w => w.worker === worker ? { ...w, busy: false } : w)
      );
    }
  }

  async function startSimulation(): Promise<string> {
    const taskId = `task-${Date.now()}`;
    
    const task: SimulationTask = {
      id: taskId,
      systemId: 'grid-001',
      status: 'pending',
      parameters: {
        timeSpan: [0, get(config).tEnd],
        timeStep: get(config).dt,
        integrationMethod: get(config).method,
        disturbance: {
          type: 'load-jump',
          time: 1.0,
          magnitude: get(params).loadJump
        }
      },
      createdAt: new Date(),
      progress: 0
    };
    
    tasks.update(list => [...list, task]);
    addSimulationTask(task);
    
    const workerList = get(workers);
    const availableWorker = workerList.find(w => !w.busy);
    
    if (availableWorker) {
      workers.update(list => 
        list.map(w => w.worker === availableWorker.worker ? { ...w, busy: true } : w)
      );
      tasks.update(list => 
        list.map(t => t.id === taskId ? { ...t, status: 'running' } : t)
      );
      
      availableWorker.worker.postMessage({
        type: 'simulate',
        params: get(params),
        config: get(config),
        taskId
      });
    }
    
    return taskId;
  }

  function updateParams(newParams: Partial<SwingEquationParams>) {
    params.update(p => ({ ...p, ...newParams }));
  }

  function updateConfig(newConfig: Partial<SolverConfig>) {
    config.update(c => ({ ...c, ...newConfig }));
  }

  function selectResult(taskId: string) {
    const resultMap = get(results);
    currentResult.set(resultMap.get(taskId) || null);
  }

  function terminateAll() {
    get(workers).forEach(pool => {
      pool.worker.terminate();
    });
    workers.set([]);
  }

  const runningTasks = derived(tasks, $tasks => 
    $tasks.filter(t => t.status === 'running')
  );
  const completedTasks = derived(tasks, $tasks => 
    $tasks.filter(t => t.status === 'completed')
  );
  const hasAvailableWorker = derived(workers, $workers => 
    $workers.some(w => !w.busy)
  );

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
