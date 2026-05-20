import { openDB, IDBPDatabase } from 'idb';
import type { Snapshot, PressureData, Command, SystemSettings } from '@/types';

const DB_NAME = 'gas-matrix-db';
const DB_VERSION = 1;

export interface GasMatrixDB {
  snapshots: {
    key: string;
    value: Snapshot;
    indexes: { 'by-timestamp': number; 'by-period': string };
  };
  pressureHistory: {
    key: string;
    value: PressureData;
    indexes: { 'by-station': string; 'by-timestamp': number };
  };
  commandHistory: {
    key: string;
    value: Command;
    indexes: { 'by-station': string; 'by-status': string; 'by-issued': number };
  };
  systemSettings: {
    key: string;
    value: SystemSettings;
  };
}

let dbInstance: IDBPDatabase<GasMatrixDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<GasMatrixDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<GasMatrixDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('snapshots')) {
        const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapshotStore.createIndex('by-timestamp', 'timestamp');
        snapshotStore.createIndex('by-period', 'periodType');
      }

      if (!db.objectStoreNames.contains('pressureHistory')) {
        const pressureStore = db.createObjectStore('pressureHistory', { keyPath: 'id' });
        pressureStore.createIndex('by-station', 'stationId');
        pressureStore.createIndex('by-timestamp', 'timestamp');
      }

      if (!db.objectStoreNames.contains('commandHistory')) {
        const commandStore = db.createObjectStore('commandHistory', { keyPath: 'id' });
        commandStore.createIndex('by-station', 'stationId');
        commandStore.createIndex('by-status', 'status');
        commandStore.createIndex('by-issued', 'issuedAt');
      }

      if (!db.objectStoreNames.contains('systemSettings')) {
        db.createObjectStore('systemSettings', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

export async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  const db = await initDB();
  await db.put('snapshots', snapshot);
}

export async function getSnapshots(
  startTime?: number,
  endTime?: number,
  periodType?: string
): Promise<Snapshot[]> {
  const db = await initDB();
  let snapshots = await db.getAll('snapshots');

  if (startTime) {
    snapshots = snapshots.filter((s) => s.timestamp >= startTime);
  }
  if (endTime) {
    snapshots = snapshots.filter((s) => s.timestamp <= endTime);
  }
  if (periodType) {
    snapshots = snapshots.filter((s) => s.periodType === periodType);
  }

  return snapshots.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getSnapshotById(id: string): Promise<Snapshot | undefined> {
  const db = await initDB();
  return db.get('snapshots', id);
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await initDB();
  await db.delete('snapshots', id);
}

export async function savePressureData(data: PressureData): Promise<void> {
  const db = await initDB();
  await db.put('pressureHistory', data);
}

export async function getPressureHistory(
  stationId?: string,
  startTime?: number,
  endTime?: number,
  limit?: number
): Promise<PressureData[]> {
  const db = await initDB();
  let data: PressureData[];

  if (stationId) {
    data = await db.getAllFromIndex('pressureHistory', 'by-station', stationId);
  } else {
    data = await db.getAll('pressureHistory');
  }

  if (startTime) {
    data = data.filter((d) => d.timestamp >= startTime);
  }
  if (endTime) {
    data = data.filter((d) => d.timestamp <= endTime);
  }

  data.sort((a, b) => b.timestamp - a.timestamp);

  if (limit) {
    data = data.slice(0, limit);
  }

  return data;
}

export async function saveCommand(command: Command): Promise<void> {
  const db = await initDB();
  await db.put('commandHistory', command);
}

export async function getCommandHistory(
  stationId?: string,
  status?: string,
  startTime?: number,
  endTime?: number
): Promise<Command[]> {
  const db = await initDB();
  let commands: Command[];

  if (stationId) {
    commands = await db.getAllFromIndex('commandHistory', 'by-station', stationId);
  } else if (status) {
    commands = await db.getAllFromIndex('commandHistory', 'by-status', status);
  } else {
    commands = await db.getAll('commandHistory');
  }

  if (startTime) {
    commands = commands.filter((c) => c.issuedAt >= startTime);
  }
  if (endTime) {
    commands = commands.filter((c) => c.issuedAt <= endTime);
  }

  return commands.sort((a, b) => b.issuedAt - a.issuedAt);
}

export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  const db = await initDB();
  await db.put('systemSettings', { ...settings, key: 'default' } as any);
}

export async function getSystemSettings(): Promise<SystemSettings | undefined> {
  const db = await initDB();
  const settings = await db.get('systemSettings', 'default' as any);
  return settings as SystemSettings | undefined;
}

export async function clearOldData(daysToKeep: number = 30): Promise<void> {
  const db = await initDB();
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

  const pressureData = await db.getAll('pressureHistory');
  const oldPressureData = pressureData.filter((d) => d.timestamp < cutoffTime);
  
  for (const data of oldPressureData) {
    await db.delete('pressureHistory', data.id);
  }

  const commands = await db.getAll('commandHistory');
  const oldCommands = commands.filter((c) => c.issuedAt < cutoffTime);
  
  for (const cmd of oldCommands) {
    await db.delete('commandHistory', cmd.id);
  }
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
