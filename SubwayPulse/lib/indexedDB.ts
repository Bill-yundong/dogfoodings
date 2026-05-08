import { openDB, type IDBPDatabase } from "idb";
import type { TrafficSnapshot, CrowdPressure, TrainSchedule, CapacityPrediction } from "@/types";

const DB_NAME = "SubwayPulseDB";
const DB_VERSION = 1;
const SNAPSHOT_STORE = "trafficSnapshots";
const PRESSURE_STORE = "crowdPressures";
const SCHEDULE_STORE = "trainSchedules";
const PREDICTION_STORE = "capacityPredictions";

interface DBSchema {
  [SNAPSHOT_STORE]: {
    key: string;
    value: TrafficSnapshot;
    indexes: { "by-station": string; "by-timestamp": number };
  };
  [PRESSURE_STORE]: {
    key: string;
    value: CrowdPressure & { id: string };
    indexes: { "by-station": string; "by-timestamp": number };
  };
  [SCHEDULE_STORE]: {
    key: string;
    value: TrainSchedule;
    indexes: { "by-station": string; "by-timestamp": number };
  };
  [PREDICTION_STORE]: {
    key: string;
    value: CapacityPrediction & { id: string };
    indexes: { "by-station": string; "by-timestamp": number };
  };
}

let dbInstance: IDBPDatabase<DBSchema> | null = null;

async function getDB(): Promise<IDBPDatabase<DBSchema>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        const snapshotStore = db.createObjectStore(SNAPSHOT_STORE, { keyPath: "id" });
        snapshotStore.createIndex("by-station", "stationId");
        snapshotStore.createIndex("by-timestamp", "timestamp");
      }
      
      if (!db.objectStoreNames.contains(PRESSURE_STORE)) {
        const pressureStore = db.createObjectStore(PRESSURE_STORE, { keyPath: "id" });
        pressureStore.createIndex("by-station", "stationId");
        pressureStore.createIndex("by-timestamp", "timestamp");
      }
      
      if (!db.objectStoreNames.contains(SCHEDULE_STORE)) {
        const scheduleStore = db.createObjectStore(SCHEDULE_STORE, { keyPath: "id" });
        scheduleStore.createIndex("by-station", "stationId");
        scheduleStore.createIndex("by-timestamp", "arrivalTime");
      }
      
      if (!db.objectStoreNames.contains(PREDICTION_STORE)) {
        const predictionStore = db.createObjectStore(PREDICTION_STORE, { keyPath: "id" });
        predictionStore.createIndex("by-station", "stationId");
        predictionStore.createIndex("by-timestamp", "timestamp");
      }
    },
  });
  
  return dbInstance;
}

export async function saveSnapshot(snapshot: TrafficSnapshot): Promise<void> {
  const db = await getDB();
  await db.put(SNAPSHOT_STORE, snapshot);
}

export async function saveCrowdPressure(pressure: CrowdPressure): Promise<void> {
  const db = await getDB();
  const pressureWithId = { ...pressure, id: `${pressure.stationId}-${pressure.timestamp}` };
  await db.put(PRESSURE_STORE, pressureWithId);
}

export async function saveTrainSchedules(schedules: TrainSchedule[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(SCHEDULE_STORE, "readwrite");
  for (const schedule of schedules) {
    await tx.store.put(schedule);
  }
  await tx.done;
}

export async function saveCapacityPrediction(prediction: CapacityPrediction): Promise<void> {
  const db = await getDB();
  const predictionWithId = { ...prediction, id: `${prediction.stationId}-${prediction.timestamp}` };
  await db.put(PREDICTION_STORE, predictionWithId);
}

export async function getSnapshotsByStation(stationId: string, limit: number = 100): Promise<TrafficSnapshot[]> {
  const db = await getDB();
  const index = db.transaction(SNAPSHOT_STORE, "readonly").store.index("by-station");
  const results = [];
  let cursor = await index.openCursor(stationId);
  
  while (cursor && results.length < limit) {
    results.push(cursor.value);
    cursor = await cursor.continue();
  }
  
  return results.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getCrowdPressureByStation(
  stationId: string,
  startTime: number,
  endTime: number
): Promise<CrowdPressure[]> {
  const db = await getDB();
  const index = db.transaction(PRESSURE_STORE, "readonly").store.index("by-timestamp");
  const results: CrowdPressure[] = [];
  let cursor = await index.openCursor(IDBKeyRange.bound(startTime, endTime));
  
  while (cursor) {
    if (cursor.value.stationId === stationId) {
      results.push(cursor.value);
    }
    cursor = await cursor.continue();
  }
  
  return results;
}

export async function getLatestSnapshot(stationId: string): Promise<TrafficSnapshot | null> {
  const snapshots = await getSnapshotsByStation(stationId, 1);
  return snapshots[0] || null;
}

export async function clearOldData(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
  const db = await getDB();
  const cutoffTime = Date.now() - maxAgeMs;
  
  const stores = [SNAPSHOT_STORE, PRESSURE_STORE, SCHEDULE_STORE, PREDICTION_STORE] as const;
  
  for (const storeName of stores) {
    const index = db.transaction(storeName, "readwrite").store.index("by-timestamp");
    let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoffTime));
    
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }
}
