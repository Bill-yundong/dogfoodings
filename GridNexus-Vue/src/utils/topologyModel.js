export class PowerNode {
  constructor(id, type, name, capacity = 0) {
    this.id = id
    this.type = type
    this.name = name
    this.capacity = capacity
    this.currentLoad = 0
    this.status = 'normal'
    this.metadata = {}
    this.children = []
    this.parent = null
  }

  getLoadRatio() {
    if (this.capacity <= 0) return 0
    return this.currentLoad / this.capacity
  }

  isOverloaded() {
    return this.getLoadRatio() > 0.9
  }

  getAvailableCapacity() {
    return Math.max(0, this.capacity - this.currentLoad)
  }
}

export class PowerConnection {
  constructor(id, fromNodeId, toNodeId, capacity = 0, impedance = 0) {
    this.id = id
    this.from = fromNodeId
    this.to = toNodeId
    this.capacity = capacity
    this.impedance = impedance
    this.currentFlow = 0
    this.status = 'active'
  }

  getFlowRatio() {
    if (this.capacity <= 0) return 0
    return Math.abs(this.currentFlow) / this.capacity
  }
}

class AsyncTopologyModel {
  constructor() {
    this.nodes = new Map()
    this.connections = new Map()
    this.rootNode = null
    this.listeners = new Map()
    this.processingQueue = []
    this.isProcessing = false
  }

  addNode(node) {
    this.nodes.set(node.id, node)
    this.emit('node:added', node)
    return this
  }

  removeNode(nodeId) {
    const node = this.nodes.get(nodeId)
    if (node) {
      this.connections.forEach((conn, id) => {
        if (conn.from === nodeId || conn.to === nodeId) {
          this.connections.delete(id)
        }
      })
      this.nodes.delete(nodeId)
      this.emit('node:removed', { id: nodeId })
    }
    return this
  }

  addConnection(connection) {
    this.connections.set(connection.id, connection)
    const fromNode = this.nodes.get(connection.from)
    const toNode = this.nodes.get(connection.to)
    if (fromNode && toNode) {
      fromNode.children.push(toNode.id)
      toNode.parent = fromNode.id
    }
    this.emit('connection:added', connection)
    return this
  }

  removeConnection(connectionId) {
    this.connections.delete(connectionId)
    this.emit('connection:removed', { id: connectionId })
    return this
  }

  getNode(id) {
    return this.nodes.get(id)
  }

  getConnection(id) {
    return this.connections.get(id)
  }

  getConnectionsForNode(nodeId) {
    return Array.from(this.connections.values()).filter(
      conn => conn.from === nodeId || conn.to === nodeId
    )
  }

  async updateLoadsAsync(loadUpdates) {
    return new Promise((resolve, reject) => {
      this.processingQueue.push({
        type: 'updateLoads',
        data: loadUpdates,
        resolve,
        reject
      })
      this.processQueue()
    })
  }

  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) return
    
    this.isProcessing = true
    
    while (this.processingQueue.length > 0) {
      const task = this.processingQueue.shift()
      
      try {
        switch (task.type) {
          case 'updateLoads':
            await this.processLoadUpdates(task.data)
            task.resolve({ success: true })
            break
          case 'calculateFlow':
            const result = await this.calculatePowerFlowAsync(task.data)
            task.resolve(result)
            break
          case 'optimizeExpansion':
            const plan = await this.calculateExpansionPlan(task.data)
            task.resolve(plan)
            break
        }
      } catch (err) {
        task.reject(err)
      }
    }
    
    this.isProcessing = false
  }

  async processLoadUpdates(updates) {
    await new Promise(resolve => setTimeout(resolve, 10))
    
    updates.forEach(update => {
      const node = this.nodes.get(update.nodeId)
      if (node) {
        const oldLoad = node.currentLoad
        node.currentLoad = update.load
        
        if (node.parent) {
          this.propagateLoadChange(node.parent, update.load - oldLoad)
        }
        
        this.emit('node:updated', node)
      }
    })
    
    this.emit('topology:updated', this.getTopologySnapshot())
  }

  propagateLoadChange(nodeId, delta) {
    const node = this.nodes.get(nodeId)
    if (node) {
      node.currentLoad += delta
      if (node.parent) {
        this.propagateLoadChange(node.parent, delta)
      }
    }
  }

  async calculatePowerFlowAsync(targetNodeId = null) {
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const flows = []
    this.connections.forEach(conn => {
      const fromNode = this.nodes.get(conn.from)
      const toNode = this.nodes.get(conn.to)
      
      if (fromNode && toNode) {
        const flow = toNode.currentLoad
        conn.currentFlow = flow
        
        if (!targetNodeId || conn.from === targetNodeId || conn.to === targetNodeId) {
          flows.push({
            connectionId: conn.id,
            from: conn.from,
            to: conn.to,
            flow: flow,
            capacity: conn.capacity,
            ratio: conn.getFlowRatio()
          })
        }
      }
    })
    
    return flows
  }

  async queueCalculateFlow(targetNodeId = null) {
    return new Promise((resolve, reject) => {
      this.processingQueue.push({
        type: 'calculateFlow',
        data: targetNodeId,
        resolve,
        reject
      })
      this.processQueue()
    })
  }

  async calculateExpansionPlan(options = {}) {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const { 
      targetRatio = 0.8, 
      minExpansion = 10, 
      maxExpansion = 100 
    } = options
    
    const overloadedNodes = []
    const bottleneckConnections = []
    const recommendations = []

    this.nodes.forEach(node => {
      const ratio = node.getLoadRatio()
      if (ratio > targetRatio) {
        overloadedNodes.push({
          nodeId: node.id,
          name: node.name,
          type: node.type,
          currentRatio: ratio,
          currentLoad: node.currentLoad,
          currentCapacity: node.capacity
        })
        
        const recommendedCapacity = Math.ceil(node.currentLoad / targetRatio)
        const expansionAmount = Math.min(
          Math.max(recommendedCapacity - node.capacity, minExpansion),
          maxExpansion
        )
        
        if (expansionAmount > 0) {
          recommendations.push({
            type: 'node_expansion',
            nodeId: node.id,
            name: node.name,
            currentCapacity: node.capacity,
            recommendedCapacity: recommendedCapacity,
            expansionAmount: expansionAmount,
            priority: ratio > 0.95 ? 'critical' : ratio > 0.9 ? 'high' : 'medium',
            estimatedCost: this.calculateCost(node.type, expansionAmount)
          })
        }
      }
    })

    this.connections.forEach(conn => {
      const ratio = conn.getFlowRatio()
      if (ratio > targetRatio) {
        bottleneckConnections.push({
          connectionId: conn.id,
          from: conn.from,
          to: conn.to,
          currentRatio: ratio,
          currentFlow: conn.currentFlow,
          capacity: conn.capacity
        })
      }
    })

    return {
      timestamp: Date.now(),
      targetRatio,
      overloadedNodes,
      bottleneckConnections,
      recommendations,
      summary: {
        totalNodes: this.nodes.size,
        overloadedCount: overloadedNodes.length,
        bottleneckCount: bottleneckConnections.length,
        recommendationsCount: recommendations.length
      }
    }
  }

  calculateCost(nodeType, expansionAmount) {
    const costPerMW = {
      dispatch_center: 50000,
      substation: 30000,
      transformer: 20000,
      bus: 10000,
      feeder: 5000,
      load: 1000
    }
    return (costPerMW[nodeType] || 10000) * expansionAmount
  }

  async queueExpansionPlan(options = {}) {
    return new Promise((resolve, reject) => {
      this.processingQueue.push({
        type: 'optimizeExpansion',
        data: options,
        resolve,
        reject
      })
      this.processQueue()
    })
  }

  findShortestPath(fromId, toId) {
    const visited = new Set()
    const queue = [{ nodeId: fromId, path: [] }]

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()
      
      if (nodeId === toId) {
        return [...path, toId]
      }
      
      if (visited.has(nodeId)) continue
      visited.add(nodeId)

      const connections = this.getConnectionsForNode(nodeId)
      connections.forEach(conn => {
        const nextNode = conn.from === nodeId ? conn.to : conn.from
        if (!visited.has(nextNode) && conn.status === 'active') {
          queue.push({
            nodeId: nextNode,
            path: [...path, nodeId]
          })
        }
      })
    }

    return null
  }

  getTopologySnapshot() {
    return {
      nodes: Array.from(this.nodes.values()).map(n => ({
        id: n.id,
        type: n.type,
        name: n.name,
        capacity: n.capacity,
        currentLoad: n.currentLoad,
        loadRatio: n.getLoadRatio(),
        status: n.status,
        isOverloaded: n.isOverloaded(),
        availableCapacity: n.getAvailableCapacity()
      })),
      connections: Array.from(this.connections.values()).map(c => ({
        id: c.id,
        from: c.from,
        to: c.to,
        capacity: c.capacity,
        currentFlow: c.currentFlow,
        flowRatio: c.getFlowRatio(),
        status: c.status
      })),
      timestamp: Date.now()
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data)
        } catch (err) {
          console.error('TopologyModel listener error:', err)
        }
      })
    }
  }
}

export const topologyModel = new AsyncTopologyModel()
export default topologyModel
