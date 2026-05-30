import { describe, it, expect, vi } from 'vitest'
import { generateTimingRecommendations, predictFocusCurve } from '~/engines/attention-timing'
import type { TaskItem, HourlyFocusProfile } from '~/types'

describe('AttentionTiming Engine', () => {
  const mockHourlyProfile: HourlyFocusProfile[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    avgFocus: i >= 9 && i <= 11 ? 85 : i >= 14 && i <= 16 ? 75 : i >= 20 && i <= 22 ? 60 : 45,
    sampleCount: 15,
  }))

  const mockWeights = {
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

  describe('generateTimingRecommendations', () => {
    it('should generate recommendations for pending tasks', () => {
      const tasks = [
        createMockTask({ status: 'pending', focusNeed: 0.8 }),
        createMockTask({ status: 'active', urgency: 0.9 }),
        createMockTask({ status: 'completed' }),
      ]

      const result = generateTimingRecommendations(tasks, mockHourlyProfile, mockWeights)

      expect(result.length).toBe(2)
      result.forEach((rec) => {
        expect(rec).toHaveProperty('taskId')
        expect(rec).toHaveProperty('bestHour')
        expect(rec).toHaveProperty('confidenceScore')
        expect(rec).toHaveProperty('reasoning')
        expect(rec.bestHour).toBeGreaterThanOrEqual(8)
        expect(rec.bestHour).toBeLessThan(22)
        expect(rec.confidenceScore).toBeGreaterThan(0)
        expect(rec.confidenceScore).toBeLessThanOrEqual(100)
      })
    })

    it('should recommend peak hours for high focus tasks', () => {
      const highFocusTask = createMockTask({ focusNeed: 0.9, urgency: 0.3 })

      const result = generateTimingRecommendations([highFocusTask], mockHourlyProfile, mockWeights)

      expect(result[0].bestHour).toBeGreaterThanOrEqual(9)
      expect(result[0].bestHour).toBeLessThanOrEqual(11)
      expect(result[0].reasoning).toContain('高专注需求')
    })

    it('should prioritize urgent tasks with appropriate reasoning', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 8, 0, 0))
      const urgentTask = createMockTask({ urgency: 0.95, focusNeed: 0.3 })

      const result = generateTimingRecommendations([urgentTask], mockHourlyProfile, mockWeights)

      expect(result[0].reasoning).toContain('紧急任务')
    })

    it('should handle tasks with near deadlines', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 8, 0, 0))
      const deadlineTask = createMockTask({
        deadline: Date.now() + 3600000 * 12,
        focusNeed: 0.5,
        urgency: 0.4,
      })

      const result = generateTimingRecommendations([deadlineTask], mockHourlyProfile, mockWeights)

      expect(result[0].reasoning).toContain('临近截止')
    })

    it('should return empty array for no pending tasks', () => {
      const tasks = [createMockTask({ status: 'completed' })]
      const result = generateTimingRecommendations(tasks, mockHourlyProfile, mockWeights)
      expect(result).toEqual([])
    })

    it('should generate confidence scores as integers', () => {
      const task = createMockTask()
      const result = generateTimingRecommendations([task], mockHourlyProfile, mockWeights)

      expect(Number.isInteger(result[0].confidenceScore)).toBe(true)
    })
  })

  describe('predictFocusCurve', () => {
    it('should generate predictions for all 24 hours', () => {
      const result = predictFocusCurve(mockHourlyProfile, 10)

      expect(result.length).toBe(24)
      result.forEach((entry, index) => {
        expect(entry.hour).toBe(index)
        expect(entry.predicted).toBeGreaterThanOrEqual(0)
        expect(entry.predicted).toBeLessThanOrEqual(100)
      })
    })

    it('should apply proximity boost for current and next 2 hours', () => {
      const currentHour = 10
      const result = predictFocusCurve(mockHourlyProfile, currentHour)

      const hoursWithBoost = [10, 11, 12]
      hoursWithBoost.forEach((hour) => {
        const base = mockHourlyProfile[hour]?.avgFocus ?? 50
        expect(result[hour].predicted).toBeGreaterThanOrEqual(base)
      })
    })

    it('should apply fatigue dip during 14:00-15:00', () => {
      const result = predictFocusCurve(mockHourlyProfile, 8)

      expect(result[14].predicted).toBeLessThan(mockHourlyProfile[14].avgFocus + 10)
      expect(result[15].predicted).toBeLessThan(mockHourlyProfile[15].avgFocus + 10)
    })

    it('should clamp values between 0 and 100', () => {
      const extremeProfile: HourlyFocusProfile[] = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        avgFocus: i === 10 ? 95 : i === 3 ? 5 : 50,
        sampleCount: 10,
      }))

      const result = predictFocusCurve(extremeProfile, 10)

      result.forEach((entry) => {
        expect(entry.predicted).toBeGreaterThanOrEqual(0)
        expect(entry.predicted).toBeLessThanOrEqual(100)
      })
    })

    it('should handle missing profile data gracefully', () => {
      const sparseProfile: HourlyFocusProfile[] = [
        { hour: 9, avgFocus: 80, sampleCount: 10 },
        { hour: 10, avgFocus: 85, sampleCount: 10 },
      ]

      const result = predictFocusCurve(sparseProfile, 8)

      expect(result.length).toBe(24)
      expect(result[8].predicted).toBe(50)
      expect(result[9].predicted).toBe(80)
    })
  })
})
