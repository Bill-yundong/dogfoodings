import 'fake-indexeddb/auto'
import { afterEach, beforeAll } from 'vitest'

beforeAll(() => {
  ;(globalThis as any).structuredClone = (val: any) => JSON.parse(JSON.stringify(val))
})

afterEach(async () => {
  try {
    const databases = (globalThis as any).indexedDB as IDBFactory
    if (databases && databases.databases) {
      const dbs = await databases.databases()
      for (const db of dbs) {
        if (db.name) {
          try {
            await new Promise((resolve, reject) => {
              const request = databases.deleteDatabase(db.name)
              request.onsuccess = resolve
              request.onerror = reject
            })
          } catch (e) {
          }
        }
      }
    }
  } catch (e) {
  }
}, 5000)
