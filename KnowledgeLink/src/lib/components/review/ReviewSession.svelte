<script lang="ts">
import { onMount } from 'svelte'
import { reviewStore } from '$lib/stores/review'
import { get } from 'svelte/store'
import { ArrowLeft, RotateCcw, ThumbsDown, ThumbsUp, Star, X } from 'lucide-svelte'

let isFlipped = $state(false)
let currentIdx = $derived(get(reviewStore.currentCardIndex))
let sessionCards = $derived(get(reviewStore.sessionCards))
let currentCard = $derived(sessionCards[currentIdx] || null)
let isComplete = $derived(currentIdx >= sessionCards.length)
let ratings = $state<number[]>([])

function flipCard() {
  isFlipped = !isFlipped
}

async function rateCard(rating: number) {
  if (!currentCard) return
  await reviewStore.rateCard(currentCard.id, rating)
  ratings = [...ratings, rating]
  isFlipped = false
  reviewStore.currentCardIndex.update(n => n + 1)
  if (currentIdx + 1 >= sessionCards.length) {
    reviewStore.endSession()
  }
}

function exitSession() {
  reviewStore.endSession()
  window.location.hash = '#/review'
}

let avgRating = $derived(ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '0')

let ratingButtons = [
  { value: 1, label: '忘记', color: 'bg-danger/20 text-danger hover:bg-danger/30 border-danger/30' },
  { value: 2, label: '困难', color: 'bg-warning/20 text-warning hover:bg-warning/30 border-warning/30' },
  { value: 3, label: '一般', color: 'bg-text-secondary/20 text-text-secondary hover:bg-text-secondary/30 border-text-secondary/30' },
  { value: 4, label: '良好', color: 'bg-success/20 text-success hover:bg-success/30 border-success/30' },
  { value: 5, label: '完美', color: 'bg-accent/20 text-accent hover:bg-accent/30 border-accent/30' },
]
</script>

<div class="h-full flex flex-col items-center justify-center p-6">
  {#if isComplete}
    <!-- Session Complete -->
    <div class="text-center animate-fade-in">
      <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
        <Star size={40} class="text-accent" />
      </div>
      <h2 class="text-3xl font-bold mb-2" style="font-family: var(--font-display)">复习完成！</h2>
      <p class="text-text-secondary mb-6">本次复习 {ratings.length} 张卡片 · 平均评分 {avgRating}</p>
      <button
        onclick={exitSession}
        class="px-6 py-3 bg-accent text-bg font-semibold rounded-xl hover:bg-accent-hover transition-colors"
      >
        返回复习队列
      </button>
    </div>
  {:else if currentCard}
    <!-- Card Counter -->
    <div class="mb-4 text-sm text-text-secondary">
      {currentIdx + 1} / {sessionCards.length}
    </div>

    <!-- Progress Bar -->
    <div class="w-full max-w-xl mb-8">
      <div class="h-1 bg-surface rounded-full overflow-hidden">
        <div class="h-full bg-accent rounded-full transition-all duration-500" style="width: {((currentIdx) / sessionCards.length) * 100}%"></div>
      </div>
    </div>

    <!-- Flashcard -->
    <div class="w-full max-w-xl mb-8" style="perspective: 1000px">
      <div
        class="relative w-full min-h-[280px] transition-transform duration-500"
        style="transform-style: preserve-3d; transform: rotateY({isFlipped ? 180 : 0}deg)"
      >
        <!-- Front -->
        <div class="absolute inset-0 bg-surface rounded-2xl border border-border p-8 flex flex-col items-center justify-center" style="backface-visibility: hidden">
          <p class="text-xs text-text-secondary mb-4 uppercase tracking-wider">问题</p>
          <p class="text-xl font-semibold text-center leading-relaxed">{currentCard.front}</p>
        </div>
        <!-- Back -->
        <div class="absolute inset-0 bg-surface-elevated rounded-2xl border border-accent/30 p-8 flex flex-col items-center justify-center" style="backface-visibility: hidden; transform: rotateY(180deg)">
          <p class="text-xs text-accent mb-4 uppercase tracking-wider">答案</p>
          <p class="text-xl text-center leading-relaxed">{currentCard.back}</p>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3">
      {#if !isFlipped}
        <button
          onclick={flipCard}
          class="flex items-center gap-2 px-6 py-3 bg-accent text-bg font-semibold rounded-xl hover:bg-accent-hover transition-colors"
        >
          <RotateCcw size={18} />
          显示答案
        </button>
      {:else}
        {#each ratingButtons as btn}
          <button
            onclick={() => rateCard(btn.value)}
            class="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all duration-200 {btn.color}"
          >
            <span class="text-lg font-bold" style="font-family: var(--font-mono)">{btn.value}</span>
            <span class="text-xs">{btn.label}</span>
          </button>
        {/each}
      {/if}
    </div>

    <!-- Exit -->
    <button onclick={exitSession} class="mt-6 text-text-secondary hover:text-text text-sm flex items-center gap-1">
      <X size={14} />
      退出会话
    </button>
  {:else}
    <div class="text-center text-text-secondary">
      <p>加载中...</p>
    </div>
  {/if}
</div>
