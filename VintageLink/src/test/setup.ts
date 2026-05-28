import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function() {
    return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
    };
  };
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof globalThis.IDBKeyRange === 'undefined') {
  globalThis.IDBKeyRange = class IDBKeyRange {
    static bound(lower: any, upper: any, lowerOpen?: boolean, upperOpen?: boolean) {
      return { lower, upper, lowerOpen, upperOpen };
    }
    static only(value: any) {
      return { lower: value, upper: value };
    }
    static lowerBound(lower: any, open?: boolean) {
      return { lower, lowerOpen: open };
    }
    static upperBound(upper: any, open?: boolean) {
      return { upper, upperOpen: open };
    }
    includes(_key: any): boolean {
      return true;
    }
  } as any;
}
