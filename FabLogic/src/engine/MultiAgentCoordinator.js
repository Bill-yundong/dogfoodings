import { OHTStatus, TaskStatus } from '../types/amhs.js'

export class MultiAgentCoordinator {
  constructor(pathOptimizer, options = {}) {
    this.pathOptimizer = pathOptimizer
    this.ohts = new Map()
    this.tasks = new Map()
    this.pendingTasks = []
    this.eventCallbacks = new Map()
    this.conflictResolutionStrategy = options.conflictResolution || 'priority'
    this.maxConcurrentTasks = options.maxConcurrentTasks || 20
    this.isRunning = false
  }

  registerOHT(oht) {
    this.ohts.set(oht.id, oht)
  }

  unregisterOHT(ohtId) {
    this.ohts.delete(ohtId)
  }

  submitTask(task) {
    this.tasks.set(task.id, task)
    this.pendingTasks.push(task.id)
    this._emit('task:submitted', task)
    this._schedule()
  }

  async _schedule() {
    if (!this.isRunning) return

    const availableOHTs = Array.from(this.ohts.values()).filter(
      o => o.status === OHTStatus.IDLE
    )

    const sortedTasks = this.pendingTasks
      .map(id => this.tasks.get(id))
      .filter(t => t.status === TaskStatus.PENDING)
      .sort((a, b) => b.priority - a.priority)

    for (const task of sortedTasks) {
      if (availableOHTs.length === 0) break

      const assignedOHT = await this._assignTaskToOHT(task, availableOHTs)
      if (assignedOHT) {
        const idx = this.pendingTasks.indexOf(task.id)
        if (idx > -1) this.pendingTasks.splice(idx, 1)
        const ohtIdx = availableOHTs.findIndex(o => o.id === assignedOHT.id)
        if (ohtIdx > -1) availableOHTs.splice(ohtIdx, 1)
      }
    }
  }

  async _assignTaskToOHT(task, availableOHTs) {
    let bestOHT = null
    let bestPath = null
    let bestCost = Infinity

    for (const oht of availableOHTs) {
      try {
        const pathToSource = await this.pathOptimizer.findPath(
          oht.currentNode,
          task.sourceNode,
          { ohtId: oht.id }
        )

        const transportPath = await this.pathOptimizer.findPath(
          task.sourceNode,
          task.targetNode,
          { ohtId: oht.id }
        )

        const totalCost = pathToSource.distance + transportPath.distance

        if (totalCost < bestCost) {
          bestCost = totalCost
          bestOHT = oht
          bestPath = {
            approach: pathToSource,
            transport: transportPath
          }
        }
      } catch (e) {
        continue
      }
    }

    if (bestOHT && bestPath) {
      const fullPath = [...bestPath.approach.path, ...bestPath.transport.path.slice(1)]

      bestOHT.assignTask(task.id, fullPath, task.targetNode)
      task.assign(bestOHT.id, fullPath)
      task.estimatedDuration = bestPath.approach.estimatedTime + bestPath.transport.estimatedTime

      this.pathOptimizer.reservePath(
        [...bestPath.approach.edges, ...bestPath.transport.edges],
        Date.now(),
        bestOHT.id
      )

      this._emit('task:assigned', { task, oht: bestOHT, path: fullPath })

      return bestOHT
    }

    return null
  }

  updateOHTPosition(ohtId, position) {
    const oht = this.ohts.get(ohtId)
    if (oht) {
      oht.updatePosition(position.x, position.y, position.z)
      this._emit('oht:updated', oht)
    }
  }

  completeTask(taskId) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.complete()
      const oht = this.ohts.get(task.ohtId)
      if (oht) {
        oht.completeTask()
        this.pathOptimizer.releaseReservations(oht.id)
      }
      this._emit('task:completed', task)
      this._schedule()
    }
  }

  failTask(taskId, reason) {
    const task = this.tasks.get(taskId)
    if (task) {
      task.fail(reason)
      const oht = this.ohts.get(task.ohtId)
      if (oht) {
        this.pathOptimizer.releaseReservations(oht.id)
        oht.completeTask()
      }
      this._emit('task:failed', { task, reason })

      if (task.retryCount < 3) {
        task.status = TaskStatus.PENDING
        this.pendingTasks.push(taskId)
      }
      this._schedule()
    }
  }

  detectConflicts() {
    const conflicts = []
    const activeOHTs = Array.from(this.ohts.values()).filter(
      o => o.status === OHTStatus.MOVING
    )

    for (let i = 0; i < activeOHTs.length; i++) {
      for (let j = i + 1; j < activeOHTs.length; j++) {
        const conflict = this._checkOHTConflict(activeOHTs[i], activeOHTs[j])
        if (conflict) {
          conflicts.push(conflict)
        }
      }
    }

    return conflicts
  }

  _checkOHTConflict(oht1, oht2) {
    const path1 = oht1.currentPath.slice(oht1.pathIndex)
    const path2 = oht2.currentPath.slice(oht2.pathIndex)

    for (let i = 0; i < path1.length && i < 5; i++) {
      for (let j = 0; j < path2.length && j < 5; j++) {
        if (path1[i] === path2[j] && Math.abs(i - j) < 3) {
          return {
            type: 'node_conflict',
            node: path1[i],
            ohts: [oht1.id, oht2.id],
            severity: Math.abs(i - j) < 2 ? 'high' : 'medium'
          }
        }
      }
    }

    return null
  }

  resolveConflict(conflict) {
    if (this.conflictResolutionStrategy === 'priority') {
      const tasks = conflict.ohts.map(id => {
        const oht = this.ohts.get(id)
        return this.tasks.get(oht.currentTaskId)
      }).filter(Boolean)

      if (tasks.length === 2) {
        const lowerPriorityTask = tasks.sort((a, b) => a.priority - b.priority)[0]
        const oht = this.ohts.get(lowerPriorityTask.ohtId)
        this._emit('conflict:resolved', { conflict, delayedTask: lowerPriorityTask.id })
        return { action: 'delay', ohtId: lowerPriorityTask.ohtId }
      }
    }

    return { action: 'none' }
  }

  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, [])
    }
    this.eventCallbacks.get(event).push(callback)
  }

  off(event, callback) {
    const callbacks = this.eventCallbacks.get(event)
    if (callbacks) {
      const idx = callbacks.indexOf(callback)
      if (idx > -1) callbacks.splice(idx, 1)
    }
  }

  _emit(event, data) {
    const callbacks = this.eventCallbacks.get(event)
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data)
        } catch (e) {
          console.error(`Error in event callback for ${event}:`, e)
        }
      })
    }
  }

  start() {
    this.isRunning = true
    this._schedule()
  }

  stop() {
    this.isRunning = false
  }

  getStats() {
    const stats = {
      totalOHTs: this.ohts.size,
      activeOHTs: Array.from(this.ohts.values()).filter(o => o.status === OHTStatus.MOVING).length,
      idleOHTs: Array.from(this.ohts.values()).filter(o => o.status === OHTStatus.IDLE).length,
      errorOHTs: Array.from(this.ohts.values()).filter(o => o.status === OHTStatus.ERROR).length,
      totalTasks: this.tasks.size,
      pendingTasks: this.pendingTasks.length,
      completedTasks: Array.from(this.tasks.values()).filter(t => t.status === TaskStatus.COMPLETED).length,
      failedTasks: Array.from(this.tasks.values()).filter(t => t.status === TaskStatus.FAILED).length
    }
    return stats
  }
}
