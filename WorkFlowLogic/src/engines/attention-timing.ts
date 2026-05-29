import type { TaskItem, HourlyFocusProfile, OptimizationWeights } from '~/types'

export interface TimingRecommendation {
  taskId: string
  bestHour: number
  confidenceScore: number
  reasoning: string
}

export function generateTimingRecommendations(
  tasks: TaskItem[],
  hourlyProfile: HourlyFocusProfile[],
  weights: OptimizationWeights
): TimingRecommendation[] {
  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "active")

  return pendingTasks.map((task) => {
    const scores: Array<{ hour: number; score: number }> = []

    for (let h = 8; h < 22; h++) {
      const profile = hourlyProfile[h]
      const avgFocus = profile?.avgFocus ?? 50
      const focusScore = avgFocus / 100

      const focusMatch = 1 - Math.abs(task.focusNeed - focusScore)

      let deadlineBonus = 0
      if (task.deadline) {
        const hoursUntil = (task.deadline - Date.now()) / 3600000
        deadlineBonus = hoursUntil <= 4 ? 1 : hoursUntil <= 24 ? 0.6 : 0.2
      }

      const combined = focusMatch * weights.focusNeed
        + task.urgency * weights.urgency
        + deadlineBonus * weights.deadline
        + task.importance * weights.importance * 0.3

      scores.push({ hour: h, score: combined })
    }

    scores.sort((a, b) => b.score - a.score)
    const best = scores[0]

    const hourStr = `${best.hour}:00`
    let reasoning = ""
    if (task.focusNeed >= 0.7) {
      reasoning = `高专注需求任务，推荐在 ${hourStr} 专注力高峰时段执行`
    } else if (task.urgency >= 0.8) {
      reasoning = `紧急任务，推荐在 ${hourStr} 尽早执行`
    } else if (task.deadline && task.deadline - Date.now() < 86400000) {
      reasoning = `临近截止，推荐在 ${hourStr} 优先处理`
    } else {
      reasoning = `综合评分最优时段为 ${hourStr}，专注需求与时段匹配度高`
    }

    return {
      taskId: task.id,
      bestHour: best.hour,
      confidenceScore: Math.round(best.score * 100),
      reasoning,
    }
  })
}

export function predictFocusCurve(
  hourlyProfile: HourlyFocusProfile[],
  currentHour: number
): Array<{ hour: number; predicted: number }> {
  return Array.from({ length: 24 }, (_, h) => {
    const profile = hourlyProfile[h]
    const base = profile?.avgFocus ?? 50
    const proximityBoost = h >= currentHour && h <= currentHour + 2 ? 10 : 0
    const fatigueDip = h >= 14 && h <= 15 ? -15 : 0
    return {
      hour: h,
      predicted: Math.max(0, Math.min(100, base + proximityBoost + fatigueDip)),
    }
  })
}
