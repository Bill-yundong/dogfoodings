import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 0);
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

class MockIDBKeyRange {
  static bound(lower, upper, lowerOpen = false, upperOpen = false) {
    return { lower, upper, lowerOpen, upperOpen, type: 'bound' };
  }
  static upperBound(upper, upperOpen = false) {
    return { upper, upperOpen, type: 'upperBound' };
  }
  static lowerBound(lower, lowerOpen = false) {
    return { lower, lowerOpen, type: 'lowerBound' };
  }
}

global.IDBKeyRange = MockIDBKeyRange;
