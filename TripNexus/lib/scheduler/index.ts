import { ScheduleTask } from '@/lib/types';
import { generateId } from '@/lib/utils/helpers';
import { TaskQueue } from './task-queue';
import { WorkerPool } from './worker-pool';
import { ProgressTracker } from './progress-tracker';
import { MultiVariableScanner, createMultiVariableScan } from './multi-variable';
import {
  TaskQueueItem,
  TaskPriority,
  SchedulerConfig,
  SchedulerStats,
  DEFAULT_CONFIG,
  MultiVariableScanConfig,
  ScanResult,
} from './types';

export class AsyncScheduler {
  private config: SchedulerConfig;
  private queue: TaskQueue;
  private workerPool: WorkerPool;
  private progressTracker: ProgressTracker;
  private completedTasks: Map<string, TaskQueueItem>;
  private failedTasks: Map<string, TaskQueueItem>;
  private isProcessing: boolean;
  private totalExecutionTime: number;
  private totalCompletedTasks: number;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.queue = new TaskQueue(this.config.maxQueueSize);
    this.workerPool = new WorkerPool(this.config.workerCount);
    this.progressTracker = new ProgressTracker();
    this.completedTasks = new Map();
    this.failedTasks = new Map();
    this.isProcessing = false;
    this.totalExecutionTime = 0;
    this.totalCompletedTasks = 0;
  }

  schedule<T>(
    name: string,
    type: 'tsp_solve' | 'multi_variable' | 'sync',
    execute: (onProgress?: (progress: number) => void) => Promise<T>,
    options: {
      priority?: TaskPriority;
      payload?: Record<string, unknown>;
      onProgress?: (progress: number, extra?: Record<string, unknown>) => void;
      onComplete?: (result: T) => void;
      onError?: (error: Error) => void;
      maxRetries?: number;
    } = {}
  ): string {
    const taskId = generateId();
    const abortController = new AbortController();

    const task: ScheduleTask = {
      id: taskId,
      name,
      type,
      priority: options.priority || this.config.defaultPriority,
      status: 'pending',
      progress: 0,
      payload: options.payload || {},
      createdAt: new Date().toISOString(),
    };

    const queueItem: TaskQueueItem<T> = {
      id: taskId,
      task,
      priority: options.priority || this.config.defaultPriority,
      execute,
      onProgress: options.onProgress,
      onComplete: options.onComplete as (result: unknown) => void,
      onError: options.onError,
      abortController,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: options.maxRetries ?? this.config.defaultMaxRetries,
    };

    if (options.onProgress) {
      this.progressTracker.addListener(taskId, options.onProgress);
    }

    const enqueued = this.queue.enqueue(queueItem as TaskQueueItem);
    if (!enqueued) {
      throw new Error('Task queue is full');
    }

    this.startProcessing();
    return taskId;
  }

  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (!this.queue.isEmpty() || this.workerPool.getBusyWorkerCount() > 0) {
      while (
        this.workerPool.getAvailableWorkerCount() > 0 &&
        !this.queue.isEmpty()
      ) {
        const item = this.queue.dequeue();
        if (item) {
          this.executeTask(item);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  private async executeTask(item: TaskQueueItem): Promise<void> {
    try {
      await this.workerPool.execute(
        item,
        (result) => this.handleTaskComplete(item, result),
        (error) => this.handleTaskError(item, error)
      );
    } catch (error) {
      this.handleTaskError(item, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handleTaskComplete(item: TaskQueueItem, result: unknown): void {
    this.completedTasks.set(item.id, item);
    this.totalCompletedTasks++;
    
    if (item.completedAt && item.startedAt) {
      this.totalExecutionTime += item.completedAt - item.startedAt;
    }

    this.progressTracker.removeListener(item.id);
    item.onComplete?.(result);
  }

  private handleTaskError(item: TaskQueueItem, error: Error): void {
    if (item.retryCount < item.maxRetries) {
      item.retryCount++;
      item.task.status = 'pending';
      item.task.progress = 0;
      item.abortController = new AbortController();
      this.queue.enqueue(item);
      return;
    }

    this.failedTasks.set(item.id, item);
    this.progressTracker.removeListener(item.id);
    item.onError?.(error);
  }

  cancelTask(taskId: string): boolean {
    const queued = this.queue.remove(taskId);
    if (queued) {
      queued.abortController.abort();
      return true;
    }
    return this.workerPool.cancelTask(taskId);
  }

  cancelAll(): void {
    this.queue.clear();
    this.workerPool.cancelAll();
  }

  getTaskStatus(taskId: string): ScheduleTask | undefined {
    const queued = this.queue.get(taskId);
    if (queued) return queued.task;

    const running = this.workerPool.getRunningTasks().find(t => t.id === taskId);
    if (running) return running.task;

    const completed = this.completedTasks.get(taskId);
    if (completed) return completed.task;

    const failed = this.failedTasks.get(taskId);
    if (failed) return failed.task;

    return undefined;
  }

  getAllTasks(): ScheduleTask[] {
    const tasks: ScheduleTask[] = [];
    
    tasks.push(...this.queue.toArray().map(item => item.task));
    tasks.push(...this.workerPool.getRunningTasks().map(item => item.task));
    tasks.push(...Array.from(this.completedTasks.values()).map(item => item.task));
    tasks.push(...Array.from(this.failedTasks.values()).map(item => item.task));

    return tasks.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async multiVariableScan(
    config: MultiVariableScanConfig,
    executeFn: (params: Record<string, unknown>) => Promise<unknown>,
    evaluateFn: (result: unknown) => number,
    onProgress?: (completed: number, total: number, currentResult: ScanResult) => void
  ): Promise<ScanResult[]> {
    const scanner = new MultiVariableScanner(config);
    return scanner.scan(executeFn, evaluateFn, onProgress);
  }

  getEstimatedTimeRemaining(taskId: string): string | null {
    const task = this.getTaskStatus(taskId);
    if (!task) return null;

    const seconds = this.progressTracker.getEstimatedTimeRemaining(task);
    if (seconds === null) return null;

    return this.progressTracker.formatEstimatedTime(seconds);
  }

  getStats(): SchedulerStats {
    const queueStats = this.queue.getStats();
    const workerStats = this.workerPool.getStats();

    return {
      totalTasks: this.totalCompletedTasks + this.failedTasks.size + queueStats.pending + workerStats.busy,
      pendingTasks: queueStats.pending,
      runningTasks: workerStats.busy,
      completedTasks: this.totalCompletedTasks,
      failedTasks: this.failedTasks.size,
      averageExecutionTime: this.totalCompletedTasks > 0 
        ? this.totalExecutionTime / this.totalCompletedTasks 
        : 0,
      queueSize: queueStats.pending,
    };
  }

  clearHistory(): void {
    this.completedTasks.clear();
    this.failedTasks.clear();
    this.progressTracker.clear();
    this.totalExecutionTime = 0;
    this.totalCompletedTasks = 0;
  }

  dispose(): void {
    this.cancelAll();
    this.clearHistory();
  }
}

let globalScheduler: AsyncScheduler | null = null;

export const getScheduler = (config?: Partial<SchedulerConfig>): AsyncScheduler => {
  if (!globalScheduler) {
    globalScheduler = new AsyncScheduler(config);
  }
  return globalScheduler;
};

export * from './types';
export { TaskQueue } from './task-queue';
export { WorkerPool } from './worker-pool';
export { ProgressTracker } from './progress-tracker';
export { MultiVariableScanner, createMultiVariableScan } from './multi-variable';

export default getScheduler;
