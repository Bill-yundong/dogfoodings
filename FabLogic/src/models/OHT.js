import { OHTStatus } from '../types/amhs.js'

export class OHT {
  constructor(data = {}) {
    this.id = data.id || `OHT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    this.name = data.name || this.id
    this.status = data.status || OHTStatus.IDLE
    this.position = data.position || { x: 0, y: 0, z: 0 }
    this.currentNode = data.currentNode || null
    this.targetNode = data.targetNode || null
    this.currentPath = data.currentPath || []
    this.pathIndex = data.pathIndex || 0
    this.speed = data.speed || 2.0
    this.maxSpeed = data.maxSpeed || 5.0
    this.payload = data.payload || null
    this.batteryLevel = data.batteryLevel || 100
    this.lastMaintenance = data.lastMaintenance || Date.now()
    this.currentTaskId = data.currentTaskId || null
    this.errorCode = data.errorCode || null
    this.updatedAt = data.updatedAt || Date.now()
    this.version = data.version || 1
  }

  updatePosition(x, y, z = 0) {
    this.position = { x, y, z }
    this.updatedAt = Date.now()
    this.version++
  }

  assignTask(taskId, path, targetNode) {
    this.currentTaskId = taskId
    this.currentPath = path
    this.pathIndex = 0
    this.targetNode = targetNode
    this.status = OHTStatus.MOVING
    this.updatedAt = Date.now()
    this.version++
  }

  completeTask() {
    this.currentTaskId = null
    this.currentPath = []
    this.pathIndex = 0
    this.targetNode = null
    this.payload = null
    this.status = OHTStatus.IDLE
    this.updatedAt = Date.now()
    this.version++
  }

  loadPayload(waferId) {
    this.payload = waferId
    this.status = OHTStatus.LOADING
    this.updatedAt = Date.now()
    this.version++
  }

  unloadPayload() {
    const waferId = this.payload
    this.payload = null
    this.status = OHTStatus.UNLOADING
    this.updatedAt = Date.now()
    this.version++
    return waferId
  }

  setError(code) {
    this.status = OHTStatus.ERROR
    this.errorCode = code
    this.updatedAt = Date.now()
    this.version++
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      position: { ...this.position },
      currentNode: this.currentNode,
      targetNode: this.targetNode,
      currentPath: [...this.currentPath],
      pathIndex: this.pathIndex,
      speed: this.speed,
      maxSpeed: this.maxSpeed,
      payload: this.payload,
      batteryLevel: this.batteryLevel,
      lastMaintenance: this.lastMaintenance,
      currentTaskId: this.currentTaskId,
      errorCode: this.errorCode,
      updatedAt: this.updatedAt,
      version: this.version
    }
  }
}
