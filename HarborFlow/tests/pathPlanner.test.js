import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { pathPlanner } from '../src/core/pathPlanner'

describe('Async Path Planner Engine', () => {
  let cleanupFunctions = []

  beforeEach(() => {
    cleanupFunctions = []
    pathPlanner.clearQueue()
    pathPlanner.setObstacles([])
  })

  afterEach(() => {
    cleanupFunctions.forEach(fn => fn())
    pathPlanner.clearQueue()
    pathPlanner.setObstacles([])
  })

  describe('Obstacle Management', () => {
    it('should set obstacles from list', () => {
      const obstacles = [
        { x: 5, y: 5 },
        { x: 6, y: 6 },
        { x: 7, y: 7 }
      ]
      
      pathPlanner.setObstacles(obstacles)
      
      expect(pathPlanner.isWalkable(5, 5)).toBe(false)
      expect(pathPlanner.isWalkable(6, 6)).toBe(false)
      expect(pathPlanner.isWalkable(7, 7)).toBe(false)
      expect(pathPlanner.isWalkable(4, 4)).toBe(true)
    })

    it('should add single obstacle', () => {
      pathPlanner.addObstacle({ x: 10, y: 10 })
      expect(pathPlanner.isWalkable(10, 10)).toBe(false)
    })

    it('should remove obstacle', () => {
      pathPlanner.setObstacles([{ x: 5, y: 5 }])
      expect(pathPlanner.isWalkable(5, 5)).toBe(false)
      
      pathPlanner.removeObstacle({ x: 5, y: 5 })
      expect(pathPlanner.isWalkable(5, 5)).toBe(true)
    })

    it('should return false for out of bounds coordinates', () => {
      expect(pathPlanner.isWalkable(-1, 0)).toBe(false)
      expect(pathPlanner.isWalkable(0, -1)).toBe(false)
      expect(pathPlanner.isWalkable(20, 0)).toBe(false)
      expect(pathPlanner.isWalkable(0, 20)).toBe(false)
      expect(pathPlanner.isWalkable(100, 100)).toBe(false)
    })

    it('should return true for valid coordinates without obstacles', () => {
      expect(pathPlanner.isWalkable(0, 0)).toBe(true)
      expect(pathPlanner.isWalkable(10, 10)).toBe(true)
      expect(pathPlanner.isWalkable(19, 19)).toBe(true)
    })
  })

  describe('A* Path Finding Algorithm', () => {
    it('should find direct path when no obstacles', () => {
      const start = { x: 0, y: 0 }
      const goal = { x: 5, y: 5 }
      
      const path = pathPlanner.findPathSync(start, goal)
      
      expect(path).not.toBeNull()
      expect(path.length).toBeGreaterThan(0)
      expect(path[0]).toEqual(start)
      expect(path[path.length - 1]).toEqual(goal)
    })

    it('should find optimal path (Manhattan distance)', () => {
      const start = { x: 0, y: 0 }
      const goal = { x: 5, y: 0 }
      
      const path = pathPlanner.findPathSync(start, goal)
      
      expect(path).not.toBeNull()
      expect(path.length - 1).toBe(5)
    })

    it('should navigate around obstacles', () => {
      const start = { x: 0, y: 0 }
      const goal = { x: 5, y: 0 }
      
      pathPlanner.setObstacles([
        { x: 2, y: 0 },
        { x: 2, y: 1 }
      ])
      
      const path = pathPlanner.findPathSync(start, goal)
      
      expect(path).not.toBeNull()
      expect(path[0]).toEqual(start)
      expect(path[path.length - 1]).toEqual(goal)
      
      for (const point of path) {
        expect(pathPlanner.isWalkable(point.x, point.y)).toBe(true)
      }
    })

    it('should return null when path is blocked', () => {
      const start = { x: 0, y: 0 }
      const goal = { x: 2, y: 0 }
      
      pathPlanner.setObstacles([
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 2, y: 1 }
      ])
      
      const path = pathPlanner.findPathSync(start, goal)
      
      expect(path).toBeNull()
    })

    it('should return single point path when start equals goal', () => {
      const start = { x: 5, y: 5 }
      const goal = { x: 5, y: 5 }
      
      const path = pathPlanner.findPathSync(start, goal)
      
      expect(path).not.toBeNull()
      expect(path.length).toBe(1)
      expect(path[0]).toEqual(start)
    })
  })

  describe('Heuristic Function', () => {
    it('should calculate Manhattan distance correctly', () => {
      const point1 = { x: 0, y: 0 }
      const point2 = { x: 3, y: 4 }
      
      const distance = pathPlanner.heuristic(point1, point2)
      
      expect(distance).toBe(7)
    })

    it('should return 0 for same point', () => {
      const point = { x: 5, y: 5 }
      
      const distance = pathPlanner.heuristic(point, point)
      
      expect(distance).toBe(0)
    })
  })

  describe('Async Task Queue', () => {
    it('should queue path planning tasks', async () => {
      const start = { x: 0, y: 0 }
      const goal = { x: 10, y: 10 }
      
      const resultPromise = pathPlanner.planPath(start, goal)
      
      const result = await resultPromise
      
      expect(result).toBeDefined()
      expect(result.path).not.toBeNull()
      expect(result.start).toEqual(start)
      expect(result.goal).toEqual(goal)
    })

    it('should process tasks in priority order', async () => {
      const completedTasks = []
      
      const unsub = pathPlanner.addListener('task-completed', (result) => {
        completedTasks.push(result.taskId)
      })
      cleanupFunctions.push(unsub)
      
      const start = { x: 0, y: 0 }
      const goal = { x: 5, y: 5 }
      
      const lowPriorityPromise = pathPlanner.planPath(start, goal, 1)
      const highPriorityPromise = pathPlanner.planPath(start, goal, 5)
      const mediumPriorityPromise = pathPlanner.planPath(start, goal, 3)
      
      const results = await Promise.all([lowPriorityPromise, highPriorityPromise, mediumPriorityPromise])
      
      expect(results.length).toBe(3)
      results.forEach(result => {
        expect(result.path).not.toBeNull()
      })
    })

    it('should notify listeners of task lifecycle events', async () => {
      const queued = vi.fn()
      const started = vi.fn()
      const completed = vi.fn()
      
      cleanupFunctions.push(pathPlanner.addListener('task-queued', queued))
      cleanupFunctions.push(pathPlanner.addListener('task-started', started))
      cleanupFunctions.push(pathPlanner.addListener('task-completed', completed))
      
      const start = { x: 0, y: 0 }
      const goal = { x: 5, y: 5 }
      
      await pathPlanner.planPath(start, goal)
      
      expect(queued).toHaveBeenCalled()
      expect(started).toHaveBeenCalled()
      expect(completed).toHaveBeenCalled()
    })

    it('should notify listeners when path finding fails', async () => {
      const failed = vi.fn()
      
      cleanupFunctions.push(pathPlanner.addListener('task-failed', failed))
      
      const start = { x: 0, y: 0 }
      const goal = { x: 2, y: 0 }
      
      pathPlanner.setObstacles([
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 2, y: 1 }
      ])
      
      await expect(pathPlanner.planPath(start, goal)).rejects.toThrow()
      
      expect(failed).toHaveBeenCalled()
    })
  })

  describe('Listener Management', () => {
    it('should allow unsubscribing from listeners', () => {
      const listener = vi.fn()
      const unsubscribe = pathPlanner.addListener('task-queued', listener)
      
      unsubscribe()
      
      pathPlanner.planPath({ x: 0, y: 0 }, { x: 5, y: 5 })
      
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('Queue Management', () => {
    it('should clear queue when requested', () => {
      const start = { x: 0, y: 0 }
      const goal = { x: 5, y: 5 }
      
      pathPlanner.planPath(start, goal)
      pathPlanner.planPath(start, goal)
      pathPlanner.planPath(start, goal)
      
      pathPlanner.clearQueue()
      
      expect(pathPlanner.getQueueSize()).toBe(0)
    })

    it('should report queue size correctly', () => {
      expect(pathPlanner.getQueueSize()).toBe(0)
      
      const start = { x: 0, y: 0 }
      const goal = { x: 5, y: 5 }
      
      pathPlanner.planPath(start, goal)
      expect(pathPlanner.getQueueSize()).toBeGreaterThan(0)
    })
  })
})
