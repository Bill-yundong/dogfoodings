import { vi } from 'vitest'

Object.defineProperty(globalThis, 'indexedDB', {
  value: {}
})

const mockIDBDatabase = {
  objectStoreNames: {
    contains: vi.fn().mockReturnValue(true)
  },
  createObjectStore: vi.fn().mockReturnValue({
    createIndex: vi.fn()
  }),
  transaction: vi.fn().mockReturnValue({
    store: { clear: vi.fn().mockResolvedValue(undefined) },
    objectStore: vi.fn().mockReturnValue({ clear: vi.fn().mockResolvedValue(undefined) }),
    done: Promise.resolve()
  }),
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([]),
  getAllFromIndex: vi.fn().mockResolvedValue([]),
  delete: vi.fn().mockResolvedValue(undefined)
}

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue(mockIDBDatabase)
}))

globalThis.fetch = vi.fn()

class MockWebGLRenderingContext {
  canvas = null
  drawingBufferWidth = 800
  drawingBufferHeight = 600
  bindTexture() {}
  bindBuffer() {}
  bindFramebuffer() {}
  bindRenderbuffer() {}
  texImage2D() {}
  texParameteri() {}
  bufferData() {}
  viewport() {}
  clearColor() {}
  clear() {}
  enable() {}
  disable() {}
  blendFunc() {}
  getParameter() { return null }
  getExtension() { return null }
  getSupportedExtensions() { return [] }
  createTexture() { return {} }
  createBuffer() { return {} }
  createFramebuffer() { return {} }
  createRenderbuffer() { return {} }
  createProgram() { return {} }
  createShader() { return {} }
  createUniformLocation() { return {} }
  getAttribLocation() { return 0 }
  getUniformLocation() { return null }
  shaderSource() {}
  compileShader() {}
  attachShader() {}
  linkProgram() {}
  useProgram() {}
  uniform1f() {}
  uniform2f() {}
  uniform3f() {}
  uniform4f() {}
  uniform1i() {}
  uniformMatrix4fv() {}
  enableVertexAttribArray() {}
  vertexAttribPointer() {}
  drawArrays() {}
  drawElements() {}
  deleteTexture() {}
  deleteBuffer() {}
  deleteProgram() {}
  deleteShader() {}
  pixelStorei() {}
  activeTexture() {}
  frameBufferTexture2D() {}
  renderbufferStorage() {}
  frameBufferRenderbuffer() {}
  checkFramebufferStatus() { return 36053 }
  readPixels() {}
  finish() {}
  flush() {}
}

HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type: string) => {
  if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
    return new MockWebGLRenderingContext()
  }
  if (type === '2d') {
    return {
      putImageData: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 0 }),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      canvas: null
    }
  }
  return null
}) as any

globalThis.requestAnimationFrame = vi.fn().mockImplementation((cb: FrameRequestCallback) => {
  return setTimeout(() => cb(Date.now()), 0) as unknown as number
})

globalThis.cancelAnimationFrame = vi.fn().mockImplementation((id: number) => {
  clearTimeout(id)
})

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = MockResizeObserver as any

class MockWebSocket {
  static OPEN = 1
  static CLOSED = 3
  readyState = MockWebSocket.OPEN
  send = vi.fn()
  close = vi.fn()
  onopen: (() => void) | null = null
  onmessage: ((ev: any) => void) | null = null
  onerror: ((ev: any) => void) | null = null
  onclose: (() => void) | null = null
  constructor(public url: string) {}
}

globalThis.WebSocket = MockWebSocket as any
