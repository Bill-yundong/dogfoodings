const FDB = require('fake-indexeddb');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

globalThis.indexedDB = FDB;
globalThis.IDBKeyRange = FDBKeyRange;
globalThis.IDBFactory = FDB;
(globalThis as any).window = globalThis;
(globalThis as any).window.indexedDB = FDB;
(globalThis as any).window.IDBKeyRange = FDBKeyRange;

Object.defineProperty(globalThis, 'indexedDB', {
  value: FDB,
  writable: true,
  configurable: true
});

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/svelte';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
  if (vi.isFakeTimers()) {
    vi.useRealTimers();
  }
});
