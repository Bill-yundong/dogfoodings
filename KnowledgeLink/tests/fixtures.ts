import { test as base } from '@playwright/test'

export type TestData = {
  bookId: string
  noteId: string
  conceptNodeIds: string[]
}

export const test = base.extend<{
  testData: TestData
  clearStorage: void
}>({
  clearStorage: [async ({ context }, use) => {
    await context.addInitScript(() => {
      const dbs = indexedDB.databases ? await indexedDB.databases() : [{ name: 'knowledgelink' }]
      for (const db of dbs) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name)
        }
      }
      localStorage.clear()
    })
    await use()
  }, { auto: true }],

  testData: async ({ page }, use) => {
    const data: TestData = {
      bookId: '',
      noteId: '',
      conceptNodeIds: [],
    }
    await use(data)
  },
})

export { expect } from '@playwright/test'
