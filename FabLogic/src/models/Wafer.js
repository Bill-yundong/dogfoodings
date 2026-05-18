import { WaferStatus } from '../types/amhs.js'

export class Wafer {
  constructor(data = {}) {
    this.id = data.id || `WFR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    this.lotId = data.lotId || null
    this.productType = data.productType || 'unknown'
    this.status = data.status || WaferStatus.WAITING
    this.currentLocation = data.currentLocation || null
    this.targetLocation = data.targetLocation || null
    this.processStep = data.processStep || 0
    this.totalSteps = data.totalSteps || 1
    this.priority = data.priority || 1
    this.createdAt = data.createdAt || Date.now()
    this.updatedAt = data.updatedAt || Date.now()
    this.history = data.history || []
  }

  updateStatus(status, location = null) {
    this.status = status
    if (location) {
      this.currentLocation = location
    }
    this.updatedAt = Date.now()
    this.history.push({
      status,
      location,
      timestamp: this.updatedAt
    })
  }

  toJSON() {
    return {
      id: this.id,
      lotId: this.lotId,
      productType: this.productType,
      status: this.status,
      currentLocation: this.currentLocation,
      targetLocation: this.targetLocation,
      processStep: this.processStep,
      totalSteps: this.totalSteps,
      priority: this.priority,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      history: this.history
    }
  }
}
