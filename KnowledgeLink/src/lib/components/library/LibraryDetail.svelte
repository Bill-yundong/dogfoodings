<script lang="ts">
import { onMount } from 'svelte'
import { libraryStore } from '$lib/stores/library'
import { notesStore } from '$lib/stores/notes'
import { graphStore } from '$lib/stores/graph'
import { booksRepo, readingProgressRepo } from '$lib/db/repositories'
import { generateId } from '$lib/utils/id'
import { now, formatDate } from '$lib/utils/time'
import { ArrowLeft, BookOpen, FileText, Plus, ChevronRight, Link2, Tag } from 'lucide-svelte'

let params = $state({ id: '' })
let book = $state<any>(null)
let progress = $state<any>(null)
let bookNotes = $state<any[]>([])
let activeChapter = $state(1)
let showNoteInput = $state(false)
let newNoteTitle = $state('')
let newNoteContent = $state('')

onMount(async () => {
  const hash = window.location.hash
  const match = hash.match(/\/library\/(.+)$/)
  if (match) params.id = match[1]

  await libraryStore.load()
  await notesStore.load()

  const allBooks = await booksRepo.getAll()
  book = allBooks.find((b: any) => b.id === params.id)

  const allProgress = await readingProgressRepo.getAll()
  progress = allProgress.find((p: any) => p.bookId === params.id)

  if (book) {
    activeChapter = progress?.currentChapter || 1
    bookNotes = await notesStore.getNotesByBook(book.id)
  }
})

async function updateChapter(chapter: number) {
  activeChapter = chapter
  if (book && progress) {
    await libraryStore.updateProgress(book.id, chapter, book.totalChapters)
    const allProgress = await readingProgressRepo.getAll()
    progress = allProgress.find((p: any) => p.bookId === params.id)
  }
}

async function addNote() {
  if (!book || !newNoteTitle) return
  await notesStore.addNote({
    bookId: book.id,
    title: newNoteTitle,
    content: newNoteContent,
    tags: [book.category || '未分类'],
    backlinks: []
  })
  bookNotes = await notesStore.getNotesByBook(book.id)
  newNoteTitle = ''
  newNoteContent = ''
  showNoteInput = false
}

function getProgressPercent(): number {
  if (!progress) return 0
  return Math.round(progress.progress * 100)
}
</script>

<div class="h-full overflow-y-auto">
  {#if book}
    <div class="p-6">
      <div class="flex items-center gap-4 mb-6 animate-fade-in">
        <a href="#/library" class="p-2 hover:bg-surface rounded-lg transition-colors">
          <ArrowLeft size={20} class="text-text-secondary" />
        </a>
        <div class="flex-1">
          <h1 class="text-2xl font-bold" style="font-family: var(--font-display)">{book.title}</h1>
          <p class="text-text-secondary text-sm">{book.author} · {book.category}</p>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold text-accent" style="font-family: var(--font-mono)">{getProgressPercent()}%</div>
          <div class="text-xs text-text-secondary">完成进度</div>
        </div>
      </div>

      <div class="mb-8 animate-fade-in" style="animation-delay: 80ms">
        <div class="h-2 bg-bg rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-700"
            style="width: {getProgressPercent()}%"
          ></div>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <div class="col-span-4 animate-fade-in" style="animation-delay: 160ms">
          <div class="bg-surface rounded-xl border border-border p-4">
            <h2 class="font-semibold mb-3 flex items-center gap-2">
              <BookOpen size={16} class="text-accent" />
              章节导航
            </h2>
            <div class="space-y-1 max-h-[60vh] overflow-y-auto">
              {#each Array(book.totalChapters || 1) as _, i}
                {@const chapterNum = i + 1}
                <button
                  onclick={() => updateChapter(chapterNum)}
                  class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all {activeChapter === chapterNum ? 'bg-accent/10 text-accent border border-accent/20' : 'hover:bg-surface-elevated text-text-secondary'}"
                >
                  <span>第 {chapterNum} 章</span>
                  {#if progress && chapterNum <= progress.currentChapter}
                    <ChevronRight size={14} class="text-success" />
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="col-span-8 animate-fade-in" style="animation-delay: 240ms">
          <div class="bg-surface rounded-xl border border-border p-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-semibold flex items-center gap-2">
                <FileText size={16} class="text-accent" />
                读书笔记
              </h2>
              <button
                onclick={() => showNoteInput = true}
                class="flex items-center gap-1 px-3 py-1.5 text-sm bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
              >
                <Plus size={14} />
                新笔记
              </button>
            </div>

            {#if showNoteInput}
              <div class="mb-4 p-4 bg-bg rounded-lg border border-border">
                <input bind:value={newNoteTitle} placeholder="笔记标题" class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text mb-2 focus:outline-none focus:border-accent" />
                <textarea bind:value={newNoteContent} placeholder="笔记内容... 使用 [[双括号]] 创建知识链接" rows="4" class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text resize-none focus:outline-none focus:border-accent"></textarea>
                <div class="flex justify-end gap-2 mt-2">
                  <button onclick={() => showNoteInput = false} class="px-3 py-1 text-sm text-text-secondary">取消</button>
                  <button onclick={addNote} class="px-3 py-1 text-sm bg-accent text-bg rounded-lg hover:bg-accent-hover">保存</button>
                </div>
              </div>
            {/if}

            <div class="space-y-3 max-h-[50vh] overflow-y-auto">
              {#each bookNotes as note (note.id)}
                <div class="p-3 bg-bg rounded-lg border border-border hover:border-accent/30 transition-colors">
                  <div class="flex items-start justify-between">
                    <h3 class="font-medium text-sm">{note.title}</h3>
                    <a href="#/notes/{note.id}" class="text-xs text-accent hover:underline">编辑</a>
                  </div>
                  <p class="text-xs text-text-secondary mt-1 line-clamp-2">{note.content}</p>
                  {#if note.tags?.length}
                    <div class="flex flex-wrap gap-1 mt-2">
                      {#each note.tags as tag}
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-accent/10 text-accent rounded-full">
                          <Tag size={10} />
                          {tag}
                        </span>
                      {/each}
                    </div>
                  {/if}
                  {#if note.backlinks?.length}
                    <div class="flex items-center gap-1 mt-2 text-xs text-text-secondary">
                      <Link2 size={10} />
                      {note.backlinks.length} 个反向链接
                    </div>
                  {/if}
                </div>
              {/each}
            </div>

            {#if bookNotes.length === 0}
              <div class="text-center py-8 text-text-secondary">
                <FileText size={32} class="mx-auto mb-2 opacity-30" />
                <p class="text-sm">暂无笔记，点击"新笔记"开始记录</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex items-center justify-center h-full text-text-secondary">
      <p>加载中...</p>
    </div>
  {/if}
</div>
