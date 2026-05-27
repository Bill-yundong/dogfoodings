import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

class MockDB {
  private stores: Map<string, Map<string, unknown>> = new Map();
  private indexes: Map<string, Map<string, Map<unknown, unknown[]>>> = new Map();

  open(name: string, version: number, onUpgrade?: (db: MockDB) => void) {
    if (onUpgrade) onUpgrade(this);
    return Promise.resolve(this);
  }

  createObjectStore(name: string, options?: { keyPath?: string }) {
    this.stores.set(name, new Map());
    this.indexes.set(name, new Map());
    return {
      createIndex: (indexName: string, _keyPath: string) => {
        this.indexes.get(name)!.set(indexName, new Map());
      },
    };
  }

  async put(storeName: string, value: unknown) {
    const store = this.stores.get(storeName);
    if (!store) throw new Error(`No objectStore named ${storeName}`);
    const record = value as Record<string, unknown>;
    const keyPath = 'id';
    store.set(record[keyPath] as string, value);
    return undefined;
  }

  async get(storeName: string, key: string) {
    const store = this.stores.get(storeName);
    if (!store) throw new Error(`No objectStore named ${storeName}`);
    return store.get(key);
  }

  async getAllFromIndex(storeName: string, indexName: string) {
    const store = this.stores.get(storeName);
    if (!store) throw new Error(`No objectStore named ${storeName}`);
    return Array.from(store.values());
  }

  async getAll(storeName: string) {
    const store = this.stores.get(storeName);
    if (!store) throw new Error(`No objectStore named ${storeName}`);
    return Array.from(store.values());
  }

  async delete(storeName: string, key: string) {
    const store = this.stores.get(storeName);
    if (!store) throw new Error(`No objectStore named ${storeName}`);
    store.delete(key);
  }

  async count(storeName: string) {
    const store = this.stores.get(storeName);
    if (!store) throw new Error(`No objectStore named ${storeName}`);
    return store.size;
  }

  objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
    [Symbol.iterator]: function* () {},
  };
}

const mockDB = new MockDB();

vi.mock('idb', () => ({
  openDB: (name: string, version: number, options?: { upgrade?: (db: MockDB) => void }) => {
    if (options?.upgrade) options.upgrade(mockDB);
    return Promise.resolve(mockDB);
  },
}));
