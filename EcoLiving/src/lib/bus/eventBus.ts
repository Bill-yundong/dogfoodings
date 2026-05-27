import type { SyncEvent, SyncEventType, ModuleSource, SyncLog } from '@/lib/types/energy';
import { generateId } from '@/lib/utils/formatters';

type EventHandler<T = unknown> = (event: SyncEvent<T>) => void;

class EventBus {
  private handlers: Map<SyncEventType, Set<EventHandler>> = new Map();
  private syncLogs: SyncLog[] = [];
  private maxLogs: number = 1000;

  publish<T>(event: SyncEvent<T>): void {
    this.logSync(event);
    
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventBus] Error handling ${event.type}:`, error);
          this.updateLogStatus(event.timestamp, 'failed', error instanceof Error ? error.message : 'Unknown error');
        }
      });
    }

    const allHandlers = this.handlers.get('*' as SyncEventType);
    if (allHandlers) {
      allHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventBus] Error in wildcard handler:`, error);
        }
      });
    }
  }

  subscribe<T>(type: SyncEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as EventHandler);
    
    return () => {
      this.unsubscribe(type, handler as EventHandler);
    };
  }

  unsubscribe<T>(type: SyncEventType, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.handlers.delete(type);
      }
    }
  }

  broadcast<T>(payload: T, source: ModuleSource, priority: 'low' | 'normal' | 'high' = 'normal'): void {
    const event: SyncEvent<T> = {
      type: 'sync:request',
      source,
      payload,
      timestamp: Date.now(),
      priority,
    };
    this.publish(event);
  }

  send<T>(
    type: SyncEventType,
    payload: T,
    source: ModuleSource,
    target?: ModuleSource,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): void {
    const event: SyncEvent<T> = {
      type,
      source,
      target,
      payload,
      timestamp: Date.now(),
      priority,
    };
    this.publish(event);
  }

  private logSync<T>(event: SyncEvent<T>): void {
    const log: SyncLog = {
      id: generateId(),
      timestamp: event.timestamp,
      sourceModule: event.source,
      targetModule: event.target,
      dataType: event.type,
      status: 'success',
    };
    
    this.syncLogs.unshift(log);
    if (this.syncLogs.length > this.maxLogs) {
      this.syncLogs.pop();
    }
  }

  private updateLogStatus(timestamp: number, status: SyncLog['status'], message?: string): void {
    const log = this.syncLogs.find(l => l.timestamp === timestamp);
    if (log) {
      log.status = status;
      log.message = message;
    }
  }

  getSyncLogs(): SyncLog[] {
    return [...this.syncLogs];
  }

  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.syncLogs.forEach(log => {
      const key = `${log.sourceModule}->${log.dataType}`;
      stats[key] = (stats[key] || 0) + 1;
    });
    return stats;
  }

  clear(): void {
    this.handlers.clear();
    this.syncLogs = [];
  }

  getSubscriberCount(type?: SyncEventType): number {
    if (type) {
      return this.handlers.get(type)?.size || 0;
    }
    let count = 0;
    this.handlers.forEach(set => {
      count += set.size;
    });
    return count;
  }
}

export const eventBus = new EventBus();

export function useEventBus() {
  return eventBus;
}

export function createSyncEvent<T>(
  type: SyncEventType,
  payload: T,
  source: ModuleSource,
  target?: ModuleSource,
  priority: 'low' | 'normal' | 'high' = 'normal'
): SyncEvent<T> {
  return {
    type,
    source,
    target,
    payload,
    timestamp: Date.now(),
    priority,
  };
}
