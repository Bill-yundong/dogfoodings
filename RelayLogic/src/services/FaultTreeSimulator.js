import { FaultTreeNode, NodeType } from '../models/FaultTree.js'

export class FaultTreeSimulator {
  constructor() {
    this.nodes = new Map()
    this.edges = []
    this.riskLevel = 'low'
    this.evolutionTimeline = []
    this.isRunning = false
    this.currentStep = 0
    this.maxSteps = 100
    this.timeStep = 100
  }

  createStandardFaultTree() {
    const nodes = []

    nodes.push(new FaultTreeNode({
      id: 'TOP-001',
      name: '变电站系统故障',
      type: NodeType.TOP,
      probability: 0.001
    }))

    nodes.push(new FaultTreeNode({
      id: 'AND-001',
      name: '主保护拒动 AND 后备保护拒动',
      type: NodeType.AND,
      probability: 0.05
    }))

    nodes.push(new FaultTreeNode({
      id: 'AND-002',
      name: '断路器失灵 AND 保护动作',
      type: NodeType.AND,
      probability: 0.08
    }))

    nodes.push(new FaultTreeNode({
      id: 'OR-001',
      name: '主保护故障',
      type: NodeType.OR,
      probability: 0.15
    }))

    nodes.push(new FaultTreeNode({
      id: 'OR-002',
      name: '后备保护故障',
      type: NodeType.OR,
      probability: 0.12
    }))

    nodes.push(new FaultTreeNode({
      id: 'BASIC-001',
      name: '电流互感器故障',
      type: NodeType.BASIC,
      probability: 0.02,
      evolutionTime: 5
    }))

    nodes.push(new FaultTreeNode({
      id: 'BASIC-002',
      name: '电压互感器故障',
      type: NodeType.BASIC,
      probability: 0.025,
      evolutionTime: 6
    }))

    nodes.push(new FaultTreeNode({
      id: 'BASIC-003',
      name: '保护装置硬件故障',
      type: NodeType.BASIC,
      probability: 0.015,
      evolutionTime: 8
    }))

    nodes.push(new FaultTreeNode({
      id: 'BASIC-004',
      name: '保护软件逻辑错误',
      type: NodeType.BASIC,
      probability: 0.01,
      evolutionTime: 3
    }))

    nodes.push(new FaultTreeNode({
      id: 'BASIC-005',
      name: '断路器操作机构故障',
      type: NodeType.BASIC,
      probability: 0.03,
      evolutionTime: 10
    }))

    nodes.push(new FaultTreeNode({
      id: 'BASIC-006',
      name: '断路器触头磨损',
      type: NodeType.BASIC,
      probability: 0.04,
      evolutionTime: 15
    }))

    nodes.push(new FaultTreeNode({
      id: 'BASIC-007',
      name: '二次回路断线',
      type: NodeType.BASIC,
      probability: 0.02,
      evolutionTime: 4
    }))

    nodes.push(new FaultTreeNode({
      id: 'BASIC-008',
      name: '通信通道故障',
      type: NodeType.BASIC,
      probability: 0.025,
      evolutionTime: 7
    }))

    nodes.forEach(node => this.nodes.set(node.id, node))

    this.edges = [
      { from: 'AND-001', to: 'TOP-001' },
      { from: 'AND-002', to: 'TOP-001' },
      { from: 'OR-001', to: 'AND-001' },
      { from: 'OR-002', to: 'AND-001' },
      { from: 'BASIC-001', to: 'OR-001' },
      { from: 'BASIC-002', to: 'OR-001' },
      { from: 'BASIC-003', to: 'OR-002' },
      { from: 'BASIC-004', to: 'OR-002' },
      { from: 'BASIC-005', to: 'AND-002' },
      { from: 'BASIC-006', to: 'AND-002' },
      { from: 'BASIC-007', to: 'OR-001' },
      { from: 'BASIC-008', to: 'OR-002' }
    ]

    this.calculateRiskLevel()

    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      riskLevel: this.riskLevel
    }
  }

  async simulateEvolutionAsync(initialTriggers = []) {
    this.isRunning = true
    this.currentStep = 0
    this.evolutionTimeline = []

    this.nodes.forEach(node => {
      node.status = 'normal'
      node.triggeredAt = null
    })

    initialTriggers.forEach(nodeId => {
      const node = this.nodes.get(nodeId)
      if (node) {
        node.status = 'triggered'
        node.triggeredAt = 0
        this.evolutionTimeline.push({ step: 0, nodeId, event: 'triggered', timestamp: Date.now() })
      }
    })

    while (this.isRunning && this.currentStep < this.maxSteps) {
      await this.step()
      this.currentStep++
      this.calculateRiskLevel()
    }

    return {
      timeline: this.evolutionTimeline,
      finalRisk: this.riskLevel,
      triggeredNodes: Array.from(this.nodes.values()).filter(n => n.status === 'triggered')
    }
  }

  async step() {
    await new Promise(resolve => setTimeout(resolve, this.timeStep))

    const triggeredNodes = Array.from(this.nodes.values()).filter(n => n.status === 'triggered')

    for (const sourceNode of triggeredNodes) {
      const outgoingEdges = this.edges.filter(e => e.from === sourceNode.id)

      for (const edge of outgoingEdges) {
        const targetNode = this.nodes.get(edge.to)
        if (targetNode && targetNode.status !== 'triggered') {
          const shouldTrigger = this.evaluateGateCondition(targetNode)

          if (shouldTrigger && Math.random() < targetNode.probability) {
            targetNode.status = 'triggered'
            targetNode.triggeredAt = this.currentStep

            this.evolutionTimeline.push({
              step: this.currentStep,
              nodeId: targetNode.id,
              nodeName: targetNode.name,
              event: 'cascading',
              sourceNodeId: sourceNode.id,
              sourceNodeName: sourceNode.name,
              timestamp: Date.now()
            })
          }
        }
      }
    }
  }

  evaluateGateCondition(node) {
    if (node.isBasicEvent()) return true

    const incomingEdges = this.edges.filter(e => e.to === node.id)
    const triggeredInputs = incomingEdges.filter(edge => {
      const sourceNode = this.nodes.get(edge.from)
      return sourceNode && sourceNode.status === 'triggered'
    })

    if (node.isOrGate()) {
      return triggeredInputs.length > 0
    }

    if (node.isAndGate()) {
      return triggeredInputs.length === incomingEdges.length
    }

    return triggeredInputs.length > 0
  }

  calculateRiskLevel() {
    const triggeredCount = Array.from(this.nodes.values()).filter(n => n.status === 'triggered').length
    const totalCount = this.nodes.size
    const ratio = triggeredCount / totalCount

    if (ratio === 0) this.riskLevel = 'low'
    else if (ratio < 0.1) this.riskLevel = 'medium'
    else if (ratio < 0.3) this.riskLevel = 'high'
    else this.riskLevel = 'critical'

    return this.riskLevel
  }

  predictCascadingRisk(initialNodes) {
    const visited = new Set()
    const queue = [...initialNodes]
    const riskPath = []
    let totalRisk = 0

    while (queue.length > 0) {
      const currentId = queue.shift()
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const currentNode = this.nodes.get(currentId)
      if (!currentNode) continue

      const outgoingEdges = this.edges.filter(e => e.from === currentId)

      for (const edge of outgoingEdges) {
        const targetNode = this.nodes.get(edge.to)
        if (targetNode && !visited.has(edge.to)) {
          const riskContribution = targetNode.probability * currentNode.probability
          totalRisk += riskContribution

          riskPath.push({
            from: currentId,
            fromName: currentNode.name,
            to: edge.to,
            toName: targetNode.name,
            risk: riskContribution
          })

          queue.push(edge.to)
        }
      }
    }

    return {
      totalRisk,
      riskPath,
      affectedNodes: Array.from(visited)
    }
  }

  stopSimulation() {
    this.isRunning = false
  }

  getFaultTreeData() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      riskLevel: this.riskLevel,
      timeline: this.evolutionTimeline
    }
  }

  getTriggeredNodes() {
    return Array.from(this.nodes.values()).filter(n => n.status === 'triggered')
  }

  resetSimulation() {
    this.nodes.forEach(node => {
      node.status = 'normal'
      node.triggeredAt = null
    })
    this.evolutionTimeline = []
    this.currentStep = 0
    this.riskLevel = 'low'
    this.isRunning = false
  }
}

export const faultTreeSimulator = new FaultTreeSimulator()
