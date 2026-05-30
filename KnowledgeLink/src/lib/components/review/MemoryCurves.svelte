<script lang="ts">
import { onMount } from 'svelte'
import { reviewStore } from '$lib/stores/review'
import { dashboardStore } from '$lib/stores/dashboard'
import { get } from 'svelte/store'
import { ArrowLeft, TrendingDown, Zap, Target } from 'lucide-svelte'
import { calculateRetrievability } from '$lib/engines/scheduler'

let canvas = $state<HTMLCanvasElement>(undefined as any)
let chartInstance: any = null

onMount(async () => {
  await reviewStore.load()
  await dashboardStore.refresh()
  drawChart()
})

function drawChart() {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const days = Array.from({ length: 31 }, (_, i) => i)
  const stabilities = [1, 3, 7, 15, 30]
  const colors = ['#ff6b6b', '#ff9f43', '#e2b714', '#53d769', '#3b82f6']

  const chartData = {
    labels: days,
    datasets: stabilities.map((s, i) => ({
      label: `稳定性 ${s}`,
      data: days.map(d => calculateRetrievability(s, d) * 100),
      borderColor: colors[i],
      backgroundColor: colors[i] + '20',
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2,
    }))
  }

  if (chartInstance) chartInstance.destroy()

  import('chart.js').then(({ Chart }) => {
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#8888a8', font: { family: "'Source Sans 3', sans-serif" } }
          },
          title: {
            display: true,
            text: '遗忘曲线 — 不同稳定性下的留存率',
            color: '#e8e8f0',
            font: { size: 16, family: "'Playfair Display', serif" }
          }
        },
        scales: {
          x: {
            title: { display: true, text: '天数', color: '#8888a8' },
            ticks: { color: '#8888a8' },
            grid: { color: '#2a2a4a' }
          },
          y: {
            title: { display: true, text: '留存率 (%)', color: '#8888a8' },
            ticks: { color: '#8888a8' },
            grid: { color: '#2a2a4a' },
            min: 0, max: 100
          }
        }
      }
    })
  })
}

let cards = $derived(get({ subscribe: reviewStore.subscribe }))

let avgRetention = $derived(
  cards.length > 0
    ? (cards.reduce((s: number, c: any) => s + (c.retrievability || 0), 0) / cards.length * 100).toFixed(0)
    : '85'
)

let highRiskCount = $derived(
  cards.filter((c: any) => (c.retrievability || 1) < 0.5).length
)
</script>

<div class="h-full overflow-y-auto p-6">
  <div class="flex items-center gap-4 mb-8 animate-fade-in">
    <a href="#/review" class="p-2 hover:bg-surface rounded-lg transition-colors">
      <ArrowLeft size={20} class="text-text-secondary" />
    </a>
    <div>
      <h1 class="text-3xl font-bold" style="font-family: var(--font-display)">记忆曲线</h1>
      <p class="text-text-secondary mt-1">基于幂次衰减模型的留存率预测</p>
    </div>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in" style="animation-delay: 80ms">
    <div class="bg-surface rounded-xl border border-border p-5">
      <div class="flex items-center gap-3 mb-2">
        <Target size={20} class="text-accent" />
        <span class="text-sm text-text-secondary">平均留存率</span>
      </div>
      <div class="text-3xl font-bold text-accent" style="font-family: var(--font-mono)">{avgRetention}%</div>
    </div>
    <div class="bg-surface rounded-xl border border-border p-5">
      <div class="flex items-center gap-3 mb-2">
        <TrendingDown size={20} class="text-danger" />
        <span class="text-sm text-text-secondary">高风险卡片</span>
      </div>
      <div class="text-3xl font-bold text-danger" style="font-family: var(--font-mono)">{highRiskCount}</div>
    </div>
    <div class="bg-surface rounded-xl border border-border p-5">
      <div class="flex items-center gap-3 mb-2">
        <Zap size={20} class="text-success" />
        <span class="text-sm text-text-secondary">总卡片数</span>
      </div>
      <div class="text-3xl font-bold text-success" style="font-family: var(--font-mono)">{cards.length}</div>
    </div>
  </div>

  <!-- Chart -->
  <div class="bg-surface rounded-xl border border-border p-6 animate-fade-in" style="animation-delay: 160ms">
    <div class="h-[400px]">
      <canvas bind:this={canvas}></canvas>
    </div>
  </div>
</div>
