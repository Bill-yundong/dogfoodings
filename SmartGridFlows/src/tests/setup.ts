import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

Object.defineProperty(window, 'indexedDB', {
  writable: true,
  value: {
    open: () => ({
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
      result: {
        createObjectStore: () => ({
          createIndex: () => {},
          put: () => {},
          get: () => {},
          getAll: () => {},
          delete: () => {},
          index: () => ({
            openCursor: () => ({
              onerror: null,
              onsuccess: null,
              result: null,
            }),
            getAll: () => {},
          }),
        }),
        transaction: () => ({
          objectStore: () => ({
            put: () => {},
            get: () => {},
            getAll: () => {},
            delete: () => {},
          }),
        }),
      },
    }),
  },
});
