import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { HistoricalTidalRecord, GeoLocation, LocationAnalysis, TidalData } from '../types/tidal';

interface TidalDB extends DBSchema {
  historicalRecords: {
    key: number;
    value: HistoricalTidalRecord;
    indexes: {
      'by-location': string;
      'by-timestamp': number;
      'by-location-timestamp': [string, number];
    };
  };
  locationAnalysis: {
    key: string;
    value: LocationAnalysis;
  };
  metadata: {
    key: string;
    value: {
      lastSync: number;
      version: string;
    };
  };
}

const DB_NAME = 'TidalNexusDB';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<TidalDB> | null = null;

export const initDB = async (): Promise<IDBPDatabase<TidalDB>> => {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<TidalDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('historicalRecords')) {
        const historicalStore = db.createObjectStore('historicalRecords', {
          keyPath: 'id',
          autoIncrement: true,
        });
        historicalStore.createIndex('by-location', 'locationId');
        historicalStore.createIndex('by-timestamp', 'timestamp');
        historicalStore.createIndex('by-location-timestamp', ['locationId', 'timestamp']);
      }

      if (!db.objectStoreNames.contains('locationAnalysis')) {
        db.createObjectStore('locationAnalysis', {
          keyPath: 'locationId',
        });
      }

      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata');
      }
    },
  });

  return dbInstance;
};

export const getDB = async (): Promise<IDBPDatabase<TidalDB>> => {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
};

export const closeDB = () => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};

export const saveHistoricalRecord = async (
  record: Omit<HistoricalTidalRecord, 'id'>
): Promise<number> => {
  const db = await getDB();
  return db.add('historicalRecords', { ...record, createdAt: Date.now() });
};

export const saveHistoricalRecords = async (
  records: Omit<HistoricalTidalRecord, 'id'>[]
): Promise<number[]> => {
  const db = await getDB();
  const tx = db.transaction('historicalRecords', 'readwrite');
  
  const promises = records.map((record) =>
    tx.store.add({ ...record, createdAt: Date.now() })
  );
  
  const results = await Promise.all(promises);
  await tx.done;
  
  return results;
};

export const getHistoricalRecordsByLocation = async (
  locationId: string,
  startTime?: number,
  endTime?: number
): Promise<HistoricalTidalRecord[]> => {
  const db = await getDB();
  
  if (startTime !== undefined && endTime !== undefined) {
    const index = db.transaction('historicalRecords').store.index('by-location-timestamp');
    const range = IDBKeyRange.bound([locationId, startTime], [locationId, endTime]);
    return index.getAll(range);
  }
  
  const index = db.transaction('historicalRecords').store.index('by-location');
  return index.getAll(locationId);
};

export const getHistoricalRecordsByTimeRange = async (
  startTime: number,
  endTime: number
): Promise<HistoricalTidalRecord[]> => {
  const db = await getDB();
  const index = db.transaction('historicalRecords').store.index('by-timestamp');
  const range = IDBKeyRange.bound(startTime, endTime);
  return index.getAll(range);
};

export const saveLocationAnalysis = async (
  analysis: LocationAnalysis
): Promise<string> => {
  const db = await getDB();
  return db.put('locationAnalysis', analysis);
};

export const getLocationAnalysis = async (
  locationId: string
): Promise<LocationAnalysis | undefined> => {
  const db = await getDB();
  return db.get('locationAnalysis', locationId);
};

export const getAllLocationAnalysis = async (): Promise<LocationAnalysis[]> => {
  const db = await getDB();
  return db.getAll('locationAnalysis');
};

export const deleteOldRecords = async (
  olderThan: number
): Promise<number> => {
  const db = await getDB();
  const tx = db.transaction('historicalRecords', 'readwrite');
  const index = tx.store.index('by-timestamp');
  const range = IDBKeyRange.upperBound(olderThan);
  
  let count = 0;
  let cursor = await index.openCursor(range);
  
  while (cursor) {
    await cursor.delete();
    count++;
    cursor = await cursor.continue();
  }
  
  await tx.done;
  return count;
};

export const getRecordCount = async (): Promise<number> => {
  const db = await getDB();
  return db.count('historicalRecords');
};

export const setLastSyncTime = async (timestamp: number): Promise<void> => {
  const db = await getDB();
  await db.put('metadata', { lastSync: timestamp, version: '1.0.0' }, 'syncInfo');
};

export const getLastSyncTime = async (): Promise<number | null> => {
  const db = await getDB();
  const metadata = await db.get('metadata', 'syncInfo');
  return metadata?.lastSync || null;
};

export const locationToId = (location: GeoLocation): string => {
  const lat = location.latitude.toFixed(4);
  const lon = location.longitude.toFixed(4);
  return `loc_${lat}_${lon}`;
};

export const tidalDataToHistoricalRecord = (
  tidalData: TidalData,
  location: GeoLocation
): Omit<HistoricalTidalRecord, 'id'> => ({
  locationId: locationToId(location),
  timestamp: tidalData.timestamp,
  waterLevel: tidalData.waterLevel,
  velocityMagnitude: tidalData.velocity.magnitude,
  velocityDirection: tidalData.velocity.direction,
  createdAt: Date.now(),
});

export const clearAllHistoricalRecords = async (): Promise<number> => {
  const db = await getDB();
  const count = await db.count('historicalRecords');
  if (count > 0) {
    await db.clear('historicalRecords');
  }
  return count;
};

export const clearAllLocationAnalysis = async (): Promise<number> => {
  const db = await getDB();
  const count = await db.count('locationAnalysis');
  if (count > 0) {
    await db.clear('locationAnalysis');
  }
  return count;
};

export const clearMetadata = async (): Promise<void> => {
  const db = await getDB();
  await db.clear('metadata');
};

export const resetAllCache = async (): Promise<{
  historicalRecords: number;
  locationAnalysis: number;
}> => {
  const historicalCount = await clearAllHistoricalRecords();
  const analysisCount = await clearAllLocationAnalysis();
  await clearMetadata();
  
  return {
    historicalRecords: historicalCount,
    locationAnalysis: analysisCount,
  };
};

export const deleteDatabase = async (): Promise<void> => {
  closeDB();
  const { deleteDB } = await import('idb');
  await deleteDB(DB_NAME);
};

export const estimateDatabaseSize = async (): Promise<{
  recordCount: number;
  estimatedSizeKB: number;
}> => {
  const db = await getDB();
  const recordCount = await db.count('historicalRecords');
  const analysisCount = await db.count('locationAnalysis');
  
  const avgRecordSizeBytes = 150;
  const avgAnalysisSizeBytes = 300;
  const totalSizeBytes = (recordCount * avgRecordSizeBytes) + (analysisCount * avgAnalysisSizeBytes);
  
  return {
    recordCount: recordCount + analysisCount,
    estimatedSizeKB: Math.round(totalSizeBytes / 1024 * 100) / 100,
  };
};