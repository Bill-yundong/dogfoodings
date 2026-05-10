import { openDB } from 'idb';

const DB_NAME = 'BusPulseDB';
const DB_VERSION = 1;

const STORES = {
  STOPS: 'stops',
  ROUTES: 'routes',
  GPS_POINTS: 'gpsPoints',
  TRAJECTORY_OFFSETS: 'trajectoryOffsets',
  PUNCTUALITY_METRICS: 'punctualityMetrics',
  PASSENGER_FLOW: 'passengerFlow',
  SCHEDULES: 'schedules',
  SCHEDULE_ADJUSTMENTS: 'scheduleAdjustments'
};

let dbPromise = null;

export async function initDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.STOPS)) {
          const stopsStore = db.createObjectStore(STORES.STOPS, { keyPath: 'id' });
          stopsStore.createIndex('routeId', 'routeId', { unique: false });
          stopsStore.createIndex('order', 'order', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.ROUTES)) {
          db.createObjectStore(STORES.ROUTES, { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains(STORES.GPS_POINTS)) {
          const gpsStore = db.createObjectStore(STORES.GPS_POINTS, { 
            keyPath: ['busId', 'timestamp'] 
          });
          gpsStore.createIndex('busId', 'busId', { unique: false });
          gpsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.TRAJECTORY_OFFSETS)) {
          const offsetStore = db.createObjectStore(STORES.TRAJECTORY_OFFSETS, { 
            keyPath: ['busId', 'timestamp'] 
          });
          offsetStore.createIndex('routeId', 'routeId', { unique: false });
          offsetStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.PUNCTUALITY_METRICS)) {
          const metricsStore = db.createObjectStore(STORES.PUNCTUALITY_METRICS, { 
            keyPath: ['routeId', 'timestamp'] 
          });
          metricsStore.createIndex('routeId', 'routeId', { unique: false });
          metricsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.PASSENGER_FLOW)) {
          const flowStore = db.createObjectStore(STORES.PASSENGER_FLOW, { 
            keyPath: ['stopId', 'timestamp'] 
          });
          flowStore.createIndex('stopId', 'stopId', { unique: false });
          flowStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.SCHEDULES)) {
          const scheduleStore = db.createObjectStore(STORES.SCHEDULES, { 
            keyPath: 'id' 
          });
          scheduleStore.createIndex('routeId', 'routeId', { unique: false });
          scheduleStore.createIndex('busId', 'busId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.SCHEDULE_ADJUSTMENTS)) {
          const adjustmentStore = db.createObjectStore(STORES.SCHEDULE_ADJUSTMENTS, { 
            autoIncrement: true 
          });
          adjustmentStore.createIndex('scheduleId', 'scheduleId', { unique: false });
          adjustmentStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveStop(stop) {
  const db = await initDB();
  return db.put(STORES.STOPS, stop);
}

export async function saveStopsInBatch(stops, batchSize = 500) {
  const db = await initDB();
  const tx = db.transaction(STORES.STOPS, 'readwrite');
  
  for (let i = 0; i < stops.length; i += batchSize) {
    const batch = stops.slice(i, i + batchSize);
    await Promise.all(batch.map(stop => tx.store.put(stop)));
  }
  
  await tx.done;
}

export async function getAllStops() {
  const db = await initDB();
  return db.getAll(STORES.STOPS);
}

export async function getStopsByRoute(routeId) {
  const db = await initDB();
  return db.getAllFromIndex(STORES.STOPS, 'routeId', routeId);
}

export async function saveRoute(route) {
  const db = await initDB();
  return db.put(STORES.ROUTES, route);
}

export async function getAllRoutes() {
  const db = await initDB();
  return db.getAll(STORES.ROUTES);
}

export async function saveGPSPoint(gpsPoint) {
  const db = await initDB();
  return db.put(STORES.GPS_POINTS, gpsPoint);
}

export async function getGPSPointsByBus(busId, startTime, endTime) {
  const db = await initDB();
  const tx = db.transaction(STORES.GPS_POINTS, 'readonly');
  const index = tx.store.index('timestamp');
  
  const results = [];
  let cursor = await index.openCursor();
  
  while (cursor) {
    const point = cursor.value;
    if (point.busId === busId && 
        point.timestamp >= startTime && 
        point.timestamp <= endTime) {
      results.push(point);
    }
    cursor = await cursor.continue();
  }
  
  return results;
}

export async function saveTrajectoryOffset(offset) {
  const db = await initDB();
  return db.put(STORES.TRAJECTORY_OFFSETS, offset);
}

export async function getTrajectoryOffsetsByRoute(routeId, startTime, endTime) {
  const db = await initDB();
  const tx = db.transaction(STORES.TRAJECTORY_OFFSETS, 'readonly');
  const index = tx.store.index('timestamp');
  
  const results = [];
  let cursor = await index.openCursor();
  
  while (cursor) {
    const offset = cursor.value;
    if (offset.routeId === routeId && 
        offset.timestamp >= startTime && 
        offset.timestamp <= endTime) {
      results.push(offset);
    }
    cursor = await cursor.continue();
  }
  
  return results;
}

export async function savePunctualityMetrics(metrics) {
  const db = await initDB();
  return db.put(STORES.PUNCTUALITY_METRICS, metrics);
}

export async function getPunctualityMetricsByRoute(routeId, startTime, endTime) {
  const db = await initDB();
  const tx = db.transaction(STORES.PUNCTUALITY_METRICS, 'readonly');
  const index = tx.store.index('timestamp');
  
  const results = [];
  let cursor = await index.openCursor();
  
  while (cursor) {
    const metrics = cursor.value;
    if (metrics.routeId === routeId && 
        metrics.timestamp >= startTime && 
        metrics.timestamp <= endTime) {
      results.push(metrics);
    }
    cursor = await cursor.continue();
  }
  
  return results;
}

export async function savePassengerFlow(flow) {
  const db = await initDB();
  return db.put(STORES.PASSENGER_FLOW, flow);
}

export async function savePassengerFlowInBatch(flows, batchSize = 500) {
  const db = await initDB();
  const tx = db.transaction(STORES.PASSENGER_FLOW, 'readwrite');
  
  for (let i = 0; i < flows.length; i += batchSize) {
    const batch = flows.slice(i, i + batchSize);
    await Promise.all(batch.map(flow => tx.store.put(flow)));
  }
  
  await tx.done;
}

export async function getPassengerFlowByStop(stopId, startTime, endTime) {
  const db = await initDB();
  const tx = db.transaction(STORES.PASSENGER_FLOW, 'readonly');
  const index = tx.store.index('timestamp');
  
  const results = [];
  let cursor = await index.openCursor();
  
  while (cursor) {
    const flow = cursor.value;
    if (flow.stopId === stopId && 
        flow.timestamp >= startTime && 
        flow.timestamp <= endTime) {
      results.push(flow);
    }
    cursor = await cursor.continue();
  }
  
  return results;
}

export async function saveSchedule(schedule) {
  const db = await initDB();
  return db.put(STORES.SCHEDULES, schedule);
}

export async function getSchedulesByRoute(routeId) {
  const db = await initDB();
  return db.getAllFromIndex(STORES.SCHEDULES, 'routeId', routeId);
}

export async function saveScheduleAdjustment(adjustment) {
  const db = await initDB();
  return db.add(STORES.SCHEDULE_ADJUSTMENTS, adjustment);
}

export async function getScheduleAdjustments(scheduleId) {
  const db = await initDB();
  return db.getAllFromIndex(STORES.SCHEDULE_ADJUSTMENTS, 'scheduleId', scheduleId);
}

export async function clearAllData() {
  const db = await initDB();
  await Promise.all(
    Object.values(STORES).map(store => db.clear(store))
  );
}

export async function getStats() {
  const db = await initDB();
  const stats = {};
  
  for (const storeName of Object.values(STORES)) {
    stats[storeName] = await db.count(storeName);
  }
  
  return stats;
}

export { STORES };
