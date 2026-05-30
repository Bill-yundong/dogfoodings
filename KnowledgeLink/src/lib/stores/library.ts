import { writable, derived } from 'svelte/store'
import { booksRepo, readingProgressRepo } from '$lib/db/repositories'
import { generateId } from '$lib/utils/id'
import { now } from '$lib/utils/time'

interface Book {
  id: string; title: string; author: string; coverUrl: string;
  category: string; totalChapters: number; createdAt: number; updatedAt: number
}

interface ReadingProgress {
  id: string; bookId: string; currentChapter: number;
  progress: number; intakeIndex: number; lastReadAt: number
}

function createLibraryStore() {
  const { subscribe, set, update } = writable<Book[]>([])
  const progressStore = writable<Map<string, ReadingProgress>>(new Map())

  return {
    subscribe,
    progress: progressStore,
    async load() {
      const books = await booksRepo.getAll() as Book[]
      set(books)
      const progresses = await readingProgressRepo.getAll() as ReadingProgress[]
      const map = new Map<string, ReadingProgress>()
      progresses.forEach(p => map.set(p.bookId, p))
      progressStore.set(map)
    },
    async addBook(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) {
      const t = now()
      const newBook: Book = { ...book, id: generateId(), createdAt: t, updatedAt: t }
      await booksRepo.add(newBook)
      update(books => [...books, newBook])
      const progress: ReadingProgress = {
        id: generateId(), bookId: newBook.id, currentChapter: 0,
        progress: 0, intakeIndex: 0, lastReadAt: t
      }
      await readingProgressRepo.add(progress)
      progressStore.update(map => { map.set(newBook.id, progress); return new Map(map) })
      return newBook
    },
    async updateProgress(bookId: string, currentChapter: number, totalChapters: number) {
      const all = await readingProgressRepo.getAll() as ReadingProgress[]
      const existing = all.find(p => p.bookId === bookId)
      if (!existing) return
      const progress = Math.min(currentChapter / Math.max(totalChapters, 1), 1)
      const updated = { ...existing, currentChapter, progress, lastReadAt: now() }
      await readingProgressRepo.put(updated)
      progressStore.update(map => { map.set(bookId, updated); return new Map(map) })
    },
    async deleteBook(id: string) {
      await booksRepo.delete(id)
      update(books => books.filter(b => b.id !== id))
    },
    async searchBooks(query: string) {
      const all = await booksRepo.getAll() as Book[]
      const q = query.toLowerCase()
      return all.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      )
    }
  }
}

export const libraryStore = createLibraryStore()
