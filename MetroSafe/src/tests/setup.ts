import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    result: {
      createObjectStore: vi.fn(),
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          add: vi.fn(),
          getAll: vi.fn(),
          get: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn()
        })
      }),
      objectStoreNames: { contains: vi.fn() }
    }
  })
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

// Mock setTimeout for async tests
vi.useFakeTimers();

// Setup for SolidJS testing
globalThis.IS_BROWSER = true;
