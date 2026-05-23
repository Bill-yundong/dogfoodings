export * from './db';
export * from './crdt';
export * from './network-monitor';
export * from './operation-queue';
export * from './sync-engine';

import { getDB, closeDB, deleteDB, isDBAvailable } from './db';
import { getNetworkMonitor, destroyNetworkMonitor } from './network-monitor';
import { getOperationQueue } from './operation-queue';
import { getSyncEngine, destroySyncEngine } from './sync-engine';
import { createCRDTResolver } from './crdt';

export const OfflineStorage = {
  getDB,
  closeDB,
  deleteDB,
  isDBAvailable,
  getNetworkMonitor,
  destroyNetworkMonitor,
  getOperationQueue,
  getSyncEngine,
  destroySyncEngine,
  createCRDTResolver,
};

export default OfflineStorage;
