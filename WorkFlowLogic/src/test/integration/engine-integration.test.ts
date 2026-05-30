import { describe, it, expect, vi, beforeEach } from 'vitest'
import { allocateTimeSlices } from '~/engines/time-slice'
import { computePriorityMatrix, computeSystemMapping } from '~/engines/priority-mapper'
import { generateTimingRecommendations } from '~/engines/attention-timing'
import { taskState, addTask } from '~/stores/tasks'
import { optimizationState } from '~/stores/optimization'
import type { TaskItem, HourlyFocusProfile } from '~/types'

describe('Engine Integration Tests', () => {
  const mockHourlyProfile: HourlyFocusProfile[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    avgFocus: i >= 9 && i <= 11 ? 85 : i >= 14 && i <= 16 ? 70 : 50,
    sampleCount: 10,
  }))

  beforeEach(() => {
    while (taskState.tasks.length > 0) {
      taskState.tasks.pop()
    }

    vi.setSystemTime(new Date(2024, 0, 1, 8, 0, 0))
  })

  describe('Task Priority + Time Allocation Integration', () => {
    it('should prioritize urgent-important tasks in time allocation', () => {
      addTask({
        title: 'Urgent Important Task',
        urgency: 0.95,
        importance: 0.9,
        focusNeed: 0.8,
        deadline: Date.now() + 3600000,
        estimatedMinutes: 60,
        source: 'work',
        status: 'pending',
      })

      addTask({
        title: 'Low Priority Task',
        urgency: 0.2,
        importance: 0.3,
        focusNeed: 0.4,
        deadline: null,
        estimatedMinutes: 60,
        source: 'personal',
        status: 'pending',
      })

      const priorityMatrix = computePriorityMatrix(taskState.tasks)
      const allocations = allocateTimeSlices(taskState.tasks, mockHourlyProfile, optimizationState.weights, 8, 12)

      expect(priorityMatrix[0].quadrant).toBe('urgent-important')
      expect(allocations[0].taskId).toBe(priorityMatrix[0].taskId)
      expect(allocations[0].score).toBeGreaterThan(allocations[allocations.length - 1].score)
    })

    it('should align high focus tasks with peak hours', () => {
      addTask({
        title: 'Deep Work Task',
        urgency: 0.5,
        importance: 0.8,
        focusNeed: 0.9,
        deadline: null,
        estimatedMinutes: 120,
        source: 'work',
        status: 'pending',
      })

      addTask({
        title: 'Routine Task',
        urgency: 0.6,
        importance: 0.4,
        focusNeed: 0.2,
        deadline: null,
        estimatedMinutes: 60,
        source: 'work',
        status: 'pending',
      })

      const allocations = allocateTimeSlices(taskState.tasks, mockHourlyProfile, optimizationState.weights, 8, 14)

      const deepWorkAllocations = allocations.filter((a) => {
        const task = taskState.tasks.find((t) => t.id === a.taskId)
        return task?.title === 'Deep Work Task'
      })

      const routineAllocations = allocations.filter((a) => {
        const task = taskState.tasks.find((t) => t.id === a.taskId)
        return task?.title === 'Routine Task'
      })

      if (deepWorkAllocations.length > 0) {
        const allocatedHours = deepWorkAllocations.map((a) => new Date(a.slot.start).getHours())
        expect(allocatedHours.some((h) => h >= 9 && h <= 11)).toBe(true)
      }

      if (routineAllocations.length > 0) {
        const routineScores = routineAllocations.map((a) => a.score)
        const deepWorkScores = deepWorkAllocations.map((a) => a.score)
        expect(Math.max(...deepWorkScores)).toBeGreaterThan(Math.max(...routineScores))
      }
    })

    it('should handle deadline proximity correctly', () => {
      addTask({
        title: 'Immediate Deadline',
        urgency: 0.5,
        importance: 0.5,
        focusNeed: 0.5,
        deadline: Date.now() + 3600000,
        estimatedMinutes: 60,
        source: 'work',
        status: 'pending',
      })

      addTask({
        title: 'Distant Deadline',
        urgency: 0.5,
        importance: 0.5,
        focusNeed: 0.5,
        deadline: Date.now() + 604800000,
        estimatedMinutes: 60,
        source: 'work',
        status: 'pending',
      })

      const allocations = allocateTimeSlices(taskState.tasks, mockHourlyProfile, optimizationState.weights, 8, 12)

      const immediateAlloc = allocations.find((a) => {
        const task = taskState.tasks.find((t) => t.id === a.taskId)
        return task?.title === 'Immediate Deadline'
      })

      const distantAlloc = allocations.find((a) => {
        const task = taskState.tasks.find((t) => t.id === a.taskId)
        return task?.title === 'Distant Deadline'
      })

      expect(immediateAlloc?.factors.deadline).toBeGreaterThan(distantAlloc?.factors.deadline ?? 0)
      expect(immediateAlloc?.score).toBeGreaterThan(distantAlloc?.score ?? 0)
    })
  })

  describe('Priority Matrix + System Mapping Integration', () => {
    it('should classify tasks across work/personal boundary', () => {
      addTask({
        title: 'Work Project Deadline',
        urgency: 0.9,
        importance: 0.9,
        focusNeed: 0.8,
        deadline: Date.now() + 86400000,
        estimatedMinutes: 120,
        source: 'work',
        status: 'pending',
      })

      addTask({
        title: 'Personal Goal Review',
        urgency: 0.4,
        importance: 0.8,
        focusNeed: 0.7,
        deadline: null,
        estimatedMinutes: 60,
        source: 'personal',
        status: 'pending',
      })

      const priorityMatrix = computePriorityMatrix(taskState.tasks)
      const systemMapping = computeSystemMapping(taskState.tasks)

      expect(systemMapping.workTasks.length).toBe(1)
      expect(systemMapping.personalTasks.length).toBe(1)
      expect(priorityMatrix.length).toBe(2)

      const workTaskInMatrix = priorityMatrix.find((p) => {
        const task = taskState.tasks.find((t) => t.id === p.taskId)
        return task?.source === 'work'
      })

      const personalTaskInMatrix = priorityMatrix.find((p) => {
        const task = taskState.tasks.find((t) => t.id === p.taskId)
        return task?.source === 'personal'
      })

      expect(workTaskInMatrix?.quadrant).toBe('urgent-important')
      expect(personalTaskInMatrix?.quadrant).toBe('not-urgent-important')
    })

    it('should identify cross-references between similar tasks', () => {
      addTask({
        title: 'Work Documentation',
        urgency: 0.5,
        importance: 0.7,
        focusNeed: 0.75,
        deadline: null,
        estimatedMinutes: 90,
        source: 'work',
        status: 'pending',
      })

      addTask({
        title: 'Personal Blog Writing',
        urgency: 0.3,
        importance: 0.75,
        focusNeed: 0.8,
        deadline: null,
        estimatedMinutes: 90,
        source: 'personal',
        status: 'pending',
      })

      const systemMapping = computeSystemMapping(taskState.tasks)

      expect(systemMapping.crossReferences.length).toBe(1)
      expect(systemMapping.crossReferences[0].relationType).toBe('focus-aligned')
    })
  })

  describe('Timing Recommendations + Profile Integration', () => {
    it('should generate consistent recommendations with time allocation', () => {
      addTask({
        title: 'Complex Analysis',
        urgency: 0.7,
        importance: 0.8,
        focusNeed: 0.9,
        deadline: null,
        estimatedMinutes: 120,
        source: 'work',
        status: 'pending',
      })

      const recommendations = generateTimingRecommendations(taskState.tasks, mockHourlyProfile, optimizationState.weights)
      const allocations = allocateTimeSlices(taskState.tasks, mockHourlyProfile, optimizationState.weights, 8, 22)

      const task = taskState.tasks[0]
      const taskRecommendation = recommendations.find((r) => r.taskId === task.id)
      const taskAllocations = allocations.filter((a) => a.taskId === task.id)

      if (taskRecommendation && taskAllocations.length > 0) {
        const allocatedHours = taskAllocations.map((a) => new Date(a.slot.start).getHours())
        expect(allocatedHours.includes(taskRecommendation.bestHour)).toBe(true)
      }
    })

    it('should provide reasoning based on task characteristics', () => {
      addTask({
        title: 'High Focus Research',
        urgency: 0.4,
        importance: 0.7,
        focusNeed: 0.95,
        deadline: null,
        estimatedMinutes: 180,
        source: 'work',
        status: 'pending',
      })

      addTask({
        title: 'Urgent Bug Fix',
        urgency: 0.95,
        importance: 0.8,
        focusNeed: 0.5,
        deadline: Date.now() + 7200000,
        estimatedMinutes: 60,
        source: 'work',
        status: 'pending',
      })

      const recommendations = generateTimingRecommendations(taskState.tasks, mockHourlyProfile, optimizationState.weights)

      const highFocusRec = recommendations.find((r) => {
        const task = taskState.tasks.find((t) => t.id === r.taskId)
        return task?.title === 'High Focus Research'
      })

      const urgentRec = recommendations.find((r) => {
        const task = taskState.tasks.find((t) => t.id === r.taskId)
        return task?.title === 'Urgent Bug Fix'
      })

      expect(highFocusRec?.reasoning).toContain('高专注需求')
      expect(urgentRec?.reasoning).toContain('紧急')
    })
  })

  describe('Multi-task Workflow Simulation', () => {
    it('should handle complex task scheduling scenario', () => {
      const tasks = [
        { title: 'Critical Production Issue', urgency: 0.95, importance: 0.95, focusNeed: 0.7, deadline: Date.now() + 3600000, estimatedMinutes: 60, source: 'work' as const },
        { title: 'Quarterly Planning', urgency: 0.6, importance: 0.9, focusNeed: 0.85, deadline: Date.now() + 86400000, estimatedMinutes: 120, source: 'work' as const },
        { title: 'Email Processing', urgency: 0.8, importance: 0.4, focusNeed: 0.2, deadline: null, estimatedMinutes: 30, source: 'work' as const },
        { title: 'Skill Development', urgency: 0.3, importance: 0.7, focusNeed: 0.9, deadline: null, estimatedMinutes: 90, source: 'personal' as const },
        { title: 'Exercise Routine', urgency: 0.5, importance: 0.6, focusNeed: 0.2, deadline: Date.now() + 7200000, estimatedMinutes: 60, source: 'personal' as const },
      ]

      tasks.forEach((t) => addTask({ ...t, status: 'pending' }))

      const priorityMatrix = computePriorityMatrix(taskState.tasks)
      const allocations = allocateTimeSlices(taskState.tasks, mockHourlyProfile, optimizationState.weights, 8, 22)
      const systemMapping = computeSystemMapping(taskState.tasks)
      const recommendations = generateTimingRecommendations(taskState.tasks, mockHourlyProfile, optimizationState.weights)

      expect(priorityMatrix.length).toBe(5)
      expect(allocations.length).toBeGreaterThan(0)
      expect(systemMapping.workTasks.length).toBe(3)
      expect(systemMapping.personalTasks.length).toBe(2)
      expect(recommendations.length).toBe(5)

      expect(priorityMatrix[0].quadrant).toBe('urgent-important')
      expect(allocations[0].score).toBeGreaterThan(0.5)

      const urgentTask = priorityMatrix.find((p) => {
        const task = taskState.tasks.find((t) => t.id === p.taskId)
        return task?.title === 'Critical Production Issue'
      })
      expect(urgentTask?.priorityRank).toBe(1)
    })
  })
})
