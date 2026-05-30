import { describe, it, expect, beforeEach } from 'vitest'
import { optimizationState, updateWeights, setAllocations } from '~/stores/optimization'
import type { OptimizationWeights, TimeSliceAllocation } from '~/types'

describe('Optimization Store', () => {
  beforeEach(() => {
    updateWeights({
      urgency: 0.3,
      importance: 0.3,
      focusNeed: 0.25,
      deadline: 0.15,
    })
    setAllocations([])
  })

  describe('initial state', () => {
    it('should have correct default weights', () => {
      expect(optimizationState.weights.urgency).toBe(0.3)
      expect(optimizationState.weights.importance).toBe(0.3)
      expect(optimizationState.weights.focusNeed).toBe(0.25)
      expect(optimizationState.weights.deadline).toBe(0.15)
    })

    it('should have empty allocations initially', () => {
      expect(optimizationState.allocations).toEqual([])
    })

    it('should have weights summing to 1.0', () => {
      const sum = Object.values(optimizationState.weights).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1.0)
    })
  })

  describe('updateWeights', () => {
    it('should update individual weight values', () => {
      updateWeights({ urgency: 0.4 })
      expect(optimizationState.weights.urgency).toBe(0.4)
      expect(optimizationState.weights.importance).toBe(0.3)
    })

    it('should update multiple weights at once', () => {
      const newWeights: Partial<OptimizationWeights> = {
        urgency: 0.35,
        focusNeed: 0.3,
      }
      updateWeights(newWeights)
      expect(optimizationState.weights.urgency).toBe(0.35)
      expect(optimizationState.weights.focusNeed).toBe(0.3)
      expect(optimizationState.weights.importance).toBe(0.3)
      expect(optimizationState.weights.deadline).toBe(0.15)
    })

    it('should update all weights', () => {
      const newWeights: OptimizationWeights = {
        urgency: 0.4,
        importance: 0.3,
        focusNeed: 0.2,
        deadline: 0.1,
      }
      updateWeights(newWeights)
      expect(optimizationState.weights).toEqual(newWeights)
    })
  })

  describe('setAllocations', () => {
    it('should set allocations correctly', () => {
      const mockAllocations: TimeSliceAllocation[] = [
        {
          taskId: 'task-1',
          slot: {
            start: Date.now(),
            end: Date.now() + 3600000,
            quality: 'peak',
          },
          score: 0.85,
          factors: {
            urgency: 0.27,
            importance: 0.27,
            focusMatch: 0.2,
            deadline: 0.11,
          },
        },
      ]

      setAllocations(mockAllocations)
      expect(optimizationState.allocations).toEqual(mockAllocations)
      expect(optimizationState.allocations.length).toBe(1)
    })

    it('should replace existing allocations', () => {
      const initialAllocations: TimeSliceAllocation[] = [
        {
          taskId: 'task-1',
          slot: { start: Date.now(), end: Date.now() + 3600000, quality: 'peak' },
          score: 0.8,
          factors: { urgency: 0.2, importance: 0.2, focusMatch: 0.2, deadline: 0.2 },
        },
      ]

      const newAllocations: TimeSliceAllocation[] = [
        {
          taskId: 'task-2',
          slot: { start: Date.now() + 3600000, end: Date.now() + 7200000, quality: 'normal' },
          score: 0.75,
          factors: { urgency: 0.15, importance: 0.25, focusMatch: 0.2, deadline: 0.15 },
        },
      ]

      setAllocations(initialAllocations)
      setAllocations(newAllocations)

      expect(optimizationState.allocations).toEqual(newAllocations)
      expect(optimizationState.allocations.length).toBe(1)
      expect(optimizationState.allocations[0].taskId).toBe('task-2')
    })

    it('should handle empty allocations', () => {
      setAllocations([
        {
          taskId: 'task-1',
          slot: { start: Date.now(), end: Date.now() + 3600000, quality: 'peak' },
          score: 0.8,
          factors: { urgency: 0.2, importance: 0.2, focusMatch: 0.2, deadline: 0.2 },
        },
      ])
      setAllocations([])
      expect(optimizationState.allocations).toEqual([])
    })
  })
})
