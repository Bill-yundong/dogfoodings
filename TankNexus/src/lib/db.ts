import { openDB, IDBPDatabase } from 'idb';
import type { WeldPoint, RealTimeData, SystemConfig, Alert } from '@/types';

const DB_NAME = 'tank-nexus-db';
const DB_VERSION = 1;

export interface TankNexusDB {
  weldPoints: WeldPoint;
  realtimeData: RealTimeData;
  alerts: Alert;
  systemConfig: { key: string; value: unknown };
}

let dbInstance: IDBPDatabase<TankNexusDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<TankNexusDB>> {
  if (dbInstance) return dbInstance;

  const db = await openDB<TankNexusDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('weldPoints')) {
        const weldStore = db.createObjectStore('weldPoints', { keyPath: 'id' });
        weldStore.createIndex('timestamp', 'timestamp');
        weldStore.createIndex('robotId', 'robotId');
        weldStore.createIndex('defectRisk', 'defectRisk');
        weldStore.createIndex('stabilityIndex', 'stabilityIndex');
      }

      if (!db.objectStoreNames.contains('realtimeData')) {
        const rtStore = db.createObjectStore('realtimeData', { keyPath: 'timestamp' });
        rtStore.createIndex('robotId', 'robotId');
        rtStore.createIndex('status', 'status');
      }

      if (!db.objectStoreNames.contains('alerts')) {
        const alertStore = db.createObjectStore('alerts', { keyPath: 'id' });
        alertStore.createIndex('timestamp', 'timestamp');
        alertStore.createIndex('severity', 'severity');
        alertStore.createIndex('acknowledged', 'acknowledged');
      }

      if (!db.objectStoreNames.contains('systemConfig')) {
        db.createObjectStore('systemConfig', { keyPath: 'key' });
      }
    },
  });

  dbInstance = db;
  return db;
}

export async function getDB(): Promise<IDBPDatabase<TankNexusDB>> {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

export async function addWeldPoint(point: WeldPoint): Promise<void> {
  const db = await getDB();
  await db.put('weldPoints', point);
}

export async function addWeldPointsBatch(points: WeldPoint[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('weldPoints', 'readwrite');
  await Promise.all([...points.map((p) => tx.store.put(p)), tx.done]);
}

export async function getWeldPoints(
  limit: number = 100,
  offset: number = 0
): Promise<WeldPoint[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('weldPoints', 'timestamp');
  return all.slice(offset, offset + limit).reverse();
}

export async function getWeldPointById(id: string): Promise<WeldPoint | undefined> {
  const db = await getDB();
  return db.get('weldPoints', id);
}

export async function getWeldPointsByRisk(
  risk: WeldPoint['defectRisk'],
  limit: number = 50
): Promise<WeldPoint[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('weldPoints', 'defectRisk', risk);
  return all.slice(0, limit).reverse();
}

export async function getWeldPointCount(): Promise<number> {
  const db = await getDB();
  return db.count('weldPoints');
}

export async function addRealtimeData(data: RealTimeData): Promise<void> {
  const db = await getDB();
  await db.put('realtimeData', data);
}

export async function getRecentRealtimeData(
  robotId: string,
  limit: number = 100
): Promise<RealTimeData[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('realtimeData', 'robotId', robotId);
  return all.slice(-limit);
}

export async function clearOldRealtimeData(before: number): Promise<void> {
  const db = await getDB();
  const keys = await db.getAllKeysFromIndex('realtimeData', 'timestamp', IDBKeyRange.upperBound(before));
  const tx = db.transaction('realtimeData', 'readwrite');
  await Promise.all([...keys.map((k) => tx.store.delete(k)), tx.done]);
}

export async function addAlert(alert: Alert): Promise<void> {
  const db = await getDB();
  await db.put('alerts', alert);
}

export async function getAlerts(limit: number = 50): Promise<Alert[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('alerts', 'timestamp');
  return all.slice(-limit).reverse();
}

export async function acknowledgeAlert(id: string): Promise<void> {
  const db = await getDB();
  const alert = await db.get('alerts', id);
  if (alert) {
    alert.acknowledged = true;
    await db.put('alerts', alert);
  }
}

export async function saveSystemConfig(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('systemConfig', { key, value });
}

export async function getSystemConfig<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const entry = await db.get('systemConfig', key);
  return entry?.value as T | undefined;
}

export async function clearDatabase(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['weldPoints', 'realtimeData', 'alerts'], 'readwrite');
  await Promise.all([tx.objectStore('weldPoints').clear(), tx.objectStore('realtimeData').clear(), tx.objectStore('alerts').clear(), tx.done]);
}
