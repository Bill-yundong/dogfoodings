export class FaultTreeNode {
  constructor(data = {}) {
    this.id = data.id || this.generateId()
    this.name = data.name || 'Unknown'
    this.type = data.type || 'basic'
    this.probability = data.probability || 0.01
    this.status = data.status || 'normal'
    this.dependencies = data.dependencies || []
    this.consequences = data.consequences || []
    this.metadata = data.metadata || {}
    this.evolutionTime = data.evolutionTime || 0
    this.triggeredAt = data.triggeredAt || null
  }

  generateId() {
    return `FTN-${Math.random().toString(36).substr(2, 9)}`
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      probability: this.probability,
      status: this.status,
      dependencies: this.dependencies,
      consequences: this.consequences,
      metadata: this.metadata,
      evolutionTime: this.evolutionTime,
      triggeredAt: this.triggeredAt
    }
  }

  isTriggered() {
    return this.status === 'triggered'
  }

  isAndGate() {
    return this.type === 'and'
  }

  isOrGate() {
    return this.type === 'or'
  }

  isBasicEvent() {
    return this.type === 'basic'
  }
}

export const NodeType = {
  BASIC: 'basic',
  AND: 'and',
  OR: 'or',
  INTERMEDIATE: 'intermediate',
  TOP: 'top'
}

export const NodeStatus = {
  NORMAL: 'normal',
  WARNING: 'warning',
  TRIGGERED: 'triggered',
  EVOLVING: 'evolving',
  CASCADING: 'cascading'
}
