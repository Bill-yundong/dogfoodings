import { v4 as uuidv4 } from 'uuid';
import { Package, WCSCommand, PLCStatus, PerformanceMetrics, SortingSnapshot, ErrorEvent } from '../types';
import { SYSTEM_CONFIG } from '../config/constants';

export class SnapshotStoreEngine {
  private snapshots: SortingSnapshot[] = [];
  private errors: ErrorEvent[] = [];
  private currentVersion = 1;
  private lastSnapshotTime = 0;
  private readonly maxSnapshots: number;
  private snapshotInterval: number;

  constructor() {
    const { MAX_SNAPSHOTS, INTERVAL } = SYSTEM_CONFIG.SNAPSHOT;
    this.maxSnapshots = MAX_SNAPSHOTS;
    this.snapshotInterval = INTERVAL;
  }

  shouldCreateSnapshot(): boolean {
    return Date.now() - this.lastSnapshotTime >= this.snapshotInterval;
  }

  createSnapshot(
    packages: Package[],
    commands: WCSCommand[],
    plcStatus: PLCStatus[],
    metrics: PerformanceMetrics
  ): SortingSnapshot {
    const now = Date.now();

    const snapshot: SortingSnapshot = {
      id: uuidv4(),
      version: this.currentVersion++,
      timestamp: now,
      packages: JSON.parse(JSON.stringify(packages)),
      commands: JSON.parse(JSON.stringify(commands)),
      plcStatus: JSON.parse(JSON.stringify(plcStatus)),
      metrics: JSON.parse(JSON.stringify(metrics))
    };

    this.snapshots.push(snapshot);
    this.lastSnapshotTime = now;

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  getSnapshot(snapshotId: string): SortingSnapshot | undefined {
    return this.snapshots.find(s => s.id === snapshotId);
  }

  getLatestSnapshot(): SortingSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  getSnapshotsByTimeRange(startTime: number, endTime: number): SortingSnapshot[] {
    return this.snapshots.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
  }

  getSnapshotByVersion(version: number): SortingSnapshot | undefined {
    return this.snapshots.find(s => s.version === version);
  }

  getAllSnapshots(): SortingSnapshot[] {
    return [...this.snapshots];
  }

  addError(
    type: string,
    message: string,
    severity: ErrorEvent['severity'],
    context?: { packageId?: string; nodeId?: string }
  ): ErrorEvent {
    const error: ErrorEvent = {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      severity,
      message,
      packageId: context?.packageId,
      nodeId: context?.nodeId,
      resolved: false
    };

    this.errors.push(error);

    if (this.errors.length > 200) {
      this.errors.shift();
    }

    return error;
  }

  markErrorResolved(errorId: string, resolution: string): void {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = Date.now();
      error.resolution = resolution;
    }
  }

  getErrors(type?: string, resolved?: boolean): ErrorEvent[] {
    let filtered = this.errors;

    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }

    if (resolved !== undefined) {
      filtered = filtered.filter(e => e.resolved === resolved);
    }

    return [...filtered];
  }

  getActiveErrors(): ErrorEvent[] {
    return this.errors.filter(e => !e.resolved);
  }

  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    unresolved: number;
    recoveryRate: number;
  } {
    const stats = {
      total: this.errors.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      unresolved: 0,
      recoveryRate: 0
    };

    let resolvedCount = 0;
    this.errors.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      if (error.resolved) resolvedCount++;
      else stats.unresolved++;
    });

    stats.recoveryRate = stats.total > 0 ? resolvedCount / stats.total : 1;

    return stats;
  }

  getSnapshotCount(): number {
    return this.snapshots.length;
  }

  getCurrentVersion(): number {
    return this.currentVersion;
  }

  setSnapshotInterval(interval: number): void {
    this.snapshotInterval = interval;
  }

  clear(): void {
    this.snapshots = [];
    this.errors = [];
    this.currentVersion = 1;
    this.lastSnapshotTime = 0;
  }
}

export default SnapshotStoreEngine;
