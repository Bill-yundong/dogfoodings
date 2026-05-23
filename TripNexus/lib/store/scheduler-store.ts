'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  ScheduleTask,
  TaskStatus,
  TaskPriority,
  MultiVariableScanConfig,
  ScanResult,
} from '@/lib/scheduler/types';
import { AsyncScheduler, getScheduler } from '@/lib/scheduler';
import type { Location, TransportMode, TSPSolveRequest } from '@/lib/types';
import type { AlgorithmType, OptimizationGoal } from '@/lib/tsp/types';
import { TSPOptimizer } from '@/lib/tsp';

interface SchedulerState {
  scheduler: AsyncScheduler | null;
  tasks: ScheduleTask[];
  activeTask: ScheduleTask | null;
  scanResults: ScanResult[];
  isRunning: boolean;
  error: string | null;
  
  initScheduler: (config?: Partial<{ workerCount: number; maxQueueSize: number }>) => void;
  shutdownScheduler: () => Promise<void>;
  
  submitOptimizationTask: (
    locations: Location[],
    algorithm: AlgorithmType,
    goal: OptimizationGoal,
    transportMode: TransportMode,
    priority?: TaskPriority
  ) => Promise<string>;
  
  submitMultiVariableScan: (
    locations: Location[],
    config: MultiVariableScanConfig,
    transportMode: TransportMode,
    priority?: TaskPriority
  ) => Promise<string>;
  
  cancelTask: (taskId: string) => boolean;
  cancelAllTasks: () => void;
  clearCompletedTasks: () => void;
  loadTaskHistory: () => void;
  
  refreshTasks: () => void;
  
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  scheduler: null,
  tasks: [],
  activeTask: null,
  scanResults: [],
  isRunning: false,
  error: null,
};

export const useSchedulerStore = create<SchedulerState>()(
  persist(
    (set, get) => ({
      ...initialState,

      initScheduler: (config) => {
        if (get().scheduler) return;
        
        const scheduler = getScheduler({
          workerCount: config?.workerCount || 2,
          maxQueueSize: config?.maxQueueSize || 100,
        });
        
        set({ scheduler });
        get().refreshTasks();
      },

      shutdownScheduler: async () => {
        const { scheduler } = get();
        if (scheduler) {
          scheduler.dispose();
          set({ scheduler: null, activeTask: null, isRunning: false });
        }
      },

      submitOptimizationTask: async (
        locations,
        algorithm,
        goal,
        transportMode,
        priority = 'medium'
      ) => {
        const { scheduler } = get();
        if (!scheduler) throw new Error('调度器未初始化');

        const request: TSPSolveRequest = {
          locations,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          transportMode,
          algorithm,
          optimizationGoal: goal,
          constraints: {
            dailyHours: { start: '09:00', end: '18:00' },
            maxDailyDistance: 500000,
            avoidTolls: false,
          },
        };

        const taskId = scheduler.schedule(
          `路径优化 - ${algorithm}`,
          'tsp_solve',
          async (onProgress) => {
            const optimizer = new TSPOptimizer(request);
            return optimizer.optimize({
              generateAlternatives: true,
              onProgress: (alg, progress) => {
                onProgress?.(progress);
              },
            });
          },
          {
            priority,
            payload: { locations, algorithm, goal, transportMode },
            onProgress: (progress) => {
              set((state) => ({
                tasks: state.tasks.map((t) =>
                  t.id === taskId ? { ...t, progress } : t
                ),
              }));
            },
            onComplete: (result) => {
              set((state) => ({
                tasks: state.tasks.map((t) =>
                  t.id === taskId
                    ? { ...t, status: 'completed', result, completedAt: new Date().toISOString() }
                    : t
                ),
                activeTask: null,
              }));
              get().refreshTasks();
            },
            onError: (error) => {
              set((state) => ({
                tasks: state.tasks.map((t) =>
                  t.id === taskId
                    ? { ...t, status: 'failed', error: error.message }
                    : t
                ),
                activeTask: null,
                error: error.message,
              }));
              get().refreshTasks();
            },
          }
        );

        get().refreshTasks();
        return taskId;
      },

      submitMultiVariableScan: async (
        locations,
        config,
        transportMode,
        priority = 'low'
      ) => {
        const { scheduler } = get();
        if (!scheduler) throw new Error('调度器未初始化');

        const taskId = scheduler.schedule(
          `多变量扫描 - ${config.algorithms?.length || 0} 种算法`,
          'multi_variable',
          async (onProgress) => {
            const results = await scheduler.multiVariableScan(
              config,
              async (params) => {
                const request: TSPSolveRequest = {
                  locations,
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0],
                  transportMode,
                  algorithm: params.algorithm as AlgorithmType,
                  optimizationGoal: params.goal as OptimizationGoal,
                  constraints: {
                    dailyHours: { start: '09:00', end: '18:00' },
                    maxDailyDistance: 500000,
                    avoidTolls: false,
                  },
                };
                const optimizer = new TSPOptimizer(request);
                return optimizer.optimize();
              },
              (result) => {
                const tspResult = result as { fitnessScore: number };
                return tspResult.fitnessScore || 0;
              },
              (completed, total, currentResult) => {
                onProgress?.((completed / total) * 100);
              }
            );
            return results;
          },
          {
            priority,
            payload: { locations, config, transportMode },
            onProgress: (progress) => {
              set((state) => ({
                tasks: state.tasks.map((t) =>
                  t.id === taskId ? { ...t, progress } : t
                ),
              }));
            },
            onComplete: (result) => {
              const scanResults = result as ScanResult[];
              set((state) => ({
                tasks: state.tasks.map((t) =>
                  t.id === taskId
                    ? { ...t, status: 'completed', result, completedAt: new Date().toISOString() }
                    : t
                ),
                activeTask: null,
                scanResults: [...state.scanResults, ...scanResults],
              }));
              get().refreshTasks();
            },
            onError: (error) => {
              set((state) => ({
                tasks: state.tasks.map((t) =>
                  t.id === taskId
                    ? { ...t, status: 'failed', error: error.message }
                    : t
                ),
                activeTask: null,
                error: error.message,
              }));
              get().refreshTasks();
            },
          }
        );

        get().refreshTasks();
        return taskId;
      },

      cancelTask: (taskId) => {
        const { scheduler } = get();
        if (!scheduler) return false;
        
        const result = scheduler.cancelTask(taskId);
        get().refreshTasks();
        return result;
      },

      cancelAllTasks: () => {
        const { scheduler } = get();
        if (!scheduler) return;
        
        scheduler.cancelAll();
        set({ activeTask: null, isRunning: false });
        get().refreshTasks();
      },

      refreshTasks: () => {
        const { scheduler } = get();
        if (!scheduler) return;
        
        const tasks = scheduler.getAllTasks();
        const activeTask = tasks.find(t => t.status === 'processing') || null;
        const isRunning = tasks.some(t => t.status === 'pending' || t.status === 'processing');
        
        set({ tasks, activeTask, isRunning });
      },

      clearCompletedTasks: () => {
        const { scheduler } = get();
        if (!scheduler) return;
        
        const completedIds = get().tasks
          .filter(t => t.status === 'completed' || t.status === 'failed')
          .map(t => t.id);
        
        completedIds.forEach(id => scheduler.cancelTask(id));
        get().refreshTasks();
      },

      loadTaskHistory: () => {
        get().refreshTasks();
      },

      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    {
      name: 'trip-nexus-scheduler-store',
      partialize: (state) => ({
        tasks: state.tasks,
        scanResults: state.scanResults,
      }),
    }
  )
);
