import '@testing-library/jest-dom';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

Object.defineProperty(global, 'indexedDB', {
  value: indexedDB,
  writable: true,
});

Object.defineProperty(global, 'IDBKeyRange', {
  value: IDBKeyRange,
  writable: true,
});

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

class MockWebSocket {
  static OPEN = 1;
  readyState = 1;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  
  constructor(_url: string) {}
  
  send(_data: string) {}
  close(_code?: number, _reason?: string) {}
}

Object.defineProperty(window, 'WebSocket', {
  writable: true,
  value: MockWebSocket,
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

vi.useFakeTimers();
