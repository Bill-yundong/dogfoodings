import { vi } from 'vitest'

globalThis.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null,
  onerror: null
}))

globalThis.indexedDB = {
  open: vi.fn().mockImplementation(() => ({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    result: {
      objectStoreNames: new Set(['radar_frames', 'forecast_history']),
      close: vi.fn()
    }
  })),
  deleteDatabase: vi.fn()
}

class IDBKeyRange {
  static bound(lower, upper) {
    return { lower, upper }
  }
  static lowerBound(lower) {
    return { lower }
  }
  static upperBound(upper) {
    return { upper }
  }
  static only(value) {
    return { value }
  }
}

globalThis.IDBKeyRange = IDBKeyRange

vi.stubGlobal('URL', {
  createObjectURL: vi.fn(),
  revokeObjectURL: vi.fn()
})

globalThis.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 0)
})

globalThis.cancelAnimationFrame = vi.fn()
