import { createStore } from 'solid-js/store'
import type { EfficiencyRecord } from '~/types'

function generateMockRecords(days: number): EfficiencyRecord[] {
  const records: EfficiencyRecord[] = []
  const now = new Date()
  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const baseMultiplier = isWeekend ? 0.6 : 1.0
    const trendFactor = 1 + (days - i) / days * 0.15

    records.push({
      date: date.toISOString().split("T")[0],
      focusScore: Math.min(100, Math.round((40 + Math.random() * 35) * baseMultiplier * trendFactor)),
      taskCompletionRate: Math.min(100, Math.round((35 + Math.random() * 40) * baseMultiplier * trendFactor)),
      timeUtilization: Math.min(100, Math.round((45 + Math.random() * 30) * baseMultiplier * trendFactor)),
      rhythmStability: Math.min(100, Math.round((50 + Math.random() * 30) * baseMultiplier * trendFactor)),
      recoveryEfficiency: Math.min(100, Math.round((40 + Math.random() * 35) * baseMultiplier * trendFactor)),
      totalDeepFocusMinutes: Math.round((30 + Math.random() * 90) * baseMultiplier * trendFactor),
      totalTasksCompleted: Math.round((2 + Math.random() * 6) * baseMultiplier),
    })
  }
  return records
}

interface EfficiencyState {
  records: EfficiencyRecord[]
  selectedPeriod: 7 | 30 | 90
}

const [efficiencyState, setEfficiencyState] = createStore<EfficiencyState>({
  records: generateMockRecords(90),
  selectedPeriod: 7,
})

export function setPeriod(period: 7 | 30 | 90) {
  setEfficiencyState("selectedPeriod", period)
}

export function getFilteredRecords(): EfficiencyRecord[] {
  const count = efficiencyState.selectedPeriod
  return efficiencyState.records.slice(-count)
}

export function getLatestRecord(): EfficiencyRecord | null {
  if (efficiencyState.records.length === 0) return null
  return efficiencyState.records[efficiencyState.records.length - 1]
}

export function getAverageMetrics() {
  const records = getFilteredRecords()
  if (records.length === 0) return null
  const sum = records.reduce(
    (acc, r) => ({
      focusScore: acc.focusScore + r.focusScore,
      taskCompletionRate: acc.taskCompletionRate + r.taskCompletionRate,
      timeUtilization: acc.timeUtilization + r.timeUtilization,
      rhythmStability: acc.rhythmStability + r.rhythmStability,
      recoveryEfficiency: acc.recoveryEfficiency + r.recoveryEfficiency,
    }),
    { focusScore: 0, taskCompletionRate: 0, timeUtilization: 0, rhythmStability: 0, recoveryEfficiency: 0 }
  )
  const n = records.length
  return {
    focusScore: Math.round(sum.focusScore / n),
    taskCompletionRate: Math.round(sum.taskCompletionRate / n),
    timeUtilization: Math.round(sum.timeUtilization / n),
    rhythmStability: Math.round(sum.rhythmStability / n),
    recoveryEfficiency: Math.round(sum.recoveryEfficiency / n),
  }
}

export { efficiencyState }
