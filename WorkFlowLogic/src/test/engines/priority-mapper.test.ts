import { describe, it, expect } from 'vitest'
import {
  mapTaskPriority,
  computePriorityMatrix,
  computeSystemMapping,
} from '~/engines/priority-mapper'
import type { TaskItem } from '~/types'

describe('PriorityMapper Engine', () => {
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

  describe('mapTaskPriority', () => {
    it('should classify urgent and important tasks correctly', () => {
      const task = createMockTask({ urgency: 0.8, importance: 0.9 })
      expect(mapTaskPriority(task)).toBe('urgent-important')
    })

    it('should classify important but not urgent tasks correctly', () => {
      const task = createMockTask({ urgency: 0.3, importance: 0.8 })
      expect(mapTaskPriority(task)).toBe('not-urgent-important')
    })

    it('should classify urgent but not important tasks correctly', () => {
      const task = createMockTask({ urgency: 0.8, importance: 0.3 })
      expect(mapTaskPriority(task)).toBe('urgent-not-important')
    })

    it('should classify low priority tasks correctly', () => {
      const task = createMockTask({ urgency: 0.3, importance: 0.3 })
      expect(mapTaskPriority(task)).toBe('not-urgent-not-important')
    })

    it('should use threshold of 0.6 for classification', () => {
      const exactlyAtThreshold = createMockTask({ urgency: 0.6, importance: 0.6 })
      expect(mapTaskPriority(exactlyAtThreshold)).toBe('urgent-important')

      const justBelowThreshold = createMockTask({ urgency: 0.59, importance: 0.59 })
      expect(mapTaskPriority(justBelowThreshold)).toBe('not-urgent-not-important')
    })
  })

  describe('computePriorityMatrix', () => {
    it('should only include pending and active tasks', () => {
      const tasks = [
        createMockTask({ status: 'pending' }),
        createMockTask({ status: 'active' }),
        createMockTask({ status: 'completed' }),
        createMockTask({ status: 'deferred' }),
      ]

      const result = computePriorityMatrix(tasks)
      expect(result.length).toBe(2)
    })

    it('should assign unique priority ranks', () => {
      const tasks = [
        createMockTask({ urgency: 0.9, importance: 0.9 }),
        createMockTask({ urgency: 0.7, importance: 0.7 }),
        createMockTask({ urgency: 0.5, importance: 0.5 }),
      ]

      const result = computePriorityMatrix(tasks)
      const ranks = result.map((r) => r.priorityRank)
      const uniqueRanks = new Set(ranks)

      expect(ranks.length).toBe(uniqueRanks.size)
      expect(ranks).toEqual([1, 2, 3])
    })

    it('should sort by composite score descending', () => {
      const lowPriority = createMockTask({ urgency: 0.2, importance: 0.2 })
      const mediumPriority = createMockTask({ urgency: 0.5, importance: 0.5 })
      const highPriority = createMockTask({ urgency: 0.8, importance: 0.8 })

      const result = computePriorityMatrix([lowPriority, highPriority, mediumPriority])

      expect(result[0].priorityRank).toBe(1)
      expect(result[0].taskId).toBe(highPriority.id)
      expect(result[2].priorityRank).toBe(3)
      expect(result[2].taskId).toBe(lowPriority.id)
    })

    it('should return all required properties', () => {
      const tasks = [createMockTask()]
      const result = computePriorityMatrix(tasks)

      expect(result[0]).toHaveProperty('taskId')
      expect(result[0]).toHaveProperty('quadrant')
      expect(result[0]).toHaveProperty('quadrantIndex')
      expect(result[0]).toHaveProperty('priorityRank')
    })

    it('should return empty array for no pending tasks', () => {
      const tasks = [createMockTask({ status: 'completed' })]
      const result = computePriorityMatrix(tasks)
      expect(result).toEqual([])
    })
  })

  describe('computeSystemMapping', () => {
    it('should separate work and personal tasks correctly', () => {
      const workTask = createMockTask({ source: 'work' })
      const personalTask = createMockTask({ source: 'personal' })
      const completedTask = createMockTask({ source: 'work', status: 'completed' })

      const result = computeSystemMapping([workTask, personalTask, completedTask])

      expect(result.workTasks.length).toBe(1)
      expect(result.workTasks[0].id).toBe(workTask.id)
      expect(result.personalTasks.length).toBe(1)
      expect(result.personalTasks[0].id).toBe(personalTask.id)
    })

    it('should find cross-references for similar tasks', () => {
      const workTask = createMockTask({ source: 'work', focusNeed: 0.7, importance: 0.8 })
      const personalTask = createMockTask({ source: 'personal', focusNeed: 0.75, importance: 0.78 })
      const unrelatedTask = createMockTask({ source: 'personal', focusNeed: 0.2, importance: 0.3 })

      const result = computeSystemMapping([workTask, personalTask, unrelatedTask])

      expect(result.crossReferences.length).toBe(1)
      expect(result.crossReferences[0].workId).toBe(workTask.id)
      expect(result.crossReferences[0].personalId).toBe(personalTask.id)
      expect(result.crossReferences[0].relationType).toBe('focus-aligned')
    })

    it('should not create cross-references for dissimilar tasks', () => {
      const workTask = createMockTask({ source: 'work', focusNeed: 0.9, importance: 0.9 })
      const personalTask = createMockTask({ source: 'personal', focusNeed: 0.2, importance: 0.2 })

      const result = computeSystemMapping([workTask, personalTask])

      expect(result.crossReferences.length).toBe(0)
    })

    it('should handle empty task list', () => {
      const result = computeSystemMapping([])
      expect(result.workTasks).toEqual([])
      expect(result.personalTasks).toEqual([])
      expect(result.crossReferences).toEqual([])
    })

    it('should use focusNeed and importance for similarity check', () => {
      const workTask = createMockTask({ source: 'work', focusNeed: 0.7, importance: 0.7 })
      const similarTask = createMockTask({ source: 'personal', focusNeed: 0.85, importance: 0.85 })
      const differentFocus = createMockTask({ source: 'personal', focusNeed: 0.4, importance: 0.7 })
      const differentImportance = createMockTask({ source: 'personal', focusNeed: 0.7, importance: 0.4 })

      const result = computeSystemMapping([workTask, similarTask, differentFocus, differentImportance])

      expect(result.crossReferences.length).toBe(1)
      expect(result.crossReferences[0].personalId).toBe(similarTask.id)
    })
  })
})
