import { TaskQueueItem } from './types';

interface Worker {
  id: number;
  busy: boolean;
  currentTask?: TaskQueueItem;
}

export class WorkerPool {
  private workers: Worker[];
  private runningTasks: Map<string, TaskQueueItem>;

  constructor(size: number) {
    this.workers = Array.from({ length: size }, (_, i) => ({
      id: i,
      busy: false,
    }));
    this.runningTasks = new Map();
  }

  async execute(
    item: TaskQueueItem,
    onTaskComplete: (result: unknown) => void,
    onTaskError: (error: Error) => void
  ): Promise<void> {
    const worker = this.workers.find(w => !w.busy);
    if (!worker) {
      throw new Error('No available workers');
    }

    worker.busy = true;
    worker.currentTask = item;
    this.runningTasks.set(item.id, item);

    try {
      item.task.status = 'processing';
      item.startedAt = Date.now();

      const result = await item.execute((progress) => {
        item.task.progress = progress;
        item.onProgress?.(progress);
      });

      item.task.status = 'completed';
      item.task.result = result;
      item.completedAt = Date.now();

      this.runningTasks.delete(item.id);
      worker.busy = false;
      worker.currentTask = undefined;

      onTaskComplete(result);
    } catch (error) {
      item.task.status = 'failed';
      item.task.error = error instanceof Error ? error.message : String(error);
      item.completedAt = Date.now();

      this.runningTasks.delete(item.id);
      worker.busy = false;
      worker.currentTask = undefined;

      onTaskError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  getAvailableWorkerCount(): number {
    return this.workers.filter(w => !w.busy).length;
  }

  getBusyWorkerCount(): number {
    return this.workers.filter(w => w.busy).length;
  }

  getRunningTasks(): TaskQueueItem[] {
    return Array.from(this.runningTasks.values());
  }

  cancelTask(taskId: string): boolean {
    const item = this.runningTasks.get(taskId);
    if (item) {
      item.abortController.abort();
      item.task.status = 'failed';
      item.task.error = 'Task cancelled by user';
      this.runningTasks.delete(taskId);
      return true;
    }
    return false;
  }

  cancelAll(): void {
    this.runningTasks.forEach(item => {
      item.abortController.abort();
      item.task.status = 'failed';
      item.task.error = 'All tasks cancelled';
    });
    this.runningTasks.clear();
    this.workers.forEach(w => {
      w.busy = false;
      w.currentTask = undefined;
    });
  }

  getStats(): { total: number; busy: number; available: number } {
    return {
      total: this.workers.length,
      busy: this.getBusyWorkerCount(),
      available: this.getAvailableWorkerCount(),
    };
  }
}
