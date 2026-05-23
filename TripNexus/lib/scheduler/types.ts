import type { ScheduleTask, TaskStatus } from '@/lib/types';

export type { TaskStatus, ScheduleTask };

export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskQueueItem<T = unknown> {
  id: string;
  task: ScheduleTask;
  priority: TaskPriority;
  execute: (onProgress?: (progress: number) => void) => Promise<T>;
  onProgress?: (progress: number, extra?: Record<string, unknown>) => void;
  onComplete?: (result: T) => void;
  onError?: (error: Error) => void;
  abortController: AbortController;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
}

export interface SchedulerConfig {
  maxConcurrentTasks: number;
  maxQueueSize: number;
  defaultPriority: TaskPriority;
  defaultMaxRetries: number;
  workerCount: number;
}

export interface SchedulerStats {
  totalTasks: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  queueSize: number;
}

export interface MultiVariableScanConfig {
  baseRequest?: Record<string, unknown>;
  variables?: Record<string, unknown[]>;
  optimizationGoal?: string;
  algorithms: string[];
  goals: string[];
  transportModes: string[];
  compareCount?: number;
  topK?: number;
}

export interface ScanResult {
  id: string;
  params: Record<string, unknown>;
  parameters: {
    algorithm: string;
    goal: string;
    [key: string]: unknown;
  };
  result: unknown;
  score: number;
  rank: number;
  totalDistance: number;
  totalTime: number;
  fitnessScore: number;
}

export const DEFAULT_CONFIG: SchedulerConfig = {
  maxConcurrentTasks: 4,
  maxQueueSize: 100,
  defaultPriority: 'medium',
  defaultMaxRetries: 3,
  workerCount: 2,
};

export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
};
