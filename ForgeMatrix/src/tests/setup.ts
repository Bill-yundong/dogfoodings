import { beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

beforeEach(() => {
  if (typeof indexedDB !== 'undefined' && 'databases' in indexedDB) {
    indexedDB.deleteDatabase('ForgeMatrixDB');
  }
});
