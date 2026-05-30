<script lang="ts">
import { onMount } from 'svelte'
import { notesStore } from '$lib/stores/notes'
import { graphStore } from '$lib/stores/graph'
import { ArrowLeft, Save, Tag, Link2, Trash2, Share2 } from 'lucide-svelte'
import { formatDate } from '$lib/utils/time'

let noteId = $state('')
let note = $state<any>(null)
let title = $state('')
let content = $state('')
let tagInput = $state('')
let showLinkSuggestion = $state(false)
let linkSearchQuery = $state('')
let suggestedNotes = $state<any[]>([])

let tags = $derived(tagInput.split(',').map(t => t.trim()).filter(Boolean))

let backlinkMatches = $derived.by(() => {
  const matches = content.match(/\[\[(.+?)\]\]/g)
  if (!matches) return []
  return matches.map(m => m.replace(/\[\[|\]\]/g, ''))
})

onMount(async () => {
  const hash = window.location.hash
  const match = hash.match(/\/notes\/(.+)$/)
  if (match) noteId = match[1]
  await notesStore.load()
  const all = $notesStore
  note = all.find((n: any) => n.id === noteId)
  if (note) {
    title = note.title
    content = note.content
    tagInput = (note.tags || []).join(', ')
  }
})

async function saveNote() {
  if (!noteId) return
  await notesStore.updateNote(noteId, {
    title, content, tags
  })
  if (note) note = { ...note, title, content, tags, updatedAt: Date.now() }
}

function handleContentInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  content = target.value
  const cursorPos = target.selectionStart
  const textBefore = content.slice(0, cursorPos)
  const doubleBracketMatch = textBefore.match(/\[\[([^[\]]*)$/)
  if (doubleBracketMatch) {
    linkSearchQuery = doubleBracketMatch[1]
    showLinkSuggestion = true
    const q = linkSearchQuery.toLowerCase()
    suggestedNotes = $notesStore.filter((n: any) =>
      n.id !== noteId && n.title.toLowerCase().includes(q)
    ).slice(0, 5)
  } else {
    showLinkSuggestion = false
  }
}

function insertLink(linkTitle: string) {
  const textarea = document.querySelector('textarea')
  if (!textarea) return
  const cursorPos = textarea.selectionStart
  const textBefore = content.slice(0, cursorPos)
  const textAfter = content.slice(cursorPos)
  const newTextBefore = textBefore.replace(/\[\[([^[\]]*)$/, `[[${linkTitle}]]`)
  content = newTextBefore + textAfter
  showLinkSuggestion = false
}

async function deleteNote() {
  if (!noteId) return
  await notesStore.deleteNote(noteId)
  window.location.hash = '#/notes'
}
</script>

<div class="h-full overflow-y-auto">
  {#if note}
    <div class="p-6">
      <div class="flex items-center justify-between mb-6 animate-fade-in">
        <a href="#/notes" class="flex items-center gap-2 text-text-secondary hover:text-text transition-colors">
          <ArrowLeft size={20} />
          <span class="text-sm">返回笔记列表</span>
        </a>
        <div class="flex items-center gap-3">
          <button
            onclick={deleteNote}
            class="p-2 text-danger/60 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
          <button
            onclick={() => window.location.hash = '#/graph'}
            class="p-2 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
          >
            <Share2 size={18} />
          </button>
          <button
            onclick={saveNote}
            class="flex items-center gap-2 px-4 py-2 bg-accent text-bg font-semibold rounded-lg hover:bg-accent-hover transition-colors"
          >
            <Save size={16} />
            保存
          </button>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <div class="col-span-8 animate-fade-in" style="animation-delay: 80ms">
          <input
            bind:value={title}
            class="w-full text-2xl font-bold bg-transparent border-none outline-none mb-4 placeholder-text-secondary"
            style="font-family: var(--font-display)"
            placeholder="笔记标题"
          />
          <div class="relative">
            <textarea
              oninput={handleContentInput}
              bind:value={content}
              rows="20"
              class="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text resize-none focus:outline-none focus:border-accent leading-relaxed"
              placeholder="开始书写... 使用 [[双括号]] 创建知识链接"
              style="font-family: var(--font-body)"
            ></textarea>
            {#if showLinkSuggestion && suggestedNotes.length > 0}
              <div class="absolute left-4 bottom-20 w-64 bg-surface-elevated border border-border rounded-lg shadow-xl overflow-hidden z-10">
                <div class="px-3 py-2 text-xs text-text-secondary border-b border-border">关联笔记</div>
                {#each suggestedNotes as sn}
                  <button
                    onclick={() => insertLink(sn.title)}
                    class="w-full text-left px-3 py-2 text-sm text-text hover:bg-accent/10 transition-colors truncate"
                  >
                    <Link2 size={12} class="inline mr-2 text-accent" />
                    {sn.title}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="col-span-4 space-y-4 animate-fade-in" style="animation-delay: 160ms">
          <div class="bg-surface rounded-xl border border-border p-4">
            <h3 class="font-semibold flex items-center gap-2 mb-3">
              <Tag size={16} class="text-accent" />
              标签
            </h3>
            <input
              bind:value={tagInput}
              class="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent"
              placeholder="标签，逗号分隔"
            />
            <div class="flex flex-wrap gap-1 mt-2">
              {#each tags as tag}
                <span class="px-2 py-0.5 text-xs bg-accent/10 text-accent rounded-full">{tag}</span>
              {/each}
            </div>
          </div>

          <div class="bg-surface rounded-xl border border-border p-4">
            <h3 class="font-semibold flex items-center gap-2 mb-3">
              <Link2 size={16} class="text-accent" />
              知识链接
            </h3>
            {#if backlinkMatches.length > 0}
              <div class="space-y-1">
                {#each backlinkMatches as match}
                  <div class="px-3 py-2 bg-bg rounded-lg text-sm text-accent">[[{match}]]</div>
                {/each}
              </div>
            {:else}
              <p class="text-sm text-text-secondary">使用 [[双括号]] 创建链接</p>
            {/if}
          </div>

          <div class="bg-surface rounded-xl border border-border p-4">
            <h3 class="font-semibold mb-3">元信息</h3>
            <div class="space-y-2 text-sm text-text-secondary">
              <div>创建：{formatDate(note.createdAt)}</div>
              <div>修改：{formatDate(note.updatedAt)}</div>
            </div>
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
