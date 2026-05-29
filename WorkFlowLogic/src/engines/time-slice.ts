import type { TaskItem, TimeSlot, TimeSliceAllocation, OptimizationWeights, HourlyFocusProfile } from '~/types'

function normalize(values: number[]): number[] {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  return values.map((v) => (v - min) / range)
}

function getSlotQualityScore(slot: TimeSlot, hourlyProfile: HourlyFocusProfile[]): number {
  const startHour = new Date(slot.start).getHours()
  const endHour = new Date(slot.end).getHours()
  let total = 0
  let count = 0
  for (let h = startHour; h <= endHour; h++) {
    const profile = hourlyProfile.find((p) => p.hour === h % 24)
    if (profile && profile.sampleCount > 0) {
      total += profile.avgFocus
      count++
    }
  }
  return count > 0 ? total / count / 100 : 0.5
}

function focusMatch(taskFocusNeed: number, slotQualityScore: number): number {
  return 1 - Math.abs(taskFocusNeed - slotQualityScore)
}

function deadlineProximity(deadline: number | null, slotStart: number): number {
  if (deadline === null) return 0
  const hoursUntilDeadline = (deadline - slotStart) / 3600000
  if (hoursUntilDeadline <= 0) return 1
  if (hoursUntilDeadline <= 4) return 0.9
  if (hoursUntilDeadline <= 24) return 0.7
  if (hoursUntilDeadline <= 72) return 0.4
  return 0.1
}

export function computeScore(
  task: TaskItem,
  slot: TimeSlot,
  weights: OptimizationWeights,
  hourlyProfile: HourlyFocusProfile[]
): { score: number; factors: Record<string, number> } {
  const slotQuality = getSlotQualityScore(slot, hourlyProfile)

  const uFactor = task.urgency * weights.urgency
  const iFactor = task.importance * weights.importance
  const fFactor = focusMatch(task.focusNeed, slotQuality) * weights.focusNeed
  const dFactor = deadlineProximity(task.deadline, slot.start) * weights.deadline

  const score = uFactor + iFactor + fFactor + dFactor

  return {
    score,
    factors: {
      urgency: uFactor,
      importance: iFactor,
      focusMatch: fFactor,
      deadline: dFactor,
    },
  }
}

export function allocateTimeSlices(
  tasks: TaskItem[],
  hourlyProfile: HourlyFocusProfile[],
  weights: OptimizationWeights,
  workStartHour: number = 8,
  workEndHour: number = 22
): TimeSliceAllocation[] {
  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "active")
  if (pendingTasks.length === 0) return []

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const slots: TimeSlot[] = []
  for (let h = Math.max(workStartHour, now.getHours()); h < workEndHour; h++) {
    const start = new Date(today)
    start.setHours(h, 0, 0, 0)
    const end = new Date(today)
    end.setHours(h + 1, 0, 0, 0)

    const avgFocus = hourlyProfile[h]?.avgFocus ?? 50
    const quality: TimeSlot["quality"] = avgFocus >= 70 ? "peak" : avgFocus >= 40 ? "normal" : "low"

    slots.push({ start: start.getTime(), end: end.getTime(), quality })
  }

  const allCandidates: Array<{ taskId: string; slot: TimeSlot; score: number; factors: Record<string, number> }> = []

  for (const task of pendingTasks) {
    const estimatedSlots = Math.ceil(task.estimatedMinutes / 60)
    for (const slot of slots) {
      const { score, factors } = computeScore(task, slot, weights, hourlyProfile)
      allCandidates.push({ taskId: task.id, slot, score, factors })
    }
  }

  allCandidates.sort((a, b) => b.score - a.score)

  const allocated = new Map<string, string[]>()
  const taskSlotCount = new Map<string, number>()
  const result: TimeSliceAllocation[] = []

  for (const candidate of allCandidates) {
    const taskSlots = taskSlotCount.get(candidate.taskId) ?? 0
    const task = pendingTasks.find((t) => t.id === candidate.taskId)
    if (!task) continue
    const maxSlots = Math.ceil(task.estimatedMinutes / 60)
    if (taskSlots >= maxSlots) continue

    const slotHour = new Date(candidate.slot.start).getHours()
    const slotAllocated = allocated.get(new Date(candidate.slot.start).toISOString().slice(0, 13)) ?? []
    if (slotAllocated.length > 0) continue

    result.push({
      taskId: candidate.taskId,
      slot: candidate.slot,
      score: candidate.score,
      factors: candidate.factors,
    })

    allocated.set(slotHour.toString(), [candidate.taskId])
    taskSlotCount.set(candidate.taskId, taskSlots + 1)
  }

  return result
}

export function getRecommendedSlots(
  task: TaskItem,
  hourlyProfile: HourlyFocusProfile[],
  weights: OptimizationWeights
): TimeSlot[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const slots: TimeSlot[] = []

  for (let h = Math.max(8, now.getHours()); h < 22; h++) {
    const start = new Date(today)
    start.setHours(h, 0, 0, 0)
    const end = new Date(today)
    end.setHours(h + 1, 0, 0, 0)

    const avgFocus = hourlyProfile[h]?.avgFocus ?? 50
    const quality: TimeSlot["quality"] = avgFocus >= 70 ? "peak" : avgFocus >= 40 ? "normal" : "low"
    slots.push({ start: start.getTime(), end: end.getTime(), quality })
  }

  return slots
    .map((slot) => ({
      slot,
      score: computeScore(task, slot, weights, hourlyProfile).score,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.slot)
}
