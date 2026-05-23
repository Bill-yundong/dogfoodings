import type { SimulationEvent, EventType } from '@/types';

class MinHeap<T extends { timestamp: number }> {
  private heap: T[] = [];

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  insert(item: T): void {
    this.heap.push(item);
    this.bubbleUp();
  }

  extractMin(): T | undefined {
    if (this.isEmpty()) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (last !== undefined && !this.isEmpty()) {
      this.heap[0] = last;
      this.bubbleDown();
    }
    return min;
  }

  peekMin(): T | undefined {
    return this.heap[0];
  }

  remove(predicate: (item: T) => boolean): boolean {
    const index = this.heap.findIndex(predicate);
    if (index === -1) return false;

    const last = this.heap.pop();
    if (last !== undefined && index < this.heap.length) {
      this.heap[index] = last;
      this.bubbleUp(index);
      this.bubbleDown(index);
    }
    return true;
  }

  clear(): void {
    this.heap = [];
  }

  toArray(): T[] {
    return [...this.heap];
  }

  private bubbleUp(index: number = this.heap.length - 1): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].timestamp >= this.heap[parentIndex].timestamp) break;
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private bubbleDown(index: number = 0): void {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < length && this.heap[left].timestamp < this.heap[smallest].timestamp) {
        smallest = left;
      }
      if (right < length && this.heap[right].timestamp < this.heap[smallest].timestamp) {
        smallest = right;
      }
      if (smallest === index) break;
      this.swap(index, smallest);
      index = smallest;
    }
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
}

type EventCallback = (event: SimulationEvent) => void | Promise<void>;

export class EventScheduler {
  private heap: MinHeap<SimulationEvent>;
  private callbacks: Map<EventType, Set<EventCallback>>;
  private globalCallbacks: Set<EventCallback>;
  private eventIdCounter: number;
  private currentTime: number;

  constructor() {
    this.heap = new MinHeap();
    this.callbacks = new Map();
    this.globalCallbacks = new Set();
    this.eventIdCounter = 0;
    this.currentTime = 0;
  }

  setCurrentTime(time: number): void {
    this.currentTime = time;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  schedule(
    type: EventType,
    delay: number,
    passengerId: string,
    data?: Record<string, unknown>,
    priority: number = 0
  ): string {
    const event: SimulationEvent = {
      id: `evt_${++this.eventIdCounter}`,
      type,
      timestamp: this.currentTime + delay,
      passengerId,
      data,
      priority,
    };
    this.heap.insert(event);
    return event.id;
  }

  scheduleAt(
    type: EventType,
    timestamp: number,
    passengerId: string,
    data?: Record<string, unknown>,
    priority: number = 0
  ): string {
    const event: SimulationEvent = {
      id: `evt_${++this.eventIdCounter}`,
      type,
      timestamp,
      passengerId,
      data,
      priority,
    };
    this.heap.insert(event);
    return event.id;
  }

  cancel(eventId: string): boolean {
    return this.heap.remove(e => e.id === eventId);
  }

  cancelForPassenger(passengerId: string): number {
    let count = 0;
    while (this.heap.remove(e => e.passengerId === passengerId)) {
      count++;
    }
    return count;
  }

  on(type: EventType, callback: EventCallback): () => void {
    if (!this.callbacks.has(type)) {
      this.callbacks.set(type, new Set());
    }
    this.callbacks.get(type)!.add(callback);
    return () => this.callbacks.get(type)!.delete(callback);
  }

  onAny(callback: EventCallback): () => void {
    this.globalCallbacks.add(callback);
    return () => this.globalCallbacks.delete(callback);
  }

  off(type: EventType, callback: EventCallback): void {
    this.callbacks.get(type)?.delete(callback);
  }

  async processNext(maxCount: number = Infinity, maxTime?: number): Promise<SimulationEvent[]> {
    const processed: SimulationEvent[] = [];
    const endTime = maxTime ?? Infinity;

    while (processed.length < maxCount && !this.heap.isEmpty()) {
      const nextEvent = this.heap.peekMin();
      if (!nextEvent || nextEvent.timestamp > endTime) break;

      const event = this.heap.extractMin()!;
      this.currentTime = event.timestamp;

      await this.dispatch(event);
      processed.push(event);
    }

    return processed;
  }

  private async dispatch(event: SimulationEvent): Promise<void> {
    for (const callback of this.globalCallbacks) {
      await callback(event);
    }

    const typeCallbacks = this.callbacks.get(event.type);
    if (typeCallbacks) {
      for (const callback of typeCallbacks) {
        await callback(event);
      }
    }
  }

  peekNext(): SimulationEvent | undefined {
    return this.heap.peekMin();
  }

  getQueueSize(): number {
    return this.heap.size();
  }

  getUpcomingEvents(count: number = 10): SimulationEvent[] {
    return this.heap.toArray()
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, count);
  }

  clear(): void {
    this.heap.clear();
    this.eventIdCounter = 0;
  }

  reset(): void {
    this.clear();
    this.currentTime = 0;
  }
}

export const generatePoissonArrivals = (
  rate: number,
  duration: number,
  startTime: number = 0
): Array<{ time: number; count: number }> => {
  const arrivals: Array<{ time: number; count: number }> = [];
  let time = startTime;

  while (time < startTime + duration) {
    const interArrivalTime = -Math.log(Math.random()) / rate;
    time += interArrivalTime;

    if (time < startTime + duration) {
      const count = Math.random() < 0.2 ? 2 : 1;
      arrivals.push({ time, count });
    }
  }

  return arrivals;
};
