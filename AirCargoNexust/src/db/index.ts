import { openDB, IDBPDatabase } from 'idb';
import type { Cargo, LoadPlan, LoadSnapshot, AircraftSpec } from '@/types';

const DB_NAME = 'aircargo-nexus-db';
const DB_VERSION = 1;

let db: IDBPDatabase | null = null;

export async function initDB(): Promise<void> {
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('cargos')) {
        const cargoStore = db.createObjectStore('cargos', { keyPath: 'id' });
        cargoStore.createIndex('name', 'name', { unique: false });
        cargoStore.createIndex('weight', 'weight', { unique: false });
        cargoStore.createIndex('isDangerous', 'isDangerous', { unique: false });
        cargoStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('loadPlans')) {
        const planStore = db.createObjectStore('loadPlans', { keyPath: 'id' });
        planStore.createIndex('flightNumber', 'flightNumber', { unique: false });
        planStore.createIndex('aircraftType', 'aircraftType', { unique: false });
        planStore.createIndex('status', 'status', { unique: false });
        planStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('snapshots')) {
        const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapshotStore.createIndex('planId', 'planId', { unique: false });
        snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
        snapshotStore.createIndex('version', 'version', { unique: false });
      }

      if (!db.objectStoreNames.contains('aircraftSpecs')) {
        db.createObjectStore('aircraftSpecs', { keyPath: 'type' });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    }
  });
}

export function getDB(): IDBPDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

export async function getAllCargos(): Promise<Cargo[]> {
  return await getDB().getAll('cargos');
}

export async function getCargoById(id: string): Promise<Cargo | undefined> {
  return await getDB().get('cargos', id);
}

export async function saveCargo(cargo: Cargo): Promise<string> {
  return await getDB().put('cargos', cargo);
}

export async function deleteCargo(id: string): Promise<void> {
  await getDB().delete('cargos', id);
}

export async function saveCargosBatch(cargos: Cargo[]): Promise<void> {
  const tx = getDB().transaction('cargos', 'readwrite');
  for (const cargo of cargos) {
    tx.store.put(cargo);
  }
  await tx.done;
}

export async function getAllLoadPlans(): Promise<LoadPlan[]> {
  return await getDB().getAll('loadPlans');
}

export async function getLoadPlanById(id: string): Promise<LoadPlan | undefined> {
  return await getDB().get('loadPlans', id);
}

export async function saveLoadPlan(plan: LoadPlan): Promise<string> {
  return await getDB().put('loadPlans', plan);
}

export async function deleteLoadPlan(id: string): Promise<void> {
  await getDB().delete('loadPlans', id);
}

export async function getAllSnapshots(): Promise<LoadSnapshot[]> {
  return await getDB().getAll('snapshots');
}

export async function getSnapshotsByPlanId(planId: string): Promise<LoadSnapshot[]> {
  const index = getDB().transaction('snapshots').store.index('planId');
  return await index.getAll(planId);
}

export async function getSnapshotById(id: string): Promise<LoadSnapshot | undefined> {
  return await getDB().get('snapshots', id);
}

export async function saveSnapshot(snapshot: LoadSnapshot): Promise<string> {
  return await getDB().put('snapshots', snapshot);
}

export async function getAircraftSpec(type: string): Promise<AircraftSpec | undefined> {
  return await getDB().get('aircraftSpecs', type);
}

export async function saveAircraftSpec(spec: AircraftSpec): Promise<string> {
  return await getDB().put('aircraftSpecs', spec);
}

export async function getSetting(key: string): Promise<unknown | undefined> {
  const result = await getDB().get('settings', key);
  return result?.value;
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  await getDB().put('settings', { key, value });
}

export async function clearAllData(): Promise<void> {
  const tx = getDB().transaction(['cargos', 'loadPlans', 'snapshots'], 'readwrite');
  await Promise.all([
    tx.objectStore('cargos').clear(),
    tx.objectStore('loadPlans').clear(),
    tx.objectStore('snapshots').clear()
  ]);
  await tx.done;
}
