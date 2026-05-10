import 'fake-indexeddb/auto';
import { afterEach, beforeEach } from 'vitest';
import { closeDB, clearAllStores } from '../src/db';
import { semanticSynchronizer } from '../src/sync/semanticSync';

beforeEach(async () => {
  globalThis.window = globalThis as typeof window;
  globalThis.navigator = {
    onLine: true,
    userAgent: 'Vitest',
  } as typeof navigator;

  closeDB();
  semanticSynchronizer.destroy();

  const indexedDB = (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB;
  if (indexedDB && indexedDB.deleteDatabase) {
    const databases = await indexedDB.databases?.();
    if (databases) {
      for (const dbInfo of databases) {
        if (dbInfo.name) {
          indexedDB.deleteDatabase(dbInfo.name);
        }
      }
    }
  }
});

afterEach(async () => {
  try {
    await clearAllStores();
  } catch (e) {
  }
  closeDB();
  semanticSynchronizer.destroy();
});
