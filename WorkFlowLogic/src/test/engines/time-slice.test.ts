import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computeScore, allocateTimeSlices, getRecommendedSlots } from '~/engines/time-slice'
import type { TaskItem, TimeSlot, HourlyFocusProfile, OptimizationWeights } from '~/types'

describe('TimeSlice Engine', () => {
  const mockHourlyProfile: HourlyFocusProfile[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    avgFocus: i >= 9 && i <= 11 ? 85 : i >= 14 && i <= 16 ? 70 : 50,
    sampleCount: 10,
  }))

  const mockWeights: OptimizationWeights = {
    urgency: 0.3,
    importance: 0.3,
    focusNeed: 0.25,
    deadline: 0.15,
  }

  const createMockTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
    id: 'task-' + Math.random().toString(36).slice(2),
    title: 'Test Task',
    urgency: 0.5,
    importance: 0.5,
    focusNeed: 0.5,
    deadline: null,
    estimatedMinutes: 60,
    source: 'work',
    status: 'pending',
    recommendedSlot: null,
    createdAt: Date.now(),
    completedAt: null,
    ...overrides,
  })

  const createMockSlot = (hour: number): TimeSlot => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour + 1, 0, 0)
    return {
      start: start.getTime(),
      end: end.getTime(),
      quality: hour >= 9 && hour <= 11 ? 'peak' : 'normal',
    }
  }

  describe('computeScore', () => {
    it('should compute score with all factors', () => {
      const task = createMockTask({ urgency: 0.8, importance: 0.9, focusNeed: 0.7 })
      const slot = createMockSlot(10)

      const result = computeScore(task, slot, mockWeights, mockHourlyProfile)

      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('factors')
      expect(result.factors).toHaveProperty('urgency')
      expect(result.factors).toHaveProperty('importance')
      expect(result.factors).toHaveProperty('focusMatch')
      expect(result.factors).toHaveProperty('deadline')
      expect(result.score).toBeGreaterThan(0)
      expect(result.score).toBeLessThanOrEqual(1)
    })

    it('should return higher score for urgent tasks', () => {
      const urgentTask = createMockTask({ urgency: 0.95, importance: 0.5, focusNeed: 0.5 })
      const normalTask = createMockTask({ urgency: 0.3, importance: 0.5, focusNeed: 0.5 })
      const slot = createMockSlot(10)

      const urgentScore = computeScore(urgentTask, slot, mockWeights, mockHourlyProfile)
      const normalScore = computeScore(normalTask, slot, mockWeights, mockHourlyProfile)

      expect(urgentScore.score).toBeGreaterThan(normalScore.score)
    })

    it('should return higher score for high focus need tasks during peak hours', () => {
      const highFocusTask = createMockTask({ urgency: 0.5, importance: 0.5, focusNeed: 0.9 })
      const peakSlot = createMockSlot(10)
      const lowSlot = createMockSlot(6)

      const peakScore = computeScore(highFocusTask, peakSlot, mockWeights, mockHourlyProfile)
      const lowScore = computeScore(highFocusTask, lowSlot, mockWeights, mockHourlyProfile)

      expect(peakScore.score).toBeGreaterThan(lowScore.score)
    })

    it('should handle tasks with deadlines correctly', () => {
      const urgentDeadlineTask = createMockTask({
        urgency: 0.5,
        importance: 0.5,
        focusNeed: 0.5,
        deadline: Date.now() + 3600000,
      })
      const noDeadlineTask = createMockTask({
        urgency: 0.5,
        importance: 0.5,
        focusNeed: 0.5,
        deadline: null,
      })
      const slot = createMockSlot(10)

      const deadlineScore = computeScore(urgentDeadlineTask, slot, mockWeights, mockHourlyProfile)
      const noDeadlineScore = computeScore(noDeadlineTask, slot, mockWeights, mockHourlyProfile)

      expect(deadlineScore.score).toBeGreaterThan(noDeadlineScore.score)
    })

    it('should handle past deadlines correctly', () => {
      const pastDeadlineTask = createMockTask({
        urgency: 0.5,
        importance: 0.5,
        focusNeed: 0.5,
        deadline: Date.now() - 3600000,
      })
      const slot = createMockSlot(10)

      const result = computeScore(pastDeadlineTask, slot, mockWeights, mockHourlyProfile)
      expect(result.factors.deadline).toBe(0.15)
    })
  })

  describe('allocateTimeSlices', () => {
    it('should return empty array when no pending tasks', () => {
      const completedTask = createMockTask({ status: 'completed' })
      const result = allocateTimeSlices([completedTask], mockHourlyProfile, mockWeights)
      expect(result).toEqual([])
    })

    it('should allocate time slices for pending tasks', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 8, 0, 0))

      const tasks = [
        createMockTask({ urgency: 0.9, importance: 0.8, focusNeed: 0.7, estimatedMinutes: 120 }),
        createMockTask({ urgency: 0.5, importance: 0.6, focusNeed: 0.4, estimatedMinutes: 60 }),
      ]

      const result = allocateTimeSlices(tasks, mockHourlyProfile, mockWeights, 8, 12)

      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('taskId')
      expect(result[0]).toHaveProperty('slot')
      expect(result[0]).toHaveProperty('score')
      expect(result[0]).toHaveProperty('factors')
    })

    it('should not allocate the same slot to multiple tasks', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 8, 0, 0))

      const tasks = [
        createMockTask({ urgency: 0.9, importance: 0.8, focusNeed: 0.7, estimatedMinutes: 60 }),
        createMockTask({ urgency: 0.8, importance: 0.7, focusNeed: 0.6, estimatedMinutes: 60 }),
      ]

      const result = allocateTimeSlices(tasks, mockHourlyProfile, mockWeights, 8, 10)

      const slotStarts = result.map((r) => r.slot.start)
      const uniqueSlots = new Set(slotStarts)
      expect(slotStarts.length).toBe(uniqueSlots.size)
    })

    it('should respect estimatedMinutes for slot count', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 8, 0, 0))

      const task = createMockTask({ urgency: 0.9, importance: 0.8, focusNeed: 0.7, estimatedMinutes: 180 })
      const result = allocateTimeSlices([task], mockHourlyProfile, mockWeights, 8, 14)

      const taskAllocations = result.filter((r) => r.taskId === task.id)
      expect(taskAllocations.length).toBeLessThanOrEqual(3)
    })
  })

  describe('getRecommendedSlots', () => {
    it('should return top 3 recommended slots', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 8, 0, 0))

      const task = createMockTask({ urgency: 0.7, importance: 0.8, focusNeed: 0.8 })
      const result = getRecommendedSlots(task, mockHourlyProfile, mockWeights)

      expect(result.length).toBeLessThanOrEqual(3)
      expect(result[0]).toHaveProperty('start')
      expect(result[0]).toHaveProperty('end')
      expect(result[0]).toHaveProperty('quality')
    })

    it('should recommend peak hours for high focus tasks', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 8, 0, 0))

      const highFocusTask = createMockTask({ focusNeed: 0.9 })
      const result = getRecommendedSlots(highFocusTask, mockHourlyProfile, mockWeights)

      const recommendedHours = result.map((slot) => new Date(slot.start).getHours())
      expect(recommendedHours.some((h) => h >= 9 && h <= 11)).toBe(true)
    })
  })
})
