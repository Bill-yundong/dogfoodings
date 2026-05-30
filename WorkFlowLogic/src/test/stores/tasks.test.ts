import { describe, it, expect, beforeEach } from 'vitest'
import { taskState, addTask, updateTask, completeTask, setTaskRecommendation, getPendingTasks, getWorkTasks, getPersonalTasks } from '~/stores/tasks'
import type { TaskItem } from '~/types'

describe('Tasks Store', () => {
  const createTaskInput = (overrides: Partial<Omit<TaskItem, 'id' | 'createdAt' | 'completedAt' | 'recommendedSlot'>> = {}) => ({
    title: 'New Task',
    urgency: 0.5,
    importance: 0.5,
    focusNeed: 0.5,
    deadline: null,
    estimatedMinutes: 60,
    source: 'work' as const,
    status: 'pending' as const,
    ...overrides,
  })

  beforeEach(() => {
    while (taskState.tasks.length > 0) {
      taskState.tasks.pop()
    }
  })

  describe('addTask', () => {
    it('should add a new task to the store', () => {
      const initialCount = taskState.tasks.length
      addTask(createTaskInput({ title: 'Test Add Task' }))

      expect(taskState.tasks.length).toBe(initialCount + 1)
      const addedTask = taskState.tasks[taskState.tasks.length - 1]
      expect(addedTask.title).toBe('Test Add Task')
      expect(addedTask.id).toBeDefined()
      expect(addedTask.createdAt).toBeDefined()
      expect(addedTask.completedAt).toBeNull()
      expect(addedTask.recommendedSlot).toBeNull()
    })

    it('should generate unique IDs for tasks', () => {
      addTask(createTaskInput({ title: 'Task 1' }))
      addTask(createTaskInput({ title: 'Task 2' }))

      expect(taskState.tasks[0].id).not.toBe(taskState.tasks[1].id)
    })

    it('should set createdAt timestamp', () => {
      const beforeAdd = Date.now()
      addTask(createTaskInput())
      const afterAdd = Date.now()
      const addedTask = taskState.tasks[taskState.tasks.length - 1]

      expect(addedTask.createdAt).toBeGreaterThanOrEqual(beforeAdd)
      expect(addedTask.createdAt).toBeLessThanOrEqual(afterAdd)
    })
  })

  describe('updateTask', () => {
    it('should update task properties', () => {
      addTask(createTaskInput({ title: 'Original Title' }))
      const task = taskState.tasks[0]

      updateTask(task.id, { title: 'Updated Title', urgency: 0.9 })

      const updatedTask = taskState.tasks.find((t) => t.id === task.id)
      expect(updatedTask?.title).toBe('Updated Title')
      expect(updatedTask?.urgency).toBe(0.9)
    })

    it('should not affect other tasks', () => {
      addTask(createTaskInput({ title: 'Task 1' }))
      addTask(createTaskInput({ title: 'Task 2' }))
      const task1 = taskState.tasks[0]

      updateTask(task1.id, { title: 'Updated Task 1' })

      expect(taskState.tasks[0].title).toBe('Updated Task 1')
      expect(taskState.tasks[1].title).toBe('Task 2')
    })
  })

  describe('completeTask', () => {
    it('should mark task as completed and set completedAt', () => {
      addTask(createTaskInput({ status: 'pending' }))
      const task = taskState.tasks[0]
      const beforeComplete = Date.now()

      completeTask(task.id)

      const completedTask = taskState.tasks.find((t) => t.id === task.id)
      expect(completedTask?.status).toBe('completed')
      expect(completedTask?.completedAt).toBeGreaterThanOrEqual(beforeComplete)
    })
  })

  describe('setTaskRecommendation', () => {
    it('should set recommended slot for a task', () => {
      addTask(createTaskInput())
      const task = taskState.tasks[0]
      const slot = {
        start: Date.now(),
        end: Date.now() + 3600000,
        quality: 'peak' as const,
      }

      setTaskRecommendation(task.id, slot)

      const updatedTask = taskState.tasks.find((t) => t.id === task.id)
      expect(updatedTask?.recommendedSlot).toEqual(slot)
    })

    it('should clear recommended slot when null is passed', () => {
      addTask(createTaskInput())
      const task = taskState.tasks[0]
      const slot = { start: Date.now(), end: Date.now() + 3600000, quality: 'normal' as const }

      setTaskRecommendation(task.id, slot)
      setTaskRecommendation(task.id, null)

      const updatedTask = taskState.tasks.find((t) => t.id === task.id)
      expect(updatedTask?.recommendedSlot).toBeNull()
    })
  })

  describe('getPendingTasks', () => {
    it('should return only pending and active tasks', () => {
      addTask(createTaskInput({ status: 'pending' }))
      addTask(createTaskInput({ status: 'active' }))
      addTask(createTaskInput({ status: 'completed' }))
      addTask(createTaskInput({ status: 'deferred' }))

      const pending = getPendingTasks()
      expect(pending.length).toBe(2)
      expect(pending.every((t) => t.status === 'pending' || t.status === 'active')).toBe(true)
    })
  })

  describe('getWorkTasks', () => {
    it('should return only work tasks', () => {
      addTask(createTaskInput({ source: 'work' }))
      addTask(createTaskInput({ source: 'personal' }))

      const workTasks = getWorkTasks()
      expect(workTasks.every((t) => t.source === 'work')).toBe(true)
    })
  })

  describe('getPersonalTasks', () => {
    it('should return only personal tasks', () => {
      addTask(createTaskInput({ source: 'work' }))
      addTask(createTaskInput({ source: 'personal' }))

      const personalTasks = getPersonalTasks()
      expect(personalTasks.every((t) => t.source === 'personal')).toBe(true)
    })
  })
})
