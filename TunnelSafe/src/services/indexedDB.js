import { openDB } from 'idb';

const DB_NAME = 'tunnel_safe_db';
const DB_VERSION = 1;
const STORES = {
  LIGHTING_NODES: 'lighting_nodes',
  SNAPSHOTS: 'snapshots',
  EVENT_LOGS: 'event_logs'
};

let dbPromise = null;

export const initDB = async () => {
  if (dbPromise) return dbPromise;
  
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.LIGHTING_NODES)) {
        const lightingStore = db.createObjectStore(STORES.LIGHTING_NODES, { 
          keyPath: 'id' 
        });
        lightingStore.createIndex('zone', 'zone', { unique: false });
        lightingStore.createIndex('status', 'status', { unique: false });
        lightingStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.SNAPSHOTS)) {
        const snapshotStore = db.createObjectStore(STORES.SNAPSHOTS, { 
          keyPath: 'snapshotId' 
        });
        snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
        snapshotStore.createIndex('type', 'type', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.EVENT_LOGS)) {
        const logsStore = db.createObjectStore(STORES.EVENT_LOGS, { 
          keyPath: 'logId',
          autoIncrement: true 
        });
        logsStore.createIndex('timestamp', 'timestamp', { unique: false });
        logsStore.createIndex('type', 'type', { unique: false });
      }
    },
  });
  
  return dbPromise;
};

export const getDB = async () => {
  if (!dbPromise) {
    return initDB();
  }
  return dbPromise;
};

export const generateLightingNodes = async (count = 10000) => {
  const nodes = [];
  const zones = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'];
  
  for (let i = 1; i <= count; i++) {
    const brightness = 80 + Math.random() * 20;
    nodes.push({
      id: `LIGHT-${String(i).padStart(6, '0')}`,
      zone: zones[Math.floor(Math.random() * zones.length)],
      position: {
        x: Math.random() * 100,
        y: Math.random() * 100
      },
      brightness: Math.round(brightness * 100) / 100,
      status: 'normal',
      powerConsumption: 15 + Math.random() * 10,
      lastUpdated: Date.now()
    });
  }
  
  const db = await getDB();
  const tx = db.transaction(STORES.LIGHTING_NODES, 'readwrite');
  const store = tx.store;
  
  for (const node of nodes) {
    await store.put(node);
  }
  
  await tx.done;
  return nodes.length;
};

export const getAllLightingNodes = async () => {
  const db = await getDB();
  return db.getAll(STORES.LIGHTING_NODES);
};

export const getLightingNodesByZone = async (zone) => {
  const db = await getDB();
  const index = db.transaction(STORES.LIGHTING_NODES).store.index('zone');
  return index.getAll(zone);
};

export const updateLightingNode = async (nodeId, updates) => {
  const db = await getDB();
  const node = await db.get(STORES.LIGHTING_NODES, nodeId);
  
  if (node) {
    const updatedNode = {
      ...node,
      ...updates,
      lastUpdated: Date.now()
    };
    await db.put(STORES.LIGHTING_NODES, updatedNode);
    return updatedNode;
  }
  return null;
};

export const updateLightingNodesInBatch = async (zone, updates) => {
  const db = await getDB();
  const nodes = await getLightingNodesByZone(zone);
  const tx = db.transaction(STORES.LIGHTING_NODES, 'readwrite');
  const store = tx.store;
  
  for (const node of nodes) {
    await store.put({
      ...node,
      ...updates,
      lastUpdated: Date.now()
    });
  }
  
  await tx.done;
  return nodes.length;
};

export const createSnapshot = async (type, data) => {
  const db = await getDB();
  const snapshotId = `${type}-${Date.now()}`;
  const snapshot = {
    snapshotId,
    type,
    timestamp: Date.now(),
    data,
    nodeCount: data.nodes?.length || 0
  };
  
  await db.put(STORES.SNAPSHOTS, snapshot);
  return snapshot;
};

export const getLatestSnapshot = async (type) => {
  const db = await getDB();
  const index = db.transaction(STORES.SNAPSHOTS).store.index('timestamp');
  const cursor = await index.openCursor(null, 'prev');
  
  if (cursor) {
    let current = cursor.value;
    while (current) {
      if (current.type === type) {
        return current;
      }
      current = await cursor.continue();
    }
  }
  return null;
};

export const getSnapshotsByType = async (type, limit = 10) => {
  const db = await getDB();
  const index = db.transaction(STORES.SNAPSHOTS).store.index('timestamp');
  const cursor = await index.openCursor(null, 'prev');
  
  const results = [];
  if (cursor) {
    let current = cursor.value;
    while (current && results.length < limit) {
      if (current.type === type) {
        results.push(current);
      }
      current = await cursor.continue();
    }
  }
  return results;
};

export const clearOldSnapshots = async (keepLatest = 20) => {
  const db = await getDB();
  const index = db.transaction(STORES.SNAPSHOTS).store.index('timestamp');
  const cursor = await index.openCursor(null, 'prev');
  
  let count = 0;
  const tx = db.transaction(STORES.SNAPSHOTS, 'readwrite');
  
  if (cursor) {
    let current = cursor.value;
    while (current) {
      count++;
      if (count > keepLatest) {
        await tx.store.delete(current.snapshotId);
      }
      current = await cursor.continue();
    }
  }
  
  await tx.done;
  return count > keepLatest ? count - keepLatest : 0;
};

export const addEventLog = async (type, message, metadata = {}) => {
  const db = await getDB();
  return db.add(STORES.EVENT_LOGS, {
    type,
    message,
    metadata,
    timestamp: Date.now()
  });
};

export const getRecentLogs = async (limit = 50) => {
  const db = await getDB();
  const index = db.transaction(STORES.EVENT_LOGS).store.index('timestamp');
  const cursor = await index.openCursor(null, 'prev');
  
  const logs = [];
  if (cursor) {
    let current = cursor.value;
    while (current && logs.length < limit) {
      logs.push(current);
      current = await cursor.continue();
    }
  }
  return logs;
};

export const getLightingStats = async () => {
  const nodes = await getAllLightingNodes();
  const stats = {
    total: nodes.length,
    normal: 0,
    warning: 0,
    alert: 0,
    offline: 0,
    byZone: {},
    avgBrightness: 0
  };
  
  let totalBrightness = 0;
  
  for (const node of nodes) {
    stats[node.status] = (stats[node.status] || 0) + 1;
    stats.byZone[node.zone] = (stats.byZone[node.zone] || 0) + 1;
    totalBrightness += node.brightness;
  }
  
  stats.avgBrightness = nodes.length > 0 ? totalBrightness / nodes.length : 0;
  return stats;
};

export default {
  initDB,
  generateLightingNodes,
  getAllLightingNodes,
  getLightingNodesByZone,
  updateLightingNode,
  updateLightingNodesInBatch,
  createSnapshot,
  getLatestSnapshot,
  getSnapshotsByType,
  clearOldSnapshots,
  addEventLog,
  getRecentLogs,
  getLightingStats
};
