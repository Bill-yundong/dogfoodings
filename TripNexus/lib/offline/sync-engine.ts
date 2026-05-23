import { generateId } from '@/lib/utils/helpers';
import { getDB } from './db';
import { getNetworkMonitor } from './network-monitor';
import { getOperationQueue } from './operation-queue';
import { createCRDTResolver, CRDTResolver } from './crdt';
import { Trip, TripSnapshot, OperationLog, SyncStatus } from '@/lib/types';

type SyncListener = (status: 'idle' | 'syncing' | 'conflict' | 'error') => void;

export class SyncEngine {
  private db: ReturnType<typeof getDB>;
  private networkMonitor: ReturnType<typeof getNetworkMonitor>;
  private operationQueue: ReturnType<typeof getOperationQueue>;
  private crdtResolver: CRDTResolver;
  private listeners: Set<SyncListener> = new Set();
  private isSyncing: boolean = false;
  private unsubscribeNetwork: (() => void) | null = null;
  private autoSync: boolean = true;

  constructor() {
    this.db = getDB();
    this.networkMonitor = getNetworkMonitor();
    this.operationQueue = getOperationQueue();
    this.crdtResolver = createCRDTResolver();
    this.setupNetworkListener();
  }

  private setupNetworkListener(): void {
    this.unsubscribeNetwork = this.networkMonitor.subscribe((state) => {
      if (state.online && this.autoSync && !this.isSyncing) {
        this.syncAll();
      }
    });
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(status: 'idle' | 'syncing' | 'conflict' | 'error'): void {
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (e) {
        console.error('Sync listener error:', e);
      }
    }
  }

  async createSnapshot(tripId: string, data: Trip['tspResult'], name?: string): Promise<TripSnapshot> {
    const trip = await this.db.trips.get(tripId);
    const existingSnapshots = await this.db.snapshots
      .where('tripId')
      .equals(tripId)
      .count();

    const snapshot: TripSnapshot = {
      id: generateId(),
      tripId,
      name: name || `${trip?.name || '行程快照'}`,
      tripName: trip?.name || '',
      description: trip?.description,
      version: existingSnapshots + 1,
      locationCount: data?.optimalPath.length || 0,
      data: data!,
      createdAt: new Date().toISOString(),
      synced: this.networkMonitor.isOnline(),
      syncStatus: this.networkMonitor.isOnline() ? 'synced' : 'pending',
      operations: [],
      metadata: data ? {
        totalDistance: data.totalDistance,
        totalDuration: data.totalDuration,
        totalTime: data.totalTime,
        algorithm: data.algorithmUsed,
        locationCount: data.optimalPath.length,
        createdAt: new Date().toISOString(),
        optimizationGoal: 'balanced' as const,
      } : undefined,
    };

    await this.db.snapshots.add(snapshot);

    if (!snapshot.synced) {
      await this.operationQueue.enqueue('snapshot', {
        snapshotId: snapshot.id,
        tripId,
        action: 'create',
      });
    }

    return snapshot;
  }

  async getSnapshots(tripId: string): Promise<TripSnapshot[]> {
    return this.db.snapshots
      .where('tripId')
      .equals(tripId)
      .reverse()
      .sortBy('createdAt');
  }

  async getLatestSnapshot(tripId: string): Promise<TripSnapshot | undefined> {
    return this.db.snapshots
      .where('tripId')
      .equals(tripId)
      .reverse()
      .sortBy('createdAt')
      .then(snapshots => snapshots[0]);
  }

  async restoreSnapshot(snapshotId: string): Promise<Trip | null> {
    const snapshot = await this.db.snapshots.get(snapshotId);
    if (!snapshot) return null;

    const trip = await this.db.trips.get(snapshot.tripId);
    if (!trip) return null;

    const restoredTrip: Trip = {
      ...trip,
      tspResult: snapshot.data,
      locations: snapshot.data.optimalPath,
      updatedAt: new Date().toISOString(),
    };

    await this.db.trips.put(restoredTrip);

    await this.operationQueue.createOperationLog(
      trip.id,
      'update',
      'snapshot',
      snapshotId,
      { snapshotId, action: 'restore' },
      this.networkMonitor.isOffline()
    );

    return restoredTrip;
  }

  async compareSnapshots(snapshotId1: string, snapshotId2: string): Promise<{
    differences: string[];
    distanceDiff: number;
    durationDiff: number;
    costDiff: number;
  }> {
    const [s1, s2] = await Promise.all([
      this.db.snapshots.get(snapshotId1),
      this.db.snapshots.get(snapshotId2),
    ]);

    if (!s1 || !s2) {
      throw new Error('Snapshot not found');
    }

    const differences: string[] = [];

    if (s1.data.optimalPath.length !== s2.data.optimalPath.length) {
      differences.push(`地点数量: ${s1.data.optimalPath.length} → ${s2.data.optimalPath.length}`);
    }

    const orderDiff = s1.data.optimalPath.filter(
      (loc, idx) => loc.id !== s2.data.optimalPath[idx]?.id
    ).length;
    if (orderDiff > 0) {
      differences.push(`顺序变化: ${orderDiff} 个地点`);
    }

    const distanceDiff = s2.data.totalDistance - s1.data.totalDistance;
    const durationDiff = s2.data.totalDuration - s1.data.totalDuration;
    const costDiff = s2.data.totalCost - s1.data.totalCost;

    if (Math.abs(distanceDiff) > 0.1) {
      differences.push(`距离变化: ${distanceDiff > 0 ? '+' : ''}${distanceDiff.toFixed(1)} 公里`);
    }

    return {
      differences,
      distanceDiff,
      durationDiff,
      costDiff,
    };
  }

  async syncAll(): Promise<{
    synced: number;
    conflicts: number;
    errors: number;
  }> {
    if (!this.networkMonitor.isOnline()) {
      return { synced: 0, conflicts: 0, errors: 0 };
    }

    if (this.isSyncing) {
      return { synced: 0, conflicts: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.notify('syncing');

    let synced = 0;
    let conflicts = 0;
    let errors = 0;

    try {
      const pendingOps = await this.operationQueue.getPendingItems();

      for (const op of pendingOps) {
        try {
          const result = await this.syncItem(op);
          if (result === 'conflict') {
            conflicts++;
            this.notify('conflict');
          } else if (result === 'success') {
            synced++;
            await this.operationQueue.markSuccess(op.id);
          }
        } catch (e) {
          errors++;
          await this.operationQueue.markFailed(
            op.id,
            e instanceof Error ? e.message : String(e)
          );
        }
      }

      const allSnapshots = await this.db.snapshots.toArray();
      const unsyncedSnapshots = allSnapshots.filter(s => s.synced === false);

      for (const snapshot of unsyncedSnapshots) {
        try {
          await this.syncSnapshot(snapshot);
          await (this.db.snapshots.update as any)(snapshot.id, {
            synced: true,
            syncStatus: 'synced' as SyncStatus,
          });
          synced++;
        } catch (e) {
          errors++;
          await (this.db.snapshots.update as any)(snapshot.id, {
            syncStatus: 'conflict' as SyncStatus,
          });
        }
      }

      this.notify('idle');
    } catch (e) {
      this.notify('error');
      throw e;
    } finally {
      this.isSyncing = false;
    }

    return { synced, conflicts, errors };
  }

  private async syncItem(
    op: ReturnType<typeof this.operationQueue.getPendingItems> extends Promise<(infer T)[]> ? T : never
  ): Promise<'success' | 'conflict' | 'error'> {
    try {
      switch (op.type) {
        case 'trip':
          return await this.syncTrip(op.payload);
        case 'snapshot':
          return 'success';
        case 'calendar':
          return await this.syncCalendar(op.payload);
        case 'travel':
          return await this.syncTravel(op.payload);
        default:
          return 'success';
      }
    } catch (e) {
      return 'error';
    }
  }

  private async syncTrip(payload: Record<string, unknown>): Promise<'success' | 'conflict' | 'error'> {
    const { tripId, action, data } = payload;

    if (!tripId) return 'error';

    const localTrip = await this.db.trips.get(tripId as string);
    if (!localTrip) return 'error';

    const remoteTrip = await this.fetchRemoteTrip(tripId as string);

    if (remoteTrip && localTrip.updatedAt !== remoteTrip.updatedAt) {
      const conflict = this.crdtResolver.resolveConflict(localTrip, remoteTrip);
      if (conflict.id === localTrip.id) {
        await this.pushTrip(localTrip);
        return 'success';
      } else {
        await (this.db.trips.update as any)(tripId as string, conflict);
        return 'conflict';
      }
    }

    if (action === 'create' || action === 'update') {
      await this.pushTrip(localTrip);
    } else if (action === 'delete') {
      await this.deleteRemoteTrip(tripId as string);
    }

    return 'success';
  }

  private async syncSnapshot(snapshot: TripSnapshot): Promise<void> {
    const response = await fetch('/api/sync/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });

    if (!response.ok) {
      throw new Error('Failed to sync snapshot');
    }
  }

  private async syncCalendar(payload: Record<string, unknown>): Promise<'success' | 'conflict'> {
    const response = await fetch('/api/sync/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 409) {
      return 'conflict';
    }

    if (!response.ok) {
      throw new Error('Failed to sync calendar');
    }

    return 'success';
  }

  private async syncTravel(payload: Record<string, unknown>): Promise<'success' | 'conflict'> {
    const response = await fetch('/api/sync/travel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 409) {
      return 'conflict';
    }

    if (!response.ok) {
      throw new Error('Failed to sync travel');
    }

    return 'success';
  }

  private async fetchRemoteTrip(tripId: string): Promise<Trip | null> {
    try {
      const response = await fetch(`/api/trip/${tripId}`);
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  private async pushTrip(trip: Trip): Promise<void> {
    const response = await fetch(`/api/trip/${trip.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trip),
    });

    if (!response.ok) {
      throw new Error('Failed to push trip');
    }
  }

  private async deleteRemoteTrip(tripId: string): Promise<void> {
    const response = await fetch(`/api/trip/${tripId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete trip');
    }
  }

  async resolveConflict(
    tripId: string,
    resolution: 'local' | 'remote' | 'merge'
  ): Promise<Trip> {
    const localTrip = await this.db.trips.get(tripId);
    const remoteTrip = await this.fetchRemoteTrip(tripId);

    if (!localTrip || !remoteTrip) {
      throw new Error('Trip not found');
    }

    let resolved: Trip;

    switch (resolution) {
      case 'local':
        resolved = localTrip;
        await this.pushTrip(localTrip);
        break;
      case 'remote':
        resolved = remoteTrip;
        await this.db.trips.put(resolved);
        break;
      case 'merge':
        resolved = this.crdtResolver.resolveConflict(localTrip, remoteTrip);
        await this.db.trips.put(resolved);
        await this.pushTrip(resolved);
        break;
    }

    const pendingSnapshot = await this.db.snapshots
      .where('tripId')
      .equals(tripId)
      .and(s => s.syncStatus === 'conflict')
      .first();

    if (pendingSnapshot) {
      await (this.db.snapshots.update as any)(pendingSnapshot.id, {
        syncStatus: 'synced',
        synced: true,
      });
    }

    return resolved;
  }

  async getSyncStatus(tripId: string): Promise<{
    status: SyncStatus;
    pendingOperations: number;
    lastSyncedAt?: string;
    hasConflicts: boolean;
  }> {
    const [pendingOps, snapshots] = await Promise.all([
      this.operationQueue.getPendingItems(),
      this.getSnapshots(tripId),
    ]);

    const tripOps = pendingOps.filter(op => op.payload.tripId === tripId);
    const hasConflicts = snapshots.some(s => s.syncStatus === 'conflict');
    const lastSnapshot = snapshots.find(s => s.synced);

    return {
      status: hasConflicts ? 'conflict' : tripOps.length > 0 ? 'pending' : 'synced',
      pendingOperations: tripOps.length,
      lastSyncedAt: lastSnapshot?.createdAt,
      hasConflicts,
    };
  }

  setAutoSync(enabled: boolean): void {
    this.autoSync = enabled;
  }

  stopAutoSync(): void {
    this.setAutoSync(false);
  }

  destroy(): void {
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
      this.unsubscribeNetwork = null;
    }
    this.listeners.clear();
  }

  static getInstance(): SyncEngine {
    return getSyncEngine();
  }
}

let syncEngineInstance: SyncEngine | null = null;

export const getSyncEngine = (): SyncEngine => {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine();
  }
  return syncEngineInstance;
};

export const destroySyncEngine = (): void => {
  if (syncEngineInstance) {
    syncEngineInstance.destroy();
    syncEngineInstance = null;
  }
};
