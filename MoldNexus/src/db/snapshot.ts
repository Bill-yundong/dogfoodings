import { getDB } from './index';
import type { Snapshot } from '../types';

export async function createSnapshot(snapshot: Omit<Snapshot, 'id' | 'createdAt'>): Promise<Snapshot> {
  const db = getDB();
  const newSnapshot: Snapshot = {
    ...snapshot,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await db.add('snapshots', newSnapshot);
  return newSnapshot;
}

export async function getSnapshot(id: string): Promise<Snapshot | undefined> {
  const db = getDB();
  return db.get('snapshots', id);
}

export async function listSnapshots(
  simulationId: string,
  options?: { limit?: number; offset?: number }
): Promise<Snapshot[]> {
  const db = getDB();
  let snapshots = await db.getAllFromIndex('snapshots', 'by-simulationId', simulationId);
  snapshots.sort((a, b) => b.version - a.version);

  if (options?.offset) {
    snapshots = snapshots.slice(options.offset);
  }
  if (options?.limit) {
    snapshots = snapshots.slice(0, options.limit);
  }

  return snapshots;
}

export async function getLatestSnapshot(simulationId: string): Promise<Snapshot | undefined> {
  const db = getDB();
  const snapshots = await db.getAllFromIndex('snapshots', 'by-simulationId', simulationId);
  if (snapshots.length === 0) return undefined;
  return snapshots.reduce((latest, current) =>
    current.version > latest.version ? current : latest
  );
}

export async function getSnapshotByVersion(simulationId: string, version: number): Promise<Snapshot | undefined> {
  const db = getDB();
  const snapshots = await db.getAllFromIndex('snapshots', 'by-simulationId', simulationId);
  return snapshots.find(s => s.version === version);
}

export async function countSnapshots(simulationId: string): Promise<number> {
  const db = getDB();
  return db.countFromIndex('snapshots', 'by-simulationId', simulationId);
}

export async function deleteSnapshotsBySimulation(simulationId: string): Promise<void> {
  const db = getDB();
  const tx = db.transaction('snapshots', 'readwrite');
  const index = tx.store.index('by-simulationId');
  let cursor = await index.openCursor(simulationId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function bulkCreateSnapshots(snapshots: Omit<Snapshot, 'id' | 'createdAt'>[]): Promise<Snapshot[]> {
  const db = getDB();
  const tx = db.transaction('snapshots', 'readwrite');
  const now = Date.now();
  const result: Snapshot[] = [];

  for (const snapshot of snapshots) {
    const newSnapshot: Snapshot = {
      ...snapshot,
      id: crypto.randomUUID(),
      createdAt: now,
    };
    await tx.store.add(newSnapshot);
    result.push(newSnapshot);
  }

  await tx.done;
  return result;
}
