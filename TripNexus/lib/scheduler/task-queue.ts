import { TaskQueueItem, TaskPriority, PRIORITY_WEIGHTS } from './types';

export class TaskQueue {
  private queue: TaskQueueItem[] = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  enqueue(item: TaskQueueItem): boolean {
    if (this.queue.length >= this.maxSize) {
      return false;
    }

    this.queue.push(item);
    this.sort();
    return true;
  }

  dequeue(): TaskQueueItem | undefined {
    return this.queue.shift();
  }

  peek(): TaskQueueItem | undefined {
    return this.queue[0];
  }

  remove(taskId: string): TaskQueueItem | undefined {
    const index = this.queue.findIndex(item => item.id === taskId);
    if (index !== -1) {
      return this.queue.splice(index, 1)[0];
    }
    return undefined;
  }

  get(taskId: string): TaskQueueItem | undefined {
    return this.queue.find(item => item.id === taskId);
  }

  private sort(): void {
    this.queue.sort((a, b) => {
      const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt - b.createdAt;
    });
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }

  clear(): void {
    this.queue.forEach(item => item.abortController.abort());
    this.queue = [];
  }

  toArray(): TaskQueueItem[] {
    return [...this.queue];
  }

  getStats(): { pending: number; byPriority: Record<TaskPriority, number> } {
    const byPriority: Record<TaskPriority, number> = { low: 0, medium: 0, high: 0 };
    for (const item of this.queue) {
      byPriority[item.priority]++;
    }
    return {
      pending: this.queue.length,
      byPriority,
    };
  }
}
