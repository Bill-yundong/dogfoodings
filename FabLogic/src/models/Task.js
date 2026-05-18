import { TaskStatus } from '../types/amhs.js'

export class Task {
  constructor(data = {}) {
    this.id = data.id || `TSK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    this.type = data.type || 'transport'
    this.waferId = data.waferId || null
    this.ohtId = data.ohtId || null
    this.sourceNode = data.sourceNode || null
    this.targetNode = data.targetNode || null
    this.status = data.status || TaskStatus.PENDING
    this.priority = data.priority || 1
    this.estimatedDuration = data.estimatedDuration || 0
    this.actualDuration = data.actualDuration || 0
    this.createdAt = data.createdAt || Date.now()
    this.startedAt = data.startedAt || null
    this.completedAt = data.completedAt || null
    this.path = data.path || []
    this.conflicts = data.conflicts || []
    this.retryCount = data.retryCount || 0
    this.notes = data.notes || ''
  }

  assign(ohtId, path) {
    this.ohtId = ohtId
    this.path = path
    this.status = TaskStatus.ASSIGNED
    this.startedAt = Date.now()
  }

  start() {
    this.status = TaskStatus.IN_PROGRESS
  }

  complete() {
    this.status = TaskStatus.COMPLETED
    this.completedAt = Date.now()
    this.actualDuration = this.completedAt - this.startedAt
  }

  fail(reason) {
    this.status = TaskStatus.FAILED
    this.completedAt = Date.now()
    this.notes = reason
    this.retryCount++
  }

  cancel() {
    this.status = TaskStatus.CANCELLED
    this.completedAt = Date.now()
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      waferId: this.waferId,
      ohtId: this.ohtId,
      sourceNode: this.sourceNode,
      targetNode: this.targetNode,
      status: this.status,
      priority: this.priority,
      estimatedDuration: this.estimatedDuration,
      actualDuration: this.actualDuration,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      path: [...this.path],
      conflicts: [...this.conflicts],
      retryCount: this.retryCount,
      notes: this.notes
    }
  }
}
