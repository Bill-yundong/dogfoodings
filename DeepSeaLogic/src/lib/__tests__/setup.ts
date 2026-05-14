import { vi, beforeEach } from 'vitest';

let mockDatabases: Map<string, any> = new Map();

class MockIDBRequest {
  result: any;
  error: Error | null = null;
  readyState: 'pending' | 'done' = 'pending';
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onupgradeneeded: ((event: any) => void) | null = null;

  constructor() {
    setTimeout(() => {
      this.readyState = 'done';
      if (this.onsuccess) {
        this.onsuccess({ target: this });
      }
    }, 0);
  }
}

class MockIDBCursor {
  value: any;
  private values: any[];
  private index: number = 0;

  constructor(values: any[]) {
    this.values = values;
    this.value = values[0] || null;
  }

  continue(): void {
    this.index++;
    this.value = this.values[this.index] || null;
  }
}

class MockIDBObjectStore {
  name: string;
  private data: Map<string, any> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  put(value: any): MockIDBRequest {
    const key = value.id || String(Date.now() + Math.random());
    this.data.set(key, value);
    return new MockIDBRequest();
  }

  get(key: string): MockIDBRequest {
    const request = new MockIDBRequest();
    request.result = this.data.get(key) || null;
    return request;
  }

  getAll(): MockIDBRequest {
    const request = new MockIDBRequest();
    request.result = Array.from(this.data.values());
    return request;
  }

  delete(key: string): MockIDBRequest {
    this.data.delete(key);
    return new MockIDBRequest();
  }

  clear(): MockIDBRequest {
    this.data.clear();
    return new MockIDBRequest();
  }

  count(): MockIDBRequest {
    const request = new MockIDBRequest();
    request.result = this.data.size;
    return request;
  }

  createIndex(name: string): void {
  }

  index(): any {
    return {
      openCursor: () => {
        const request = new MockIDBRequest();
        const values = Array.from(this.data.values()).sort((a, b) => b.timestamp - a.timestamp);
        request.result = values.length > 0 ? new MockIDBCursor(values) : null;
        return request;
      },
      getAll: () => {
        const request = new MockIDBRequest();
        request.result = Array.from(this.data.values());
        return request;
      }
    };
  }
}

class MockIDBDatabase {
  name: string;
  version: number;
  private objectStores: Map<string, MockIDBObjectStore> = new Map();

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
  }

  createObjectStore(name: string): void {
    if (!this.objectStores.has(name)) {
      this.objectStores.set(name, new MockIDBObjectStore(name));
    }
  }

  transaction(storeNames: string | string[]): any {
    const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
    return {
      objectStore: (name: string) => {
        if (!this.objectStores.has(name)) {
          this.objectStores.set(name, new MockIDBObjectStore(name));
        }
        return this.objectStores.get(name)!;
      }
    };
  }

  close(): void {
  }
}

function resetMockIndexedDB(): void {
  mockDatabases = new Map();
}

function setupMockIndexedDB(): void {
  Object.defineProperty(window, 'indexedDB', {
    value: {
      open: (name: string, version: number = 1) => {
        const request = new MockIDBRequest() as any;
        request.result = new MockIDBDatabase(name, version);
        mockDatabases.set(name, request.result);
        return request;
      },
      deleteDatabase: (name: string) => {
        mockDatabases.delete(name);
        return new MockIDBRequest();
      }
    },
    writable: true,
    configurable: true
  });

  (global as any).indexedDB = window.indexedDB;
}

beforeEach(() => {
  resetMockIndexedDB();
  setupMockIndexedDB();
});

setupMockIndexedDB();

vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
  return setTimeout(callback, 0) as unknown as number;
});

vi.stubGlobal('cancelAnimationFrame', (id: number) => {
  clearTimeout(id);
});
