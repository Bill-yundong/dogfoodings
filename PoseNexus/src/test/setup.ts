import { beforeEach } from 'vitest'
import { indexedDB } from 'fake-indexeddb'
import 'fake-indexeddb/auto'

beforeEach(() => {
  window.indexedDB = indexedDB
  localStorage.clear()
  sessionStorage.clear()
})

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

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
    dispatchEvent: () => false
  })
})

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: () => Promise.resolve({
      getTracks: () => [{ stop: () => {} }]
    })
  }
})

window.speechSynthesis = {
  speak: () => {},
  cancel: () => {},
  pause: () => {},
  resume: () => {},
  getVoices: () => [],
  onvoiceschanged: null,
  pending: false,
  speaking: false,
  paused: false
}
