import type { ProbeResult } from '@/types';
import type { ClientConfig } from '@shared/protocol';
import { mean, stdDev } from '@/utils/math';

export interface MonitorConfig {
  probeInterval: number;
  packetCount: number;
  timeout: number;
  paths: string[];
}

export interface ProbeStats {
  totalPackets: number;
  lostPackets: number;
  minLatency: number;
  maxLatency: number;
  avgLatency: number;
  jitter: number;
}

export class NetworkMonitor {
  private config: MonitorConfig;
  private isRunning = false;
  private probeTimers: Map<string, number> = new Map();
  private recentResults: Map<string, ProbeResult[]> = new Map();
  private listeners: Set<(result: ProbeResult) => void> = new Set();
  private lastProbeTimes: Map<string, number> = new Map();

  constructor(config: MonitorConfig) {
    this.config = config;
    for (const pathId of config.paths) {
      this.recentResults.set(pathId, []);
    }
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    for (const pathId of this.config.paths) {
      this.startProbingPath(pathId);
    }
  }

  stop(): void {
    this.isRunning = false;
    for (const timerId of this.probeTimers.values()) {
      clearInterval(timerId);
    }
    this.probeTimers.clear();
  }

  updateConfig(config: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.paths) {
      const newPaths = new Set(config.paths);
      for (const pathId of this.probeTimers.keys()) {
        if (!newPaths.has(pathId)) {
          this.stopProbingPath(pathId);
        }
      }
      for (const pathId of config.paths) {
        if (!this.probeTimers.has(pathId)) {
          this.recentResults.set(pathId, []);
          if (this.isRunning) {
            this.startProbingPath(pathId);
          }
        }
      }
    }
  }

  addListener(listener: (result: ProbeResult) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRecentResults(pathId: string, limit?: number): ProbeResult[] {
    const results = this.recentResults.get(pathId) || [];
    return limit ? results.slice(-limit) : results;
  }

  getAllRecentResults(limit?: number): Map<string, ProbeResult[]> {
    const result = new Map<string, ProbeResult[]>();
    for (const [pathId, results] of this.recentResults) {
      result.set(pathId, limit ? results.slice(-limit) : results);
    }
    return result;
  }

  private startProbingPath(pathId: string): void {
    if (this.probeTimers.has(pathId)) return;

    const probe = () => {
      if (!this.isRunning) return;
      const result = this.simulateProbe(pathId);
      this.storeResult(pathId, result);
      this.notifyListeners(result);
    };

    probe();
    const timerId = window.setInterval(probe, this.config.probeInterval);
    this.probeTimers.set(pathId, timerId);
  }

  private stopProbingPath(pathId: string): void {
    const timerId = this.probeTimers.get(pathId);
    if (timerId) {
      clearInterval(timerId);
      this.probeTimers.delete(pathId);
    }
    this.recentResults.delete(pathId);
    this.lastProbeTimes.delete(pathId);
  }

  private simulateProbe(pathId: string): ProbeResult {
    const now = Date.now();
    const lastTime = this.lastProbeTimes.get(pathId) || now;
    const timeDiff = (now - lastTime) / 1000;

    const baseLatency = this.getPathBaseLatency(pathId);
    const networkNoise = Math.sin(now / 5000) * 5 + Math.sin(now / 2000) * 3;
    const randomNoise = (Math.random() - 0.5) * 10;

    const latency = Math.max(
      5,
      baseLatency + networkNoise + randomNoise + this.getCongestionFactor(pathId, timeDiff)
    );

    const lossChance = this.getPathLossRate(pathId);
    const isLost = Math.random() < lossChance;

    const lastResults = this.recentResults.get(pathId) || [];
    const recentLatencies = lastResults.slice(-10).map(r => r.latency);
    let jitter = 0;
    if (recentLatencies.length > 1) {
      jitter = stdDev(recentLatencies);
    }

    const packetLoss = isLost
      ? Math.min(1, lossChance * 2)
      : Math.max(0, lossChance + (Math.random() - 0.5) * 0.005);

    this.lastProbeTimes.set(pathId, now);

    return {
      timestamp: now,
      pathId,
      latency: Math.round(latency * 100) / 100,
      jitter: Math.round(jitter * 100) / 100,
      packetLoss: Math.round(packetLoss * 10000) / 10000,
      bandwidth: 100 + Math.random() * 400,
      hopCount: 8 + Math.floor(Math.random() * 5),
    };
  }

  private getPathBaseLatency(pathId: string): number {
    const baseLatencies: Record<string, number> = {
      'node-bj-01': 25,
      'node-sh-01': 35,
      'node-gz-01': 45,
      'node-hk-01': 65,
      'node-sg-01': 90,
    };
    return baseLatencies[pathId] || 50;
  }

  private getPathLossRate(pathId: string): number {
    const baseLoss: Record<string, number> = {
      'node-bj-01': 0.002,
      'node-sh-01': 0.005,
      'node-gz-01': 0.003,
      'node-hk-01': 0.01,
      'node-sg-01': 0.015,
    };
    return baseLoss[pathId] || 0.005;
  }

  private getCongestionFactor(pathId: string, timeDiff: number): number {
    const hour = new Date().getHours();
    const isPeakHour = hour >= 19 && hour <= 23;
    const peakFactor = isPeakHour ? 15 : 0;

    const previousResults = this.recentResults.get(pathId) || [];
    if (previousResults.length === 0) return peakFactor;

    const avgRecentLatency = mean(previousResults.slice(-5).map(r => r.latency));
    const trendFactor = Math.max(0, (avgRecentLatency - this.getPathBaseLatency(pathId)) * 0.3);

    return peakFactor + trendFactor * Math.min(1, timeDiff / 10);
  }

  private storeResult(pathId: string, result: ProbeResult): void {
    const results = this.recentResults.get(pathId) || [];
    results.push(result);
    if (results.length > 300) {
      results.shift();
    }
    this.recentResults.set(pathId, results);
  }

  private notifyListeners(result: ProbeResult): void {
    for (const listener of this.listeners) {
      try {
        listener(result);
      } catch (e) {
        console.error('Monitor listener error:', e);
      }
    }
  }

  calculateStats(pathId: string): ProbeStats | null {
    const results = this.recentResults.get(pathId);
    if (!results || results.length === 0) return null;

    const latencies = results.map(r => r.latency);
    const losses = results.map(r => r.packetLoss);

    return {
      totalPackets: results.length * this.config.packetCount,
      lostPackets: Math.round(mean(losses) * results.length * this.config.packetCount),
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      avgLatency: mean(latencies),
      jitter: stdDev(latencies),
    };
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
    this.recentResults.clear();
    this.lastProbeTimes.clear();
  }
}

export const createNetworkMonitor = (
  config: ClientConfig,
  paths: string[]
): NetworkMonitor => {
  return new NetworkMonitor({
    probeInterval: config.probeInterval,
    packetCount: 10,
    timeout: 5000,
    paths,
  });
};
