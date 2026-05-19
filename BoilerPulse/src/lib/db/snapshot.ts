import { getDB } from './index';
import { STORES } from './schema';
import type { WaveformSnapshot } from '$lib/types';

export async function saveSnapshot(snapshot: WaveformSnapshot): Promise<string> {
  const db = await getDB();
  return db.put(STORES.WAVEFORM_SNAPSHOTS, snapshot);
}

export async function getSnapshot(id: string): Promise<WaveformSnapshot | undefined> {
  const db = await getDB();
  return db.get(STORES.WAVEFORM_SNAPSHOTS, id);
}

export async function getSnapshotsByTimeRange(
  startTime: number,
  endTime: number
): Promise<WaveformSnapshot[]> {
  const db = await getDB();
  const index = db.transaction(STORES.WAVEFORM_SNAPSHOTS, 'readonly').store.index('by-startTime');
  const range = IDBKeyRange.bound(startTime, endTime);
  return index.getAll(range);
}

export async function getSnapshotsByTriggerType(triggerType: string): Promise<WaveformSnapshot[]> {
  const db = await getDB();
  const index = db.transaction(STORES.WAVEFORM_SNAPSHOTS, 'readonly').store.index('by-triggerType');
  return index.getAll(triggerType);
}

export async function getRecentSnapshots(limit: number = 20): Promise<WaveformSnapshot[]> {
  const db = await getDB();
  const index = db.transaction(STORES.WAVEFORM_SNAPSHOTS, 'readonly').store.index('by-createdAt');
  const cursor = await index.openCursor(null, 'prev');
  const results: WaveformSnapshot[] = [];
  let current = cursor;
  while (current && results.length < limit) {
    results.push(current.value);
    current = await current.continue();
  }
  return results;
}

export async function updateSnapshotTags(id: string, tags: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.WAVEFORM_SNAPSHOTS, 'readwrite');
  const snapshot = await tx.store.get(id);
  if (snapshot) {
    snapshot.tags = tags;
    await tx.store.put(snapshot);
  }
  await tx.done;
}

export async function updateSnapshotNotes(id: string, notes: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORES.WAVEFORM_SNAPSHOTS, 'readwrite');
  const snapshot = await tx.store.get(id);
  if (snapshot) {
    snapshot.notes = notes;
    await tx.store.put(snapshot);
  }
  await tx.done;
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORES.WAVEFORM_SNAPSHOTS, id);
}

export async function getSnapshotCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORES.WAVEFORM_SNAPSHOTS);
}
