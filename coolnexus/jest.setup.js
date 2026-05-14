import '@testing-library/jest-dom';

const { setImmediate } = require('timers');
global.setImmediate = setImmediate;

class MockIDB {
  constructor() {
    this.stores = new Map();
  }
}

global.indexedDB = new MockIDB();

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));
