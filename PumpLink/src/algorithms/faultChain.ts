import type { FaultChain, FaultNode, FaultEdge, FaultSeverity } from '@/types'

interface FaultPattern {
  cause: string
  effects: { component: string; description: string; delay: number; probability: number }[]
}

export class FaultChainSimulator {
  private faultPatterns: FaultPattern[] = [
    {
      cause: '入口压力不足',
      effects: [
        { component: '叶轮', description: '气蚀初生', delay: 0, probability: 0.9 },
        { component: '密封环', description: '间隙增大', delay: 24, probability: 0.7 },
        { component: '泵壳', description: '振动加剧', delay: 48, probability: 0.8 }
      ]
    },
    {
      cause: '轴承磨损',
      effects: [
        { component: '主轴', description: '径向跳动增大', delay: 0, probability: 0.95 },
        { component: '密封件', description: '泄漏风险', delay: 72, probability: 0.6 },
        { component: '联轴器', description: '对中偏差', delay: 120, probability: 0.75 }
      ]
    },
    {
      cause: '叶轮腐蚀',
      effects: [
        { component: '叶轮', description: '叶片损伤', delay: 0, probability: 0.85 },
        { component: '平衡盘', description: '轴向力失衡', delay: 96, probability: 0.7 },
        { component: '推力轴承', description: '过载损坏', delay: 168, probability: 0.8 }
      ]
    },
    {
      cause: '流量偏离设计点',
      effects: [
        { component: '叶轮', description: '流动分离', delay: 0, probability: 0.8 },
        { component: '导叶', description: '压力脉动', delay: 24, probability: 0.75 },
        { component: '泵体', description: '疲劳损伤', delay: 336, probability: 0.6 }
      ]
    }
  ]

  simulate(rootCause: string, deviceId: string): FaultChain {
    const pattern = this.faultPatterns.find(p => p.cause === rootCause) || this.faultPatterns[0]
    const nodes: FaultNode[] = []
    const edges: FaultEdge[] = []
    const affectedComponents: string[] = []

    const rootNode: FaultNode = {
      id: 'node-0',
      type: 'cause',
      component: '系统',
      description: pattern.cause,
      probability: 1.0,
      timePoint: 0,
      x: 400,
      y: 100
    }
    nodes.push(rootNode)

    let nodeIndex = 1
    pattern.effects.forEach((effect, effectIndex) => {
      const effectNode: FaultNode = {
        id: `node-${nodeIndex}`,
        type: effectIndex === pattern.effects.length - 1 ? 'symptom' : 'effect',
        component: effect.component,
        description: effect.description,
        probability: effect.probability,
        timePoint: effect.delay,
        x: 200 + effectIndex * 200,
        y: 250 + (nodeIndex % 2) * 80
      }
      nodes.push(effectNode)

      const fromNode = effectIndex === 0 ? rootNode : nodes[nodeIndex - 1]
      edges.push({
        from: fromNode.id,
        to: effectNode.id,
        relationship: '导致',
        delay: effect.delay,
        confidence: effect.probability
      })

      if (!affectedComponents.includes(effect.component)) {
        affectedComponents.push(effect.component)
      }
      nodeIndex++
    })

    const severity = this.calculateSeverity(nodes)
    const estimatedTimeToFailure = this.calculateTTF(nodes, edges)
    const confidence = this.calculateConfidence(edges)

    return {
      id: `chain-${Date.now()}`,
      deviceId,
      rootCause: rootNode,
      propagationPath: edges,
      nodes,
      affectedComponents,
      estimatedTimeToFailure,
      severity,
      confidence
    }
  }

  private calculateSeverity(nodes: FaultNode[]): FaultSeverity {
    const avgProb = nodes.reduce((sum, n) => sum + n.probability, 0) / nodes.length
    const maxTime = Math.max(...nodes.map(n => n.timePoint))

    if (avgProb > 0.85 && maxTime < 72) return 'catastrophic'
    if (avgProb > 0.7) return 'severe'
    if (avgProb > 0.5) return 'moderate'
    return 'minor'
  }

  private calculateTTF(nodes: FaultNode[], edges: FaultEdge[]): number {
    const maxDelay = edges.reduce((max, e) => max + e.delay, 0)
    const severityFactor = this.calculateSeverity(nodes)
    let factor = 1.0

    switch (severityFactor) {
      case 'catastrophic': factor = 0.5; break
      case 'severe': factor = 0.7; break
      case 'moderate': factor = 0.85; break
      default: factor = 1.0
    }

    return Math.round(maxDelay * factor)
  }

  private calculateConfidence(edges: FaultEdge[]): number {
    if (edges.length === 0) return 0
    return edges.reduce((sum, e) => sum + e.confidence, 0) / edges.length
  }

  getAvailableCauses(): string[] {
    return this.faultPatterns.map(p => p.cause)
  }

  animatePropagation(chain: FaultChain, speed: number = 1) {
    const sortedNodes = [...chain.nodes].sort((a, b) => a.timePoint - b.timePoint)
    return {
      [Symbol.asyncIterator]: async function* () {
        for (const node of sortedNodes) {
          const delay = node.timePoint > 0 ? (node.timePoint * 100) / speed : 300
          await new Promise(resolve => setTimeout(resolve, delay))
          yield node
        }
      }
    }
  }

  calculateCausalityMatrix(chain: FaultChain): number[][] {
    const n = chain.nodes.length
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0))

    for (const edge of chain.propagationPath) {
      const fromIdx = chain.nodes.findIndex(n => n.id === edge.from)
      const toIdx = chain.nodes.findIndex(n => n.id === edge.to)
      if (fromIdx !== -1 && toIdx !== -1) {
        matrix[fromIdx][toIdx] = edge.confidence
      }
    }

    return matrix
  }
}

export const faultSimulator = new FaultChainSimulator()
