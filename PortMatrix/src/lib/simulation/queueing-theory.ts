import type { Queue, QueueServer } from '@/types';

export interface MMcQueueResult {
  rho: number;
  P0: number;
  Lq: number;
  L: number;
  Wq: number;
  W: number;
  Pw: number;
}

export class QueueingTheory {
  static factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  static computeMMc(lambda: number, mu: number, c: number): MMcQueueResult {
    const rho = lambda / (c * mu);

    if (rho >= 1) {
      return {
        rho: 1,
        P0: 0,
        Lq: Infinity,
        L: Infinity,
        Wq: Infinity,
        W: Infinity,
        Pw: 1,
      };
    }

    let sum = 0;
    for (let n = 0; n < c; n++) {
      sum += Math.pow(lambda / mu, n) / this.factorial(n);
    }

    const lastTerm = Math.pow(lambda / mu, c) / (this.factorial(c) * (1 - rho));
    const P0 = 1 / (sum + lastTerm);
    const Pw = (P0 * Math.pow(lambda / mu, c)) / (this.factorial(c) * (1 - rho));
    const Lq = (P0 * Math.pow(lambda / mu, c) * rho) / (this.factorial(c) * Math.pow(1 - rho, 2));
    const Wq = Lq / lambda;
    const W = Wq + 1 / mu;
    const L = lambda * W;

    return { rho, P0, Lq, L, Wq, W, Pw };
  }

  static computeMMPredictedWaitTime(
    queueLength: number,
    serviceRate: number,
    numServers: number
  ): number {
    if (queueLength === 0) return 0;
    const activeServers = Math.min(queueLength, numServers);
    const waiting = Math.max(0, queueLength - numServers);
    return (waiting + 1) / (activeServers * serviceRate);
  }

  static optimalServerCount(lambda: number, mu: number, targetWaitTime: number): number {
    let c = 1;
    while (true) {
      const result = this.computeMMc(lambda, mu, c);
      if (result.Wq <= targetWaitTime || c >= 20) {
        return c;
      }
      c++;
    }
  }

  static systemUtilization(lambda: number, mu: number, c: number): number {
    return lambda / (c * mu);
  }
}

export class QueueManager {
  private queues: Map<string, Queue>;

  constructor() {
    this.queues = new Map();
  }

  createQueue(
    id: string,
    name: string,
    type: 'checkin' | 'security',
    numServers: number,
    serviceRate: number,
    maxLength: number = 50
  ): Queue {
    const servers: QueueServer[] = [];
    for (let i = 0; i < numServers; i++) {
      servers.push({
        id: `${id}_server_${i}`,
        status: 'idle',
        currentPassenger: null,
        serviceStartTime: 0,
        totalServed: 0,
      });
    }

    const queue: Queue = {
      id,
      name,
      type,
      servers,
      waitingLine: [],
      maxLength,
      serviceRate,
      arrivalRate: 0,
      avgWaitTime: 0,
      totalServed: 0,
    };

    this.queues.set(id, queue);
    return queue;
  }

  getQueue(id: string): Queue | undefined {
    return this.queues.get(id);
  }

  getAllQueues(): Queue[] {
    return Array.from(this.queues.values());
  }

  enqueue(queueId: string, passengerId: string): boolean {
    const queue = this.queues.get(queueId);
    if (!queue) return false;
    if (queue.waitingLine.length >= queue.maxLength) return false;

    queue.waitingLine.push(passengerId);
    queue.arrivalRate = this.updateArrivalRate(queue);
    return true;
  }

  dequeue(queueId: string, serverIndex: number, currentTime: number): string | null {
    const queue = this.queues.get(queueId);
    if (!queue) return null;

    const server = queue.servers[serverIndex];
    if (!server || server.status === 'busy') return null;

    const passengerId = queue.waitingLine.shift();
    if (passengerId) {
      server.status = 'busy';
      server.currentPassenger = passengerId;
      server.serviceStartTime = currentTime;
    }

    return passengerId || null;
  }

  completeService(queueId: string, serverIndex: number, currentTime: number): string | null {
    const queue = this.queues.get(queueId);
    if (!queue) return null;

    const server = queue.servers[serverIndex];
    if (!server || server.status !== 'busy' || !server.currentPassenger) return null;

    const passengerId = server.currentPassenger;
    const serviceTime = currentTime - server.serviceStartTime;

    server.status = 'idle';
    server.currentPassenger = null;
    server.totalServed++;
    queue.totalServed++;

    queue.avgWaitTime = this.updateAvgWaitTime(queue, serviceTime);

    return passengerId;
  }

  getQueueLength(queueId: string): number {
    const queue = this.queues.get(queueId);
    return queue ? queue.waitingLine.length : 0;
  }

  getTotalInSystem(queueId: string): number {
    const queue = this.queues.get(queueId);
    if (!queue) return 0;
    const busyServers = queue.servers.filter(s => s.status === 'busy').length;
    return queue.waitingLine.length + busyServers;
  }

  getIdleServerIndex(queueId: string): number {
    const queue = this.queues.get(queueId);
    if (!queue) return -1;
    return queue.servers.findIndex(s => s.status === 'idle');
  }

  setServerCount(queueId: string, count: number): boolean {
    const queue = this.queues.get(queueId);
    if (!queue) return false;

    const currentCount = queue.servers.length;
    if (count > currentCount) {
      for (let i = currentCount; i < count; i++) {
        queue.servers.push({
          id: `${queueId}_server_${i}`,
          status: 'idle',
          currentPassenger: null,
          serviceStartTime: 0,
          totalServed: 0,
        });
      }
    } else if (count < currentCount) {
      const idleIndices = queue.servers
        .map((s, i) => s.status === 'idle' ? i : -1)
        .filter(i => i !== -1)
        .sort((a, b) => b - a);

      for (let i = 0; i < currentCount - count && idleIndices.length > 0; i++) {
        queue.servers.splice(idleIndices[i], 1);
      }
    }

    return true;
  }

  setServiceRate(queueId: string, rate: number): boolean {
    const queue = this.queues.get(queueId);
    if (!queue) return false;
    queue.serviceRate = rate;
    return true;
  }

  getQueuePerformance(queueId: string): MMcQueueResult | null {
    const queue = this.queues.get(queueId);
    if (!queue) return null;

    return QueueingTheory.computeMMc(
      queue.arrivalRate,
      queue.serviceRate,
      queue.servers.length
    );
  }

  predictWaitTime(queueId: string): number {
    const queue = this.queues.get(queueId);
    if (!queue) return 0;

    return QueueingTheory.computeMMPredictedWaitTime(
      queue.waitingLine.length,
      queue.serviceRate,
      queue.servers.length
    );
  }

  private updateArrivalRate(queue: Queue): number {
    const alpha = 0.1;
    const instantaneousRate = 1;
    return alpha * instantaneousRate + (1 - alpha) * queue.arrivalRate;
  }

  private updateAvgWaitTime(queue: Queue, newWaitTime: number): number {
    const alpha = 0.05;
    return alpha * newWaitTime + (1 - alpha) * queue.avgWaitTime;
  }

  reset(): void {
    for (const queue of this.queues.values()) {
      queue.waitingLine = [];
      queue.totalServed = 0;
      queue.avgWaitTime = 0;
      queue.arrivalRate = 0;
      for (const server of queue.servers) {
        server.status = 'idle';
        server.currentPassenger = null;
        server.totalServed = 0;
        server.serviceStartTime = 0;
      }
    }
  }
}
