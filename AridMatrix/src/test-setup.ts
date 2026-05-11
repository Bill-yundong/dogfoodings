import { vi } from 'vitest'

class MockIDBRequest {
  result: unknown = null
  error: Error | null = null
  onsuccess: (() => void) | null = null
  onerror: (() => void) | null = null
  readyState = 'pending'
}

class MockIDBDatabase {
  private objectStores: Map<string, Map<string, unknown>> = new Map()

  createObjectStore(name: string): void {
    if (!this.objectStores.has(name)) {
      this.objectStores.set(name, new Map())
    }
  }

  transaction(storeNames: string | string[], mode: 'readonly' | 'readwrite') {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames]
    const stores = names.map(name => this.objectStores.get(name) || new Map())
    
    return {
      objectStore: (index: number) => {
        const store = stores[index]
        return {
          add: (value: unknown, key: string) => {
            const request = new MockIDBRequest()
            store.set(key, value)
            setTimeout(() => {
              request.readyState = 'done'
              request.result = key
              if (request.onsuccess) request.onsuccess()
            }, 0)
            return request
          },
          put: (value: unknown, key: string) => {
            const request = new MockIDBRequest()
            store.set(key, value)
            setTimeout(() => {
              request.readyState = 'done'
              request.result = key
              if (request.onsuccess) request.onsuccess()
            }, 0)
            return request
          },
          getAll: (query?: string) => {
            const request = new MockIDBRequest()
            const results = Array.from(store.entries())
              .filter(([k, v]) => !query || k.includes(query))
              .map(([k, v]) => v)
            setTimeout(() => {
              request.readyState = 'done'
              request.result = results
              if (request.onsuccess) request.onsuccess()
            }, 0)
            return request
          },
          index: (indexName: string) => {
            return {
              getAll: (query?: string) => {
                const request = new MockIDBRequest()
                const results = Array.from(store.values())
                  .filter((item: any) => !query || item[indexName]?.includes(query))
                setTimeout(() => {
                  request.readyState = 'done'
                  request.result = results
                  if (request.onsuccess) request.onsuccess()
                }, 0)
                return request
              },
              openCursor: (range?: { lower?: number; upper?: number }) => {
                const request = new MockIDBRequest()
                const entries = Array.from(store.entries())
                let currentIndex = 0
                
                const advanceCursor = () => {
                  if (currentIndex < entries.length) {
                    const [key, value] = entries[currentIndex]
                    currentIndex++
                    request.result = {
                      key,
                      value,
                      delete: () => store.delete(key),
                      continue: advanceCursor
                    }
                  } else {
                    request.result = null
                  }
                  if (request.onsuccess) request.onsuccess()
                }
                
                setTimeout(advanceCursor, 0)
                return request
              }
            }
          }
        }
      }
    }
  }

  close(): void {}
}

export function setupIndexedDBMock() {
  const mockDB = new MockIDBDatabase()
  
  vi.stubGlobal('indexedDB', {
    open: (name: string, version: number) => {
      const request = new MockIDBRequest() as any
      request.result = mockDB
      
      setTimeout(() => {
        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: { result: mockDB } })
        }
        request.readyState = 'done'
        if (request.onsuccess) request.onsuccess()
      }, 0)
      
      return request
    }
  })

  return mockDB
}