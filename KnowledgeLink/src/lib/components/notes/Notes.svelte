<script lang="ts">
import { onMount } from 'svelte'
import { notesStore } from '$lib/stores/notes'
import { FileText, Plus, Search, LayoutGrid, List, Tag, Link2, Clock } from 'lucide-svelte'
import { formatDate } from '$lib/utils/time'

let searchQuery = $state('')
let selectedTag = $state('')
let viewMode = $state<'grid' | 'list'>('grid')
let showAddModal = $state(false)
let newNote = $state({ title: '', content: '', tags: '', bookId: '' })

let allTags = $derived(() => {
  const tags = new Set<string>()
  $notesStore.forEach(n => n.tags?.forEach((t: string) => tags.add(t)))
  return [...tags]
})

let filteredNotes = $derived.by(() => {
  let result = [...$notesStore]
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    result = result.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
    )
  }
  if (selectedTag) {
    result = result.filter(n => n.tags?.includes(selectedTag))
  }
  return result.sort((a, b) => b.updatedAt - a.updatedAt)
})

onMount(() => {
  notesStore.load()
})

async function handleAddNote() {
  if (!newNote.title) return
  await notesStore.addNote({
    bookId: newNote.bookId || '',
    title: newNote.title,
    content: newNote.content,
    tags: newNote.tags.split(',').map(t => t.trim()).filter(Boolean),
    backlinks: []
  })
  newNote = { title: '', content: '', tags: '', bookId: '' }
  showAddModal = false
}

function extractBacklinkPreview(content: string): string {
  const matches = content.match(/\[\[(.+?)\]\]/g)
  if (!matches) return ''
  return matches.map(m => m.replace(/\[\[|\]\]/g, '')).join(', ')
}
</script>

<div class="h-full overflow-y-auto p-6">
  <div class="flex items-center justify-between mb-8 animate-fade-in">
    <div>
      <h1 class="text-3xl font-bold" style="font-family: var(--font-display)">笔记系统</h1>
      <p class="text-text-secondary mt-1">共 {$notesStore.length} 条笔记 · 双向链接知识网络</p>
    </div>
    <button
      onclick={() => showAddModal = true}
      class="flex items-center gap-2 px-5 py-2.5 bg-accent text-bg font-semibold rounded-lg hover:bg-accent-hover transition-all duration-200 hover:shadow-lg hover:shadow-accent/20"
    >
      <Plus size={18} />
      新建笔记
    </button>
  </div>

  <div class="flex items-center gap-4 mb-4 animate-fade-in" style="animation-delay: 80ms">
    <div class="flex-1 relative">
      <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="搜索笔记..."
        class="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text placeholder-text-secondary focus:outline-none focus:border-accent"
      />
    </div>
    <div class="flex bg-surface border border-border rounded-lg overflow-hidden">
      <button
        onclick={() => viewMode = 'grid'}
        class="p-2.5 {viewMode === 'grid' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:text-text'}"
      >
        <LayoutGrid size={18} />
      </button>
      <button
        onclick={() => viewMode = 'list'}
        class="p-2.5 {viewMode === 'list' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:text-text'}"
      >
        <List size={18} />
      </button>
    </div>
  </div>

  {#if allTags().length > 0}
    <div class="flex flex-wrap gap-2 mb-6 animate-fade-in" style="animation-delay: 120ms">
      <button
        onclick={() => selectedTag = ''}
        class="px-3 py-1 text-sm rounded-full transition-colors {!selectedTag ? 'bg-accent/20 text-accent' : 'bg-surface text-text-secondary hover:text-text'}"
      >
        全部
      </button>
      {#each allTags() as tag}
        <button
          onclick={() => selectedTag = selectedTag === tag ? '' : tag}
          class="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full transition-colors {selectedTag === tag ? 'bg-accent/20 text-accent' : 'bg-surface text-text-secondary hover:text-text'}"
        >
          <Tag size={12} />
          {tag}
        </button>
      {/each}
    </div>
  {/if}

  {#if viewMode === 'grid'}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filteredNotes as note, i (note.id)}
        <a
          href="#/notes/{note.id}"
          class="block bg-surface rounded-xl border border-border p-5 hover:border-accent/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/5 animate-fade-in"
          style="animation-delay: {i * 60}ms"
        >
          <h3 class="font-semibold text-text group-hover:text-accent mb-2 truncate">{note.title}</h3>
          <p class="text-sm text-text-secondary line-clamp-3 mb-3">{note.content}</p>
          <div class="flex items-center justify-between">
            <div class="flex flex-wrap gap-1">
              {#each note.tags?.slice(0, 3) as tag}
                <span class="px-2 py-0.5 text-xs bg-accent/10 text-accent rounded-full">{tag}</span>
              {/each}
            </div>
            <span class="text-xs text-text-secondary flex items-center gap-1">
              <Clock size={10} />
              {formatDate(note.updatedAt)}
            </span>
          </div>
          {#if extractBacklinkPreview(note.content)}
            <div class="flex items-center gap-1 mt-2 text-xs text-text-secondary">
              <Link2 size={10} class="text-accent" />
              {extractBacklinkPreview(note.content)}
            </div>
          {/if}
        </a>
      {/each}
    </div>
  {:else}
    <div class="space-y-2">
      {#each filteredNotes as note, i (note.id)}
        <a
          href="#/notes/{note.id}"
          class="flex items-center gap-4 bg-surface rounded-lg border border-border p-4 hover:border-accent/40 transition-all duration-200 animate-fade-in"
          style="animation-delay: {i * 40}ms"
        >
          <FileText size={20} class="text-accent/50 shrink-0" />
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-text truncate">{note.title}</h3>
            <p class="text-sm text-text-secondary truncate">{note.content.slice(0, 100)}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            {#each note.tags?.slice(0, 2) as tag}
              <span class="px-2 py-0.5 text-xs bg-accent/10 text-accent rounded-full">{tag}</span>
            {/each}
            <span class="text-xs text-text-secondary">{formatDate(note.updatedAt)}</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}

  {#if filteredNotes.length === 0}
    <div class="flex flex-col items-center justify-center py-20 text-text-secondary">
      <FileText size={48} class="mb-4 opacity-30" />
      <p class="text-lg">暂无笔记</p>
      <p class="text-sm mt-1">点击"新建笔记"开始记录你的知识</p>
    </div>
  {/if}
</div>

{#if showAddModal}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onclick={() => showAddModal = false}>
    <div class="bg-surface rounded-xl border border-border p-6 w-full max-w-lg animate-fade-in" onclick={(e) => e.stopPropagation()}>
      <h2 class="text-xl font-bold mb-4" style="font-family: var(--font-display)">新建笔记</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm text-text-secondary mb-1">标题 *</label>
          <input bind:value={newNote.title} class="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:border-accent" placeholder="笔记标题" />
        </div>
        <div>
          <label class="block text-sm text-text-secondary mb-1">内容</label>
          <textarea bind:value={newNote.content} rows="6" class="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text resize-none focus:outline-none focus:border-accent" placeholder="笔记内容... 使用 [[双括号]] 创建知识链接"></textarea>
        </div>
        <div>
          <label class="block text-sm text-text-secondary mb-1">标签（逗号分隔）</label>
          <input bind:value={newNote.tags} class="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text focus:outline-none focus:border-accent" placeholder="如：哲学, 认知科学, 方法论" />
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-6">
        <button onclick={() => showAddModal = false} class="px-4 py-2 text-text-secondary hover:text-text transition-colors">取消</button>
        <button onclick={handleAddNote} class="px-4 py-2 bg-accent text-bg font-semibold rounded-lg hover:bg-accent-hover transition-colors">创建</button>
      </div>
    </div>
  </div>
{/if}
