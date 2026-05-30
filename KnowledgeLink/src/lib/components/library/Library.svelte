<script lang="ts">
import { onMount } from 'svelte'
import { libraryStore } from '$lib/stores/library'
import { BookOpen, Plus, Search, Filter, TrendingUp } from 'lucide-svelte'

let searchQuery = $state('')
let selectedCategory = $state('all')
let showAddModal = $state(false)
let newBook = $state({ title: '', author: '', category: '', totalChapters: 0 })

let filteredBooks = $derived.by(() => {
  let result = $libraryStore
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    result = result.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
    )
  }
  if (selectedCategory !== 'all') {
    result = result.filter(b => b.category === selectedCategory)
  }
  return result
})

let categories = $derived([...new Set($libraryStore.map(b => b.category).filter(Boolean))])
let totalBooks = $derived($libraryStore.length)

onMount(() => {
  libraryStore.load()
})

async function handleAddBook() {
  if (!newBook.title) return
  await libraryStore.addBook({
    title: newBook.title,
    author: newBook.author,
    coverUrl: '',
    category: newBook.category,
    totalChapters: newBook.totalChapters || 1
  })
  newBook = { title: '', author: '', category: '', totalChapters: 0 }
  showAddModal = false
}

function getProgress(bookId: string): number {
  const progress = $libraryStore.progress?.get(bookId)
  return progress?.progress ?? 0
}

function getIntakeIndex(bookId: string): number {
  const progress = $libraryStore.progress?.get(bookId)
  return progress?.intakeIndex ?? 0
}
</script>

<div class="h-full overflow-y-auto p-6">
  <div class="flex items-center justify-between mb-8 animate-fade-in">
    <div>
      <h1 class="text-3xl font-bold" style="font-family: var(--font-display)">阅读库</h1>
      <p class="text-text-secondary mt-1">共 {totalBooks} 本藏书 · 知识摄入量持续追踪</p>
    </div>
    <button
      onclick={() => showAddModal = true}
      class="flex items-center gap-2 px-5 py-2.5 bg-accent text-bg font-semibold rounded-lg hover:bg-accent-hover transition-all duration-200 hover:shadow-lg hover:shadow-accent/20"
    >
      <Plus size={18} />
      添加书籍
    </button>
  </div>

  <div class="flex items-center gap-4 mb-6 animate-fade-in" style="animation-delay: 80ms">
    <div class="flex-1 relative">
      <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="搜索书籍或作者..."
        class="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
      />
    </div>
    <div class="flex items-center gap-2">
      <Filter size={16} class="text-text-secondary" />
      <select
        bind:value={selectedCategory}
        class="px-3 py-2.5 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-accent"
      >
        <option value="all">全部分类</option>
        {#each categories as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </select>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    {#each filteredBooks as book, i (book.id)}
      <a
        href="#/library/{book.id}"
        class="group block bg-surface rounded-xl border border-border overflow-hidden hover:border-accent/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/5 animate-fade-in"
        style="animation-delay: {i * 80}ms"
      >
        <div class="h-40 bg-gradient-to-br from-surface-elevated to-bg flex items-center justify-center relative overflow-hidden">
          <BookOpen size={40} class="text-accent/30" />
          <div class="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent"></div>
          {#if book.category}
            <span class="absolute top-3 right-3 px-2 py-0.5 text-xs bg-accent/20 text-accent rounded-full">{book.category}</span>
          {/if}
        </div>
        <div class="p-4">
          <h3 class="font-semibold text-text group-hover:text-accent transition-colors truncate">{book.title}</h3>
          <p class="text-sm text-text-secondary mt-1 truncate">{book.author}</p>
          <div class="mt-3">
            <div class="flex justify-between text-xs text-text-secondary mb-1">
              <span>阅读进度</span>
              <span>{Math.round(getProgress(book.id) * 100)}%</span>
            </div>
            <div class="h-1.5 bg-bg rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-500"
                style="width: {getProgress(book.id) * 100}%"
              ></div>
            </div>
          </div>
          <div class="flex items-center gap-1.5 mt-3 text-xs text-text-secondary">
            <TrendingUp size={12} class="text-success" />
            <span>摄入指数 {getIntakeIndex(book.id).toFixed(1)}</span>
          </div>
        </div>
      </a>
    {/each}
  </div>

  {#if filteredBooks.length === 0}
    <div class="flex flex-col items-center justify-center py-20 text-text-secondary">
      <BookOpen size={48} class="mb-4 opacity-30" />
      <p class="text-lg">还没有藏书</p>
      <p class="text-sm mt-1">点击"添加书籍"开始你的知识之旅</p>
    </div>
  {/if}
</div>

{#if showAddModal}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onclick={() => showAddModal = false}>
    <div class="bg-surface rounded-xl border border-border p-6 w-full max-w-md animate-fade-in" onclick={(e) => e.stopPropagation()}>
      <h2 class="text-xl font-bold mb-4" style="font-family: var(--font-display)">添加新书</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-text-secondary mb-1">书名 *</label>
          <input bind:value={newBook.title} class="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:border-accent" placeholder="输入书名" />
        </div>
        <div>
          <label class="block text-sm text-text-secondary mb-1">作者</label>
          <input bind:value={newBook.author} class="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:border-accent" placeholder="输入作者" />
        </div>
        <div>
          <label class="block text-sm text-text-secondary mb-1">分类</label>
          <input bind:value={newBook.category} class="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:border-accent" placeholder="如：哲学、计算机科学" />
        </div>
        <div>
          <label class="block text-sm text-text-secondary mb-1">总章节数</label>
          <input type="number" bind:value={newBook.totalChapters} class="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:border-accent" placeholder="1" min="1" />
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-6">
        <button onclick={() => showAddModal = false} class="px-4 py-2 text-text-secondary hover:text-text transition-colors">取消</button>
        <button onclick={handleAddBook} class="px-4 py-2 bg-accent text-bg font-semibold rounded-lg hover:bg-accent-hover transition-colors">添加</button>
      </div>
    </div>
  </div>
{/if}
