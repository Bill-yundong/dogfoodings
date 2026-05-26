import type { ConjunctionEvent, Debris, ScanConfig } from "@/types/orbital";
import ScanWorker from "@/workers/scan.worker.ts?worker";
import type {
  WorkerMessage,
  WorkerProgress,
  WorkerResponse,
  WorkerResult,
} from "@/workers/scan.worker";

export interface ScanProgress {
  requestId: string;
  processed: number;
  total: number;
  chunksDone: number;
  chunksTotal: number;
  events: ConjunctionEvent[];
  throughput: number;
  durationMs: number;
}

export interface ScanHandle {
  requestId: string;
  abort: () => void;
  promise: Promise<ConjunctionEvent[]>;
  onProgress: (cb: (p: ScanProgress) => void) => void;
}

interface ActiveScan {
  handle: ScanHandle;
  chunksCompleted: number;
  chunksTotal: number;
  processed: number;
  total: number;
  events: ConjunctionEvent[];
  throughput: number;
  durationMs: number;
  resolve: (v: ConjunctionEvent[]) => void;
  reject: (e: unknown) => void;
  progressCb: ((p: ScanProgress) => void) | null;
}

const POOL_SIZE = 4;

class ScanPool {
  private workers: Worker[] = [];
  private queue: { msg: WorkerMessage; active: ActiveScan }[] = [];
  private active = new Map<string, ActiveScan>();
  private workerIndex = 0;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      const w = new ScanWorker();
      w.onmessage = (evt) => this.onMessage(evt);
      this.workers.push(w);
    }
  }

  private onMessage(evt: MessageEvent<WorkerResponse>) {
    const msg = evt.data;
    const active = this.active.get(msg.requestId);
    if (!active) return;
    if (msg.type === "progress") {
      const prog: WorkerProgress = msg;
      active.processed = prog.processed;
      active.total = prog.total;
      this.notify(active);
    } else if (msg.type === "result") {
      const res: WorkerResult = msg;
      active.chunksCompleted += 1;
      active.processed += res.processedCount;
      active.events = active.events.concat(res.events);
      active.throughput = Math.max(active.throughput, res.throughput);
      active.durationMs = Math.max(active.durationMs, res.durationMs);
      if (active.chunksCompleted >= active.chunksTotal) {
        this.active.delete(active.handle.requestId);
        active.resolve(active.events);
      } else {
        this.notify(active);
      }
    } else if (msg.type === "error") {
      this.active.delete(active.handle.requestId);
      active.reject(new Error(msg.message));
    }
  }

  private notify(active: ActiveScan) {
    active.progressCb?.({
      requestId: active.handle.requestId,
      processed: active.processed,
      total: active.total,
      chunksDone: active.chunksCompleted,
      chunksTotal: active.chunksTotal,
      events: active.events,
      throughput: active.throughput,
      durationMs: active.durationMs,
    });
  }

  submitScan(params: {
    target: Debris;
    debris: Debris[];
    startJd: number;
    endJd: number;
    stepSec: number;
    config: ScanConfig;
    j2: boolean;
    j3: boolean;
  }): ScanHandle {
    const requestId = `scan-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const chunksTotal = POOL_SIZE;
    const perChunk = Math.ceil(params.debris.length / chunksTotal);
    const chunks: Debris[][] = [];
    for (let i = 0; i < chunksTotal; i++) {
      chunks.push(params.debris.slice(i * perChunk, (i + 1) * perChunk));
    }

    let resolve!: (v: ConjunctionEvent[]) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<ConjunctionEvent[]>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const active: ActiveScan = {
      handle: {} as ScanHandle,
      chunksCompleted: 0,
      chunksTotal,
      processed: 0,
      total: params.debris.length,
      events: [],
      throughput: 0,
      durationMs: 0,
      resolve,
      reject,
      progressCb: null,
    };

    const handle: ScanHandle = {
      requestId,
      promise,
      abort: () => {
        this.active.delete(requestId);
        reject(new Error("aborted"));
      },
      onProgress: (cb) => {
        active.progressCb = cb;
      },
    };
    active.handle = handle;

    this.active.set(requestId, active);

    for (let i = 0; i < chunksTotal; i++) {
      const msg: WorkerMessage = {
        type: "scan",
        requestId,
        target: params.target,
        debris: chunks[i],
        startJd: params.startJd,
        endJd: params.endJd,
        stepSec: params.stepSec,
        config: params.config,
        j2: params.j2,
        j3: params.j3,
        chunkIndex: i,
        totalChunks: chunksTotal,
      };
      this.queue.push({ msg, active });
      this.dispatch();
    }

    return handle;
  }

  private dispatch() {
    while (this.queue.length > 0 && this.idleWorkers() > 0) {
      const task = this.queue.shift()!;
      const w = this.workers[this.workerIndex % this.workers.length];
      this.workerIndex++;
      w.postMessage(task.msg);
    }
  }

  private idleWorkers() {
    return POOL_SIZE;
  }
}

export const scanPool = new ScanPool();
