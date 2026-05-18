import { openDB, IDBPDatabase, DBSchema } from 'idb';
import type { PressureSnapshot, Warning, MOCConfig, PipelineNode, PipelineSegment, Valve } from '../types';

export interface SimulationRecord {
  id: string;
  name: string;
  createdAt: number;
  duration: number;
  config: MOCConfig;
  nodes: PipelineNode[];
  segments: PipelineSegment[];
  valves: Valve[];
  snapshotCount: number;
}

export interface SnapshotRecord {
  id: string;
  simulationId: string;
  timestamp: number;
  simulationTime: number;
  nodePressures: Record<string, number>;
  segmentPressures: Record<string, number[]>;
  valveStates: Record<string, number>;
  warnings: Warning[];
}

export interface WarningRecord {
  id: string;
  snapshotId: string;
  simulationId: string;
  type: string;
  severity: string;
  nodeId?: string;
  segmentId?: string;
  message: string;
  timestamp: number;
}

interface ValveLogicDB extends DBSchema {
  simulations: {
    key: string;
    value: SimulationRecord;
    indexes: { 'by-createdAt': number };
  };
  snapshots: {
    key: string;
    value: SnapshotRecord;
    indexes: { 'by-simulationId': string; 'by-simulationTime': [string, number] };
  };
  warnings: {
    key: string;
    value: WarningRecord;
    indexes: { 'by-simulationId': string; 'by-severity': string };
  };
}

const DB_NAME = 'valvelogic-db';
const DB_VERSION = 1;

let db: IDBPDatabase<ValveLogicDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<ValveLogicDB>> {
  if (db) return db;

  db = await openDB<ValveLogicDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('simulations')) {
        const simStore = db.createObjectStore('simulations', { keyPath: 'id' });
        simStore.createIndex('by-createdAt', 'createdAt');
      }

      if (!db.objectStoreNames.contains('snapshots')) {
        const snapStore = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapStore.createIndex('by-simulationId', 'simulationId');
        snapStore.createIndex('by-simulationTime', ['simulationId', 'simulationTime']);
      }

      if (!db.objectStoreNames.contains('warnings')) {
        const warnStore = db.createObjectStore('warnings', { keyPath: 'id' });
        warnStore.createIndex('by-simulationId', 'simulationId');
        warnStore.createIndex('by-severity', 'severity');
      }
    },
  });

  return db;
}

export function getDB(): IDBPDatabase<ValveLogicDB> | null {
  return db;
}

export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export async function clearAllData(): Promise<void> {
  const database = await initDB();
  const tx = database.transaction(['simulations', 'snapshots', 'warnings'], 'readwrite');
  await Promise.all([
    tx.objectStore('simulations').clear(),
    tx.objectStore('snapshots').clear(),
    tx.objectStore('warnings').clear(),
  ]);
  await tx.done;
}

export async function getStorageStats(): Promise<{
  simulations: number;
  snapshots: number;
  warnings: number;
  estimatedSize: number;
}> {
  const database = await initDB();
  const [simCount, snapCount, warnCount] = await Promise.all([
    database.count('simulations'),
    database.count('snapshots'),
    database.count('warnings'),
  ]);

  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      simulations: simCount,
      snapshots: snapCount,
      warnings: warnCount,
      estimatedSize: estimate.usage || 0,
    };
  }

  return {
    simulations: simCount,
    snapshots: snapCount,
    warnings: warnCount,
    estimatedSize: 0,
  };
}
