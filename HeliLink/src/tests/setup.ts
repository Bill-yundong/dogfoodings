import '@testing-library/jest-dom';
import { expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

expect.extend(matchers);

global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

global.crypto.randomUUID = () => 'test-uuid-' + Math.random().toString(36).substr(2, 9);

vi.mock('@/services/websocket', () => ({
  mockWebSocket: {
    subscribe: vi.fn(() => vi.fn()),
    sendAlert: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});
