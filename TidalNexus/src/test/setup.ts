import '@testing-library/jest-dom';
import { IndexedDB, IDBKeyRange } from 'fake-indexeddb';

Object.defineProperty(window, 'indexedDB', {
  value: new IndexedDB(),
  writable: true,
});

Object.defineProperty(window, 'IDBKeyRange', {
  value: IDBKeyRange,
  writable: true,
});

class MockWorker {
  url: string;
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null;

  constructor(stringUrl: string) {
    this.url = stringUrl;
    this.onmessage = null;
  }

  postMessage(msg: any) {
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage.call(this, new MessageEvent('message', { data: msg }));
      }
    }, 0);
  }

  terminate() {}
}

Object.defineProperty(window, 'Worker', {
  value: MockWorker,
  writable: true,
});

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 0);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};
