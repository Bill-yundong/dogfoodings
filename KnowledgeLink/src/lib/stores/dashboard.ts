import { writable, derived, get } from 'svelte/store'
import { booksRepo, notesRepo, reviewCardsRepo, reviewLogsRepo, knowledgeNodesRepo } from '$lib/db/repositories'
import { now, startOfDay, daysSince } from '$lib/utils/time'

interface DashboardMetrics {
  totalBooks: number; totalNotes: number; totalCards: number; totalNodes: number
  cardsDueToday: number; averageRetention: number; weeklyGrowthRate: number
  streakDays: number; totalReviewsCompleted: number
}

interface HeatmapData {
  date: number; count: number
}

function createDashboardStore() {
  const metrics = writable<DashboardMetrics>({
    totalBooks: 0, totalNotes: 0, totalCards: 0, totalNodes: 0,
    cardsDueToday: 0, averageRetention: 0.85, weeklyGrowthRate: 0,
    streakDays: 0, totalReviewsCompleted: 0
  })
  const heatmap = writable<HeatmapData[]>([])
  const retentionCurve = writable<{day: number; retention: number}[]>([])

  return {
    metrics, heatmap, retentionCurve,
    async refresh() {
      const t = now()
      const today = startOfDay(t)
      const books = await booksRepo.getAll()
      const notes = await notesRepo.getAll()
      const cards = await reviewCardsRepo.getAll() as any[]
      const logs = await reviewLogsRepo.getAll() as any[]
      const nodes = await knowledgeNodesRepo.getAll()

      const cardsDueToday = cards.filter((c: any) => c.nextReviewAt <= t).length
      const avgRetention = cards.length > 0
        ? cards.reduce((s: number, c: any) => s + (c.retrievability || 0.5), 0) / cards.length
        : 0.85

      const weekAgo = t - 7 * 86400000
      const recentLogs = logs.filter((l: any) => l.reviewedAt >= weekAgo)
      const weeklyGrowthRate = logs.length > 0 ? (recentLogs.length / Math.max(logs.length, 1)) * 100 : 0

      let streakDays = 0
      for (let i = 0; i < 365; i++) {
        const dayStart = startOfDay(t - i * 86400000)
        const dayEnd = dayStart + 86400000
        const hasActivity = logs.some((l: any) => l.reviewedAt >= dayStart && l.reviewedAt < dayEnd)
        if (hasActivity) streakDays++
        else if (i > 0) break
      }

      metrics.set({
        totalBooks: books.length, totalNotes: notes.length,
        totalCards: cards.length, totalNodes: nodes.length,
        cardsDueToday, averageRetention: avgRetention,
        weeklyGrowthRate, streakDays, totalReviewsCompleted: logs.length
      })

      const heatmapMap = new Map<number, number>()
      logs.forEach((l: any) => {
        const day = startOfDay(l.reviewedAt)
        heatmapMap.set(day, (heatmapMap.get(day) || 0) + 1)
      })
      const heatmapArr: HeatmapData[] = []
      for (let i = 364; i >= 0; i--) {
        const day = startOfDay(t - i * 86400000)
        heatmapArr.push({ date: day, count: heatmapMap.get(day) || 0 })
      }
      heatmap.set(heatmapArr)

      const curve: {day: number; retention: number}[] = []
      for (let d = 0; d <= 30; d++) {
        const stability = 5
        const retention = Math.pow(1 + d / (stability * 9), -1)
        curve.push({ day: d, retention })
      }
      retentionCurve.set(curve)
    }
  }
}

export const dashboardStore = createDashboardStore()
