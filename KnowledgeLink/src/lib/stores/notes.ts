import { writable } from 'svelte/store'
import { notesRepo } from '$lib/db/repositories'
import { generateId } from '$lib/utils/id'
import { now } from '$lib/utils/time'
import { indexEntity, removeEntityIndex } from '$lib/db/search'

interface Note {
  id: string; bookId: string; title: string; content: string;
  tags: string[]; backlinks: string[]; createdAt: number; updatedAt: number
}

function createNotesStore() {
  const { subscribe, set, update } = writable<Note[]>([])

  return {
    subscribe,
    async load() {
      const notes = await notesRepo.getAll() as Note[]
      set(notes)
    },
    async addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) {
      const t = now()
      const newNote: Note = { ...note, id: generateId(), createdAt: t, updatedAt: t }
      await notesRepo.add(newNote)
      await indexEntity('note', newNote.id, `${newNote.title} ${newNote.content} ${newNote.tags.join(' ')}`)
      update(notes => [...notes, newNote])
      return newNote
    },
    async updateNote(id: string, changes: Partial<Note>) {
      const all = await notesRepo.getAll() as Note[]
      const existing = all.find(n => n.id === id)
      if (!existing) return
      const updated = { ...existing, ...changes, updatedAt: now() }
      await notesRepo.put(updated)
      await indexEntity('note', id, `${updated.title} ${updated.content} ${updated.tags.join(' ')}`)
      update(notes => notes.map(n => n.id === id ? updated : n))
    },
    async deleteNote(id: string) {
      await notesRepo.delete(id)
      await removeEntityIndex('note', id)
      update(notes => notes.filter(n => n.id !== id))
    },
    async getNotesByBook(bookId: string) {
      const all = await notesRepo.getAll() as Note[]
      return all.filter(n => n.bookId === bookId)
    },
    async getNotesByTag(tag: string) {
      const all = await notesRepo.getAll() as Note[]
      return all.filter(n => n.tags.includes(tag))
    },
    async searchNotes(query: string) {
      const all = await notesRepo.getAll() as Note[]
      const q = query.toLowerCase()
      return all.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      )
    }
  }
}

export const notesStore = createNotesStore()
