import { openDB, type IDBPDatabase } from 'idb';
import type { UserSnapshot, SimulationTask, SimulationResult, DBSchema } from '$lib/types';

const DB_NAME = 'gridpulse-db';
const DB_VERSION = 1;

let db: IDBPDatabase<DBSchema> | null = null;

export async function initDB(): Promise<IDBPDatabase<DBSchema>> {
  if (db) return db;

  db = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('user_snapshots')) {
        const userSnapshotStore = db.createObjectStore('user_snapshots', { keyPath: 'id' });
        userSnapshotStore.createIndex('userId', 'userId', { unique: false });
        userSnapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
        userSnapshotStore.createIndex('flexibilityScore', 'flexibilityScore', { unique: false });
        userSnapshotStore.createIndex('patternType', 'patternType', { unique: false });
      }

      if (!db.objectStoreNames.contains('simulation_tasks')) {
        const taskStore = db.createObjectStore('simulation_tasks', { keyPath: 'id' });
        taskStore.createIndex('status', 'status', { unique: false });
        taskStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('simulation_results')) {
        db.createObjectStore('simulation_results', { keyPath: 'taskId' });
      }

      if (!db.objectStoreNames.contains('system_settings')) {
        db.createObjectStore('system_settings', { keyPath: 'key' });
      }
    }
  });

  return db;
}

export async function closeDB(): Promise<void> {
  if (db) {
    db.close();
    db = null;
  }
}

export async function addUserSnapshot(snapshot: UserSnapshot): Promise<string> {
  const database = await initDB();
  return database.add('user_snapshots', snapshot);
}

export async function addUserSnapshotsBatch(snapshots: UserSnapshot[]): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('user_snapshots', 'readwrite');
  
  const BATCH_SIZE = 100;
  for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
    const batch = snapshots.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(s => tx.store.add(s)));
  }
  
  await tx.done;
}

export async function getUserSnapshots(
  options?: {
    limit?: number;
    offset?: number;
    patternType?: string;
    minFlexibility?: number;
  }
): Promise<UserSnapshot[]> {
  const database = await initDB();
  const { limit = 50, offset = 0, patternType, minFlexibility } = options || {};
  
  let index = null;
  let range = null;
  
  if (patternType) {
    index = 'patternType';
    range = IDBKeyRange.only(patternType);
  } else if (minFlexibility !== undefined) {
    index = 'flexibilityScore';
    range = IDBKeyRange.lowerBound(minFlexibility);
  }
  
  const results: UserSnapshot[] = [];
  let cursor = index 
    ? await database.transaction('user_snapshots', 'readonly').store.index(index).openCursor(range)
    : await database.transaction('user_snapshots', 'readonly').store.openCursor();
  
  let count = 0;
  let skipped = 0;
  
  while (cursor && count < limit) {
    if (skipped < offset) {
      skipped++;
      cursor = await cursor.continue();
      continue;
    }
    results.push(cursor.value);
    count++;
    cursor = await cursor.continue();
  }
  
  return results;
}

export async function getUserSnapshotCount(): Promise<number> {
  const database = await initDB();
  return database.count('user_snapshots');
}

export async function addSimulationTask(task: SimulationTask): Promise<string> {
  const database = await initDB();
  return database.add('simulation_tasks', task);
}

export async function updateSimulationTask(task: SimulationTask): Promise<void> {
  const database = await initDB();
  await database.put('simulation_tasks', task);
}

export async function getSimulationTasks(limit: number = 20): Promise<SimulationTask[]> {
  const database = await initDB();
  return database.getAllFromIndex('simulation_tasks', 'createdAt', null, limit);
}

export async function addSimulationResult(result: SimulationResult): Promise<string> {
  const database = await initDB();
  return database.add('simulation_results', result);
}

export async function getSimulationResult(taskId: string): Promise<SimulationResult | undefined> {
  const database = await initDB();
  return database.get('simulation_results', taskId);
}

export async function setSystemSetting<T>(key: string, value: T): Promise<void> {
  const database = await initDB();
  await database.put('system_settings', { key, value });
}

export async function getSystemSetting<T>(key: string): Promise<T | undefined> {
  const database = await initDB();
  const result = await database.get('system_settings', key);
  return result?.value as T | undefined;
}

export async function generateMockUserSnapshots(count: number): Promise<void> {
  const patternTypes: Array<UserSnapshot['patternType']> = [
    'morning-peak', 'evening-peak', 'flat', 'night-owl', 'industrial'
  ];
  
  const snapshots: UserSnapshot[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const patternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
    const baseLoad = 1 + Math.random() * 4;
    
    let hourlyConsumption: number[];
    switch (patternType) {
      case 'morning-peak':
        hourlyConsumption = Array.from({ length: 24 }, (_, h) => {
          const peak = h >= 6 && h <= 9 ? 1.5 : 0.7;
          return baseLoad * peak * (0.8 + Math.random() * 0.4);
        });
        break;
      case 'evening-peak':
        hourlyConsumption = Array.from({ length: 24 }, (_, h) => {
          const peak = h >= 17 && h <= 22 ? 1.6 : 0.6;
          return baseLoad * peak * (0.8 + Math.random() * 0.4);
        });
        break;
      case 'flat':
        hourlyConsumption = Array.from({ length: 24 }, () => 
          baseLoad * (0.9 + Math.random() * 0.2)
        );
        break;
      case 'night-owl':
        hourlyConsumption = Array.from({ length: 24 }, (_, h) => {
          const peak = h >= 20 || h <= 2 ? 1.5 : 0.5;
          return baseLoad * peak * (0.8 + Math.random() * 0.4);
        });
        break;
      case 'industrial':
        hourlyConsumption = Array.from({ length: 24 }, (_, h) => {
          const peak = h >= 8 && h <= 18 ? 1.8 : 0.3;
          return baseLoad * peak * (0.9 + Math.random() * 0.2);
        });
        break;
      default:
        hourlyConsumption = Array.from({ length: 24 }, () => baseLoad);
    }
    
    const peakLoad = Math.max(...hourlyConsumption);
    const averageLoad = hourlyConsumption.reduce((a, b) => a + b, 0) / 24;
    
    snapshots.push({
      id: `snap-${i.toString().padStart(6, '0')}`,
      userId: `user-${i.toString().padStart(6, '0')}`,
      timestamp: new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000),
      loadFeatures: {
        hourlyConsumption,
        peakLoad,
        averageLoad,
        loadFactor: averageLoad / peakLoad,
        maxDailyVariation: peakLoad - Math.min(...hourlyConsumption),
        temperatureSensitivity: Math.random() * 0.5
      },
      flexibilityScore: Math.random(),
      patternType
    });
  }
  
  await addUserSnapshotsBatch(snapshots);
}
