import type { ConjunctionEvent, Debris, ScanConfig } from "../types/orbital";
import { generateEphemeris } from "../orbital/twobody";
import { findClosestApproach } from "../orbital/conjunction";
import { computePc } from "../orbital/collision";

export interface WorkerScanRequest {
  type: "scan";
  requestId: string;
  target: Debris;
  debris: Debris[];
  startJd: number;
  endJd: number;
  stepSec: number;
  config: ScanConfig;
  j2: boolean;
  j3: boolean;
  chunkIndex: number;
  totalChunks: number;
}

export interface WorkerProgress {
  type: "progress";
  requestId: string;
  chunkIndex: number;
  totalChunks: number;
  processed: number;
  total: number;
}

export interface WorkerResult {
  type: "result";
  requestId: string;
  chunkIndex: number;
  totalChunks: number;
  events: ConjunctionEvent[];
  processedCount: number;
  durationMs: number;
  throughput: number;
}

export interface WorkerError {
  type: "error";
  requestId: string;
  chunkIndex: number;
  message: string;
}

export type WorkerMessage = WorkerScanRequest;
export type WorkerResponse = WorkerProgress | WorkerResult | WorkerError;

function severityFromPc(pc: number, missKm: number): 0 | 1 | 2 | 3 {
  if (pc > 1e-3 || missKm < 0.1) return 3;
  if (pc > 1e-4 || missKm < 0.5) return 2;
  if (pc > 1e-5 || missKm < 1) return 1;
  return 0;
}

self.onmessage = (evt: MessageEvent<WorkerMessage>) => {
  const msg = evt.data;
  if (msg.type !== "scan") return;
  const started = performance.now();
  const {
    requestId,
    target,
    debris,
    startJd,
    endJd,
    stepSec,
    config,
    j2,
    j3,
    chunkIndex,
    totalChunks,
  } = msg;

  const targetEph = generateEphemeris(target.elements, startJd, endJd, stepSec, {
    j2,
    j3,
  });

  const events: ConjunctionEvent[] = [];
  let processed = 0;
  const total = debris.length;
  const progressInterval = Math.max(1, Math.floor(total / 10));

  for (let i = 0; i < total; i++) {
    const d = debris[i];
    const dEph = generateEphemeris(d.elements, startJd, endJd, stepSec, {
      j2,
      j3,
    });
    const conj = findClosestApproach(targetEph, dEph, config.thresholdKm);
    if (conj) {
      const pcResult = computePc({
        targetState: {
          positionKm: conj.targetState.positionKm,
          velocityKmS: conj.targetState.velocityKmS,
        },
        debrisState: {
          positionKm: conj.debrisState.positionKm,
          velocityKmS: conj.debrisState.velocityKmS,
        },
        combinedRadiusM: config.combinedRadiusM,
        sigmaPosKm: 0.1,
        covarianceScale: config.covarianceScale,
      });
      events.push({
        id: `${requestId}-${d.noradId}-${chunkIndex}`,
        targetNorad: target.noradId,
        debrisNorad: d.noradId,
        debrisName: d.name,
        tcaEpochJd: conj.tcaEpochJd,
        missDistanceKm: conj.missDistanceKm,
        relativeVelocityKmS: conj.relativeVelocityKmS,
        collisionProbability: pcResult.pc,
        mahalanobis: pcResult.mahalanobis,
        severity: severityFromPc(pcResult.pc, conj.missDistanceKm),
      });
    }
    processed++;
    if (i % progressInterval === 0) {
      const prog: WorkerProgress = {
        type: "progress",
        requestId,
        chunkIndex,
        totalChunks,
        processed,
        total,
      };
      self.postMessage(prog);
    }
  }

  const durationMs = performance.now() - started;
  const throughput = processed / (durationMs / 1000);
  const result: WorkerResult = {
    type: "result",
    requestId,
    chunkIndex,
    totalChunks,
    events,
    processedCount: processed,
    durationMs,
    throughput,
  };
  self.postMessage(result);
};
