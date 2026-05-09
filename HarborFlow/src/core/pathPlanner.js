class AsyncPathPlanner {
  constructor() {
    this.gridSize = { x: 20, y: 20 }
    this.obstacles = new Set()
    this.taskQueue = []
    this.processing = false
    this.listeners = new Map()
  }

  setObstacles(obstacleList) {
    this.obstacles = new Set(obstacleList.map(o => `${o.x},${o.y}`))
  }

  addObstacle(point) {
    this.obstacles.add(`${point.x},${point.y}`)
  }

  removeObstacle(point) {
    this.obstacles.delete(`${point.x},${point.y}`)
  }

  isWalkable(x, y) {
    if (x < 0 || x >= this.gridSize.x || y < 0 || y >= this.gridSize.y) {
      return false
    }
    return !this.obstacles.has(`${x},${y}`)
  }

  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }

  getNeighbors(point) {
    const neighbors = [
      { x: point.x + 1, y: point.y },
      { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 },
      { x: point.x, y: point.y - 1 }
    ]
    return neighbors.filter(n => this.isWalkable(n.x, n.y))
  }

  findPathSync(start, goal) {
    const openSet = [{ ...start, g: 0, h: this.heuristic(start, goal), f: 0 }]
    openSet[0].f = openSet[0].h
    const closedSet = new Set()
    const cameFrom = new Map()

    const getKey = (p) => `${p.x},${p.y}`

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f)
      const current = openSet.shift()

      if (current.x === goal.x && current.y === goal.y) {
        const path = [{ x: current.x, y: current.y }]
        let key = getKey(current)
        while (cameFrom.has(key)) {
          const prev = cameFrom.get(key)
          path.unshift({ x: prev.x, y: prev.y })
          key = getKey(prev)
        }
        return path
      }

      closedSet.add(getKey(current))

      for (const neighbor of this.getNeighbors(current)) {
        const neighborKey = getKey(neighbor)
        if (closedSet.has(neighborKey)) continue

        const tentativeG = current.g + 1
        const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y)

        if (!existing) {
          cameFrom.set(neighborKey, current)
          openSet.push({
            ...neighbor,
            g: tentativeG,
            h: this.heuristic(neighbor, goal),
            f: tentativeG + this.heuristic(neighbor, goal)
          })
        } else if (tentativeG < existing.g) {
          cameFrom.set(neighborKey, current)
          existing.g = tentativeG
          existing.f = tentativeG + existing.h
        }
      }
    }

    return null
  }

  async planPath(start, goal, priority = 1) {
    return new Promise((resolve, reject) => {
      const task = {
        id: `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        start,
        goal,
        priority,
        resolve,
        reject,
        createdAt: Date.now()
      }

      this.taskQueue.push(task)
      this.taskQueue.sort((a, b) => b.priority - a.priority)

      this.notifyListeners('task-queued', { taskId: task.id, queueSize: this.taskQueue.length })

      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  async processQueue() {
    if (this.processing) return
    this.processing = true

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()
      this.notifyListeners('task-started', { taskId: task.id, queueSize: this.taskQueue.length })

      try {
        await new Promise(resolve => setTimeout(resolve, 10))

        const path = this.findPathSync(task.start, task.goal)

        if (path) {
          const result = {
            taskId: task.id,
            path,
            distance: path.length - 1,
            start: task.start,
            goal: task.goal,
            calculatedAt: Date.now()
          }
          this.notifyListeners('task-completed', result)
          task.resolve(result)
        } else {
          const error = new Error(`No path found from (${task.start.x},${task.start.y}) to (${task.goal.x},${task.goal.y})`)
          this.notifyListeners('task-failed', { taskId: task.id, error: error.message })
          task.reject(error)
        }
      } catch (error) {
        this.notifyListeners('task-failed', { taskId: task.id, error: error.message })
        task.reject(error)
      }
    }

    this.processing = false
  }

  addListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType).add(callback)
    return () => {
      this.listeners.get(eventType).delete(callback)
    }
  }

  notifyListeners(eventType, data) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(callback => {
        try {
          callback(data)
        } catch (e) {
          console.error(`Error in path planner listener for ${eventType}:`, e)
        }
      })
    }
  }

  getQueueSize() {
    return this.taskQueue.length
  }

  clearQueue() {
    this.taskQueue = []
  }
}

export const pathPlanner = new AsyncPathPlanner()
