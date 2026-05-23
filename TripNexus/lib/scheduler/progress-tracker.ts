import { ScheduleTask, AlgorithmProgress } from '@/lib/types';

interface ProgressListener {
  taskId: string;
  onProgress: (progress: number, extra?: Record<string, unknown>) => void;
}

interface ProgressHistory {
  taskId: string;
  progress: number;
  timestamp: number;
  extra?: Record<string, unknown>;
}

export class ProgressTracker {
  private listeners: Map<string, ProgressListener> = new Map();
  private history: ProgressHistory[] = [];
  private maxHistorySize: number = 1000;

  addListener(taskId: string, onProgress: (progress: number, extra?: Record<string, unknown>) => void): void {
    this.listeners.set(taskId, { taskId, onProgress });
  }

  removeListener(taskId: string): boolean {
    return this.listeners.delete(taskId);
  }

  updateProgress(taskId: string, progress: number, extra?: Record<string, unknown>): void {
    const listener = this.listeners.get(taskId);
    if (listener) {
      listener.onProgress(progress, extra);
    }

    this.history.push({
      taskId,
      progress,
      timestamp: Date.now(),
      extra,
    });

    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  getHistory(taskId?: string): ProgressHistory[] {
    if (taskId) {
      return this.history.filter(h => h.taskId === taskId);
    }
    return [...this.history];
  }

  getEstimatedTimeRemaining(task: ScheduleTask): number | null {
    const taskHistory = this.history.filter(h => h.taskId === task.id);
    if (taskHistory.length < 2) return null;

    const first = taskHistory[0];
    const last = taskHistory[taskHistory.length - 1];
    const elapsed = (last.timestamp - first.timestamp) / 1000;
    const progressDelta = last.progress - first.progress;

    if (progressDelta <= 0) return null;

    const remainingProgress = 100 - last.progress;
    const timePerPercent = elapsed / progressDelta;
    return remainingProgress * timePerPercent;
  }

  getOverallProgress(tasks: ScheduleTask[]): number {
    if (tasks.length === 0) return 100;
    const total = tasks.reduce((sum, t) => sum + t.progress, 0);
    return Math.round(total / tasks.length);
  }

  formatEstimatedTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)} 秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours} 小时 ${minutes} 分钟`;
  }

  clear(): void {
    this.listeners.clear();
    this.history = [];
  }
}
