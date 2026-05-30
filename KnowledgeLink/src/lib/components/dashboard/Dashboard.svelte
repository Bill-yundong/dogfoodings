<script lang="ts">
import { onMount } from 'svelte'
import { dashboardStore } from '$lib/stores/dashboard'
import { get } from 'svelte/store'
import { BookOpen, FileText, Brain, Share2, TrendingUp, Target, Flame, Award } from 'lucide-svelte'
import { formatDate, startOfDay } from '$lib/utils/time'

let heatmapCanvas = $state<HTMLCanvasElement>(undefined as any)
let retentionCanvas = $state<HTMLCanvasElement>(undefined as any)
let chartInstance: any = null
let metricsData = $state({ totalBooks: 0, totalNotes: 0, totalCards: 0, totalNodes: 0, cardsDueToday: 0, averageRetention: 0.85, weeklyGrowthRate: 0, streakDays: 0, totalReviewsCompleted: 0 })
let heatmapDataArr = $state<{date: number; count: number}[]>([])
let retentionCurveArr = $state<{day: number; retention: number}[]>([])

onMount(async () => {
  await dashboardStore.refresh()
  const m = get(dashboardStore.metrics)
  metricsData = m
  heatmapDataArr = get(dashboardStore.heatmap)
  retentionCurveArr = get(dashboardStore.retentionCurve)
  drawHeatmap()
  drawRetentionCurve()
})

function drawHeatmap() {
  if (!heatmapCanvas || heatmapDataArr.length === 0) return
  const ctx = heatmapCanvas.getContext('2d')
  if (!ctx) return

  const cellSize = 12
  const gap = 2
  const cols = 52
  const rows = 7
  const width = cols * (cellSize + gap)
  const height = rows * (cellSize + gap)

  heatmapCanvas.width = width
  heatmapCanvas.height = height

  const maxCount = Math.max(...heatmapDataArr.map(d => d.count), 1)

  heatmapDataArr.forEach((d, i) => {
    const col = Math.floor(i / rows)
    const row = i % rows
    const intensity = d.count / maxCount
    const r = Math.round(26 + intensity * 0)
    const g = Math.round(26 + intensity * (183 - 26))
    const b = Math.round(46 + intensity * (20 - 46))
    ctx!.fillStyle = d.count === 0 ? '#1a1a2e' : `rgba(226, 183, 20, ${0.15 + intensity * 0.85})`
    ctx!.fillRect(col * (cellSize + gap), row * (cellSize + gap), cellSize, cellSize)
  })
}

function drawRetentionCurve() {
  if (!retentionCanvas || retentionCurveArr.length === 0) return
  const ctx = retentionCanvas.getContext('2d')
  if (!ctx) return

  import('chart.js').then(({ Chart }) => {
    if (chartInstance) chartInstance.destroy()

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: retentionCurveArr.map(d => d.day),
        datasets: [{
          label: '预测留存率',
          data: retentionCurveArr.map(d => d.retention * 100),
          borderColor: '#e2b714',
          backgroundColor: 'rgba(226, 183, 20, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        }, {
          label: '目标留存率',
          data: retentionCurveArr.map(() => 85),
          borderColor: '#53d769',
          borderDash: [5, 5],
          pointRadius: 0,
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#8888a8', font: { family: "'Source Sans 3', sans-serif", size: 11 } }
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

function getRetentionColor(retention: number): string {
  if (retention >= 0.85) return 'text-success'
  if (retention >= 0.7) return 'text-warning'
  return 'text-danger'
}
</script>

<div class="h-full overflow-y-auto p-6">
  <div class="mb-8 animate-fade-in">
    <h1 class="text-3xl font-bold" style="font-family: var(--font-display)">成长仪表板</h1>
    <p class="text-text-secondary mt-1">量化知识体系 · 跟踪成长轨迹</p>
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in" style="animation-delay: 80ms">
    <div class="bg-surface rounded-xl border border-border p-5">
      <div class="flex items-center gap-2 mb-3">
        <BookOpen size={18} class="text-accent" />
        <span class="text-sm text-text-secondary">藏书</span>
      </div>
      <div class="text-3xl font-bold" style="font-family: var(--font-mono)">{metricsData.totalBooks}</div>
    </div>
    <div class="bg-surface rounded-xl border border-border p-5">
      <div class="flex items-center gap-2 mb-3">
        <FileText size={18} class="text-accent" />
        <span class="text-sm text-text-secondary">笔记</span>
      </div>
      <div class="text-3xl font-bold" style="font-family: var(--font-mono)">{metricsData.totalNotes}</div>
    </div>
    <div class="bg-surface rounded-xl border border-border p-5">
      <div class="flex items-center gap-2 mb-3">
        <Share2 size={18} class="text-accent" />
        <span class="text-sm text-text-secondary">知识节点</span>
      </div>
      <div class="text-3xl font-bold" style="font-family: var(--font-mono)">{metricsData.totalNodes}</div>
    </div>
    <div class="bg-surface rounded-xl border border-border p-5">
      <div class="flex items-center gap-2 mb-3">
        <Brain size={18} class="text-accent" />
        <span class="text-sm text-text-secondary">复习卡片</span>
      </div>
      <div class="text-3xl font-bold" style="font-family: var(--font-mono)">{metricsData.totalCards}</div>
    </div>
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in" style="animation-delay: 160ms">
    <div class="bg-surface rounded-xl border border-border p-4">
      <div class="flex items-center gap-2 mb-2">
        <Target size={14} class="text-success" />
        <span class="text-xs text-text-secondary">平均留存率</span>
      </div>
      <div class="text-xl font-bold {getRetentionColor(metricsData.averageRetention)}" style="font-family: var(--font-mono)">
        {(metricsData.averageRetention * 100).toFixed(0)}%
      </div>
    </div>
    <div class="bg-surface rounded-xl border border-border p-4">
      <div class="flex items-center gap-2 mb-2">
        <TrendingUp size={14} class="text-accent" />
        <span class="text-xs text-text-secondary">周增长率</span>
      </div>
      <div class="text-xl font-bold text-accent" style="font-family: var(--font-mono)">
        {metricsData.weeklyGrowthRate.toFixed(1)}%
      </div>
    </div>
    <div class="bg-surface rounded-xl border border-border p-4">
      <div class="flex items-center gap-2 mb-2">
        <Flame size={14} class="text-warning" />
        <span class="text-xs text-text-secondary">连续天数</span>
      </div>
      <div class="text-xl font-bold text-warning" style="font-family: var(--font-mono)">
        {metricsData.streakDays}
      </div>
    </div>
    <div class="bg-surface rounded-xl border border-border p-4">
      <div class="flex items-center gap-2 mb-2">
        <Award size={14} class="text-accent" />
        <span class="text-xs text-text-secondary">总复习次数</span>
      </div>
      <div class="text-xl font-bold" style="font-family: var(--font-mono)">
        {metricsData.totalReviewsCompleted}
      </div>
    </div>
  </div>

  <div class="bg-surface rounded-xl border border-border p-6 mb-8 animate-fade-in" style="animation-delay: 240ms">
    <h2 class="font-semibold mb-4">学习热力图</h2>
    <div class="overflow-x-auto">
      <canvas bind:this={heatmapCanvas}></canvas>
    </div>
    <div class="flex items-center justify-end gap-2 mt-2 text-xs text-text-secondary">
      <span>少</span>
      <div class="flex gap-0.5">
        <div class="w-3 h-3 rounded-sm bg-surface-elevated"></div>
        <div class="w-3 h-3 rounded-sm" style="background: rgba(226,183,20,0.15)"></div>
        <div class="w-3 h-3 rounded-sm" style="background: rgba(226,183,20,0.4)"></div>
        <div class="w-3 h-3 rounded-sm" style="background: rgba(226,183,20,0.7)"></div>
        <div class="w-3 h-3 rounded-sm" style="background: rgba(226,183,20,1)"></div>
      </div>
      <span>多</span>
    </div>
  </div>

  <div class="bg-surface rounded-xl border border-border p-6 animate-fade-in" style="animation-delay: 320ms">
    <h2 class="font-semibold mb-4">留存率预测曲线</h2>
    <div class="h-[300px]">
      <canvas bind:this={retentionCanvas}></canvas>
    </div>
  </div>
</div>
