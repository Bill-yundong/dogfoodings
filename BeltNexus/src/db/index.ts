import { openDB, IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, STORES, DBSchema } from './schema';

let dbInstance: IDBPDatabase<DBSchema> | null = null;

export async function initDB(): Promise<IDBPDatabase<DBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.SENSOR_DATA)) {
        const sensorDataStore = db.createObjectStore(STORES.SENSOR_DATA, {
          keyPath: 'id',
        });
        sensorDataStore.createIndex('timestamp', 'timestamp');
        sensorDataStore.createIndex('sensorId', 'sensorId');
        sensorDataStore.createIndex('position', 'position');
      }

      if (!db.objectStoreNames.contains(STORES.BELT_STATES)) {
        const beltStatesStore = db.createObjectStore(STORES.BELT_STATES, {
          keyPath: 'id',
        });
        beltStatesStore.createIndex('timestamp', 'timestamp');
        beltStatesStore.createIndex('healthScore', 'healthScore');
      }

      if (!db.objectStoreNames.contains(STORES.ALARMS)) {
        const alarmsStore = db.createObjectStore(STORES.ALARMS, {
          keyPath: 'id',
        });
        alarmsStore.createIndex('timestamp', 'timestamp');
        alarmsStore.createIndex('severity', 'severity');
        alarmsStore.createIndex('type', 'type');
        alarmsStore.createIndex('resolved', 'resolved');
      }

      if (!db.objectStoreNames.contains(STORES.WEAR_RECORDS)) {
        const wearRecordsStore = db.createObjectStore(STORES.WEAR_RECORDS, {
          keyPath: 'id',
        });
        wearRecordsStore.createIndex('date', 'date');
        wearRecordsStore.createIndex('beltId', 'beltId');
        wearRecordsStore.createIndex('position', 'position');
      }

      if (!db.objectStoreNames.contains(STORES.SENSORS)) {
        const sensorsStore = db.createObjectStore(STORES.SENSORS, {
          keyPath: 'id',
        });
        sensorsStore.createIndex('channel', 'channel');
        sensorsStore.createIndex('position', 'position');
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

export function getDB(): IDBPDatabase<DBSchema> | null {
  return dbInstance;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
