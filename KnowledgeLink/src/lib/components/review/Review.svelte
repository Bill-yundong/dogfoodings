<script lang="ts">
import { onMount } from 'svelte'
import { reviewStore } from '$lib/stores/review'
import { get } from 'svelte/store'
import { Brain, Play, AlertTriangle, Clock, Zap, ChevronRight, BarChart3 } from 'lucide-svelte'
import { formatDate } from '$lib/utils/time'

onMount(() => {
  reviewStore.load()
})

let dueCards = $derived(get(reviewStore.todayCards) || [])
let totalLoad = $derived(get(reviewStore.totalCognitiveLoad) || 0)
let loadClass = $derived(reviewStore.getClassification(totalLoad))
let recommendedSize = $derived(reviewStore.getRecommendSize(totalLoad))

let loadColor = $derived(
  loadClass === 'low' ? 'text-success' :
  loadClass === 'medium' ? 'text-warning' : 'text-danger'
)

let loadBg = $derived(
  loadClass === 'low' ? 'bg-success/10 border-success/20' :
  loadClass === 'medium' ? 'bg-warning/10 border-warning/20' : 'bg-danger/10 border-danger/20'
)

function startSession() {
  const cards = dueCards.slice(0, recommendedSize)
  reviewStore.startSession(cards)
  window.location.hash = '#/review/session'
}
</script>

<div class="h-full overflow-y-auto p-6">
  <!-- Header -->
  <div class="flex items-center justify-between mb-8 animate-fade-in">
    <div>
      <h1 class="text-3xl font-bold" style="font-family: var(--font-display)">复习引擎</h1>
      <p class="text-text-secondary mt-1">认知负荷感知的间隔重复 · 知识永不忘</p>
    </div>
    <a href="#/review/curves" class="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent/40 transition-colors">
      <BarChart3 size={16} />
      记忆曲线
    </a>
  </div>

  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in" style="animation-delay: 80ms">
    <div class="bg-surface rounded-xl border border-border p-5">
      <div class="flex items-center gap-3 mb-2">
        <div class="p-2 bg-accent/10 rounded-lg"><Clock size={20} class="text-accent" /></div>
        <span class="text-sm text-text-secondary">待复习</span>
      </div>
      <div class="text-3xl font-bold" style="font-family: var(--font-mono)">{dueCards.length}</div>
      <div class="text-xs text-text-secondary mt-1">张卡片到期</div>
    </div>
    <div class="bg-surface rounded-xl border border-border p-5">
      <div class="flex items-center gap-3 mb-2">
        <div class="p-2 {loadBg} rounded-lg border"><Zap size={20} class={loadColor} /></div>
        <span class="text-sm text-text-secondary">认知负荷</span>
      </div>
      <div class="text-3xl font-bold {loadColor}" style="font-family: var(--font-mono)">{totalLoad.toFixed(1)}</div>
      <div class="text-xs text-text-secondary mt-1">{loadClass === 'low' ? '低负荷' : loadClass === 'medium' ? '中等负荷' : '高负荷'}</div>
    </div>
    <div class="bg-surface rounded-xl border border-border p-5">
      <div class="flex items-center gap-3 mb-2">
        <div class="p-2 bg-success/10 rounded-lg"><Brain size={20} class="text-success" /></div>
        <span class="text-sm text-text-secondary">建议复习量</span>
      </div>
      <div class="text-3xl font-bold text-success" style="font-family: var(--font-mono)">{recommendedSize}</div>
      <div class="text-xs text-text-secondary mt-1">张卡片/会话</div>
    </div>
  </div>

  <!-- Cognitive Load Warning -->
  {#if loadClass === 'high'}
    <div class="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-3 animate-fade-in" style="animation-delay: 120ms">
      <AlertTriangle size={20} class="text-danger shrink-0" />
      <div>
        <p class="font-medium text-danger">认知负荷较高</p>
        <p class="text-sm text-text-secondary">建议减少单次复习数量，优先复习到期最久的卡片</p>
      </div>
    </div>
  {/if}

  <!-- Start Session Button -->
  <div class="mb-8 animate-fade-in" style="animation-delay: 160ms">
    {#if dueCards.length > 0}
      <button
        onclick={startSession}
        class="flex items-center gap-3 px-8 py-4 bg-accent text-bg font-bold text-lg rounded-xl hover:bg-accent-hover transition-all duration-200 hover:shadow-xl hover:shadow-accent/20 animate-pulse-glow"
      >
        <Play size={24} />
        开始复习会话
      </button>
    {:else}
      <div class="flex items-center gap-3 px-8 py-4 bg-surface border border-border rounded-xl text-text-secondary">
        <Brain size={24} />
        <span>暂无待复习卡片，知识掌握良好！</span>
      </div>
    {/if}
  </div>

  <!-- Due Cards List -->
  <div class="animate-fade-in" style="animation-delay: 240ms">
    <h2 class="font-semibold mb-4">复习队列</h2>
    <div class="space-y-2">
      {#each dueCards.slice(0, 20) as card, i (card.id)}
        <div class="flex items-center justify-between bg-surface rounded-lg border border-border p-4 hover:border-accent/30 transition-colors">
          <div class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs flex items-center justify-center" style="font-family: var(--font-mono)">{i + 1}</span>
            <div>
              <p class="text-sm font-medium truncate max-w-md">{card.front}</p>
              <p class="text-xs text-text-secondary">难度 {card.difficulty.toFixed(1)} · 复习 {card.reviewCount} 次</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 text-xs rounded-full {card.retrievability >= 0.7 ? 'bg-success/10 text-success' : card.retrievability >= 0.4 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}">
              留存率 {(card.retrievability * 100).toFixed(0)}%
            </span>
            <ChevronRight size={16} class="text-text-secondary" />
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
