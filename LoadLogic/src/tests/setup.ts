import { afterEach, beforeEach } from 'vitest';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

beforeEach(() => {
  globalThis.indexedDB = indexedDB;
  globalThis.IDBKeyRange = IDBKeyRange;
});

afterEach(() => {
  const dbNames = (indexedDB as any)._databases?.keys() || [];
  for (const name of dbNames) {
    indexedDB.deleteDatabase(name);
  }
});
