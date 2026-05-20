import type { EvacuationPath, PathNode, Node, Edge, Point } from '@/types'
import { getAllNodes, getAllEdges } from '@/data/buildingData'
import { SmokeSimulator } from './smokeSimulation'

interface PathNodeInternal {
  node: Node
  g: number
  h: number
  f: number
  risk: number
  parent: PathNodeInternal | null
}

export interface PathfindingConfig {
  walkingSpeed: number
  riskWeight: number
  distanceWeight: number
  maxSearchIterations: number
  corridorWidthThreshold: number
}

const DEFAULT_CONFIG: PathfindingConfig = {
  walkingSpeed: 1.4,
  riskWeight: 0.6,
  distanceWeight: 0.4,
  maxSearchIterations: 10000,
  corridorWidthThreshold: 50
}

export class PathOptimizer {
  private nodes: Map<string, Node> = new Map()
  private edges: Map<string, Edge> = new Map()
  private adjacencyList: Map<string, string[]> = new Map()
  private smokeSimulator: SmokeSimulator | null = null
  private config: PathfindingConfig

  constructor(config?: Partial<PathfindingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeGraph()
  }

  private initializeGraph(): void {
    const allNodes = getAllNodes()
    const allEdges = getAllEdges()

    allNodes.forEach(node => {
      this.nodes.set(node.id, node)
      this.adjacencyList.set(node.id, [])
    })

    allEdges.forEach(edge => {
      this.edges.set(edge.id, edge)
      this.adjacencyList.get(edge.from)?.push(edge.to)
      this.adjacencyList.get(edge.to)?.push(edge.from)
    })
  }

  setSmokeSimulator(simulator: SmokeSimulator): void {
    this.smokeSimulator = simulator
  }

  async findOptimalPath(
    startNodeId: string,
    endNodeId: string
  ): Promise<EvacuationPath | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this.findPathAStar(startNodeId, endNodeId)
        resolve(result)
      }, 0)
    })
  }

  async findPathToNearestExit(
    startNodeId: string
  ): Promise<EvacuationPath | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const exitNodes = Array.from(this.nodes.values()).filter(
          n => n.type === 'exit'
        )

        let bestPath: EvacuationPath | null = null
        let bestScore = Infinity

        for (const exit of exitNodes) {
          const path = this.findPathAStar(startNodeId, exit.id)
          if (path && path.riskScore < bestScore) {
            bestScore = path.riskScore
            bestPath = path
          }
        }

        resolve(bestPath)
      }, 0)
    })
  }

  async findMultiplePaths(
    startNodeId: string,
    endNodeId: string,
    count: number = 3
  ): Promise<EvacuationPath[]> {
    const paths: EvacuationPath[] = []
    const blockedEdges = new Set<string>()

    for (let i = 0; i < count; i++) {
      const path = this.findPathAStarWithBlocked(startNodeId, endNodeId, blockedEdges)

      if (path) {
          paths.push(path)

          for (let j = 0; j < path.nodes.length - 1; j++) {
            const from = path.nodes[j].nodeId
            const to = path.nodes[j + 1].nodeId
            blockedEdges.add(`${from}-${to}`)
            blockedEdges.add(`${to}-${from}`)
          }
        }
    }

    return paths
  }

  private findPathAStar(
    startNodeId: string,
    endNodeId: string,
    blockedEdges: Set<string> = new Set()
  ): EvacuationPath | null {
    const startNode = this.nodes.get(startNodeId)
    const endNode = this.nodes.get(endNodeId)

    if (!startNode || !endNode) {
      return null
    }

    const openSet: PathNodeInternal[] = []
    const closedSet = new Set<string>()
    const nodeMap = new Map<string, PathNodeInternal>()

    const startPathNode: PathNodeInternal = {
      node: startNode,
      g: 0,
      h: this.heuristic(startNode, endNode),
      f: 0,
      risk: 0,
      parent: null
    }
    startPathNode.f = startPathNode.g + startPathNode.h
    openSet.push(startPathNode)
    nodeMap.set(startNodeId, startPathNode)

    let iterations = 0

    while (openSet.length > 0 && iterations < this.config.maxSearchIterations) {
      iterations++

      openSet.sort((a, b) => a.f - b.f)
      const current = openSet.shift()!

      if (current.node.id === endNodeId) {
        return this.buildEvacuationPath(current, endNode)
      }

      closedSet.add(current.node.id)

      const neighbors = this.adjacencyList.get(current.node.id) || []

      for (const neighborId of neighbors) {
        if (closedSet.has(neighborId)) continue

        const edgeKey = `${current.node.id}-${neighborId}`
        if (blockedEdges.has(edgeKey)) continue

        const neighbor = this.nodes.get(neighborId)
        if (!neighbor) continue

        const edge = this.getEdge(current.node.id, neighborId)
        if (!edge || !edge.isAccessible) continue

        const risk = this.calculateNodeRisk(neighbor)
        const distance = this.getDistance(current.node, neighbor)
        const movementCost = this.calculateMovementCost(distance, risk, edge.width)

        const g = current.g + movementCost
        const h = this.heuristic(neighbor, endNode)
        const f = g + h

        const existing = nodeMap.get(neighborId)

        if (!existing || g < existing.g) {
          const newPathNode: PathNodeInternal = {
            node: neighbor,
            g,
            h,
            f,
            risk,
            parent: current
          }

          nodeMap.set(neighborId, newPathNode)

          const existingIndex = openSet.findIndex(n => n.node.id === neighborId)
          if (existingIndex >= 0) {
            openSet[existingIndex] = newPathNode
          } else {
            openSet.push(newPathNode)
          }
        }
      }
    }

    return null
  }

  private findPathAStarWithBlocked(
    startNodeId: string,
    endNodeId: string,
    blockedEdges: Set<string>
  ): EvacuationPath | null {
    return this.findPathAStar(startNodeId, endNodeId, blockedEdges)
  }

  private getEdge(from: string, to: string): Edge | undefined {
    return this.edges.get(`${from}-${to}`) || this.edges.get(`${to}-${from}`)
  }

  private getDistance(a: Node, b: Node): number {
    if (a.floor !== b.floor) {
      const horizontalDistance = Math.sqrt(
        Math.pow(a.position.x - b.position.x, 2) +
        Math.pow(a.position.y - b.position.y, 2)
      )
      const verticalDistance = Math.abs(a.floor - b.floor) * 30
      return Math.sqrt(Math.pow(horizontalDistance, 2) + Math.pow(verticalDistance, 2))
    }

    return Math.sqrt(
      Math.pow(a.position.x - b.position.x, 2) +
      Math.pow(a.position.y - b.position.y, 2)
    )
  }

  private heuristic(a: Node, b: Node): number {
    const baseDistance = this.getDistance(a, b)
    const risk = this.calculateNodeRisk(a)
    return baseDistance * (1 + risk * this.config.riskWeight)
  }

  private calculateNodeRisk(node: Node): number {
    if (!this.smokeSimulator) return 0
    return this.smokeSimulator.getNodeRiskLevel(node)
  }

  private calculateMovementCost(distance: number, risk: number, corridorWidth: number): number {
    const { riskWeight, distanceWeight, corridorWidthThreshold } = this.config

    const normalizedRisk = risk / 4
    const widthFactor = corridorWidth < corridorWidthThreshold ? 1.5 : 1

    return (
      distance * distanceWeight +
      normalizedRisk * distance * riskWeight * 2
    ) * widthFactor
  }

  private buildEvacuationPath(
    endNode: PathNodeInternal,
    targetEndNode: Node
  ): EvacuationPath {
    const path: PathNode[] = []
    let current: PathNodeInternal | null = endNode

    while (current) {
      path.unshift({
        nodeId: current.node.id,
        position: { ...current.node.position },
        floor: current.node.floor,
        riskLevel: current.risk
      })
      current = current.parent
    }

    const totalDistance = path.reduce((sum, node, index) => {
      if (index === 0) return 0
      const prev = path[index - 1]
      return sum + Math.sqrt(
        Math.pow(node.position.x - prev.position.x, 2) +
        Math.pow(node.position.y - prev.position.y, 2)
      )
    }, 0)

    const estimatedTime = totalDistance / this.config.walkingSpeed

    const avgRisk = path.reduce((sum, node) => sum + node.riskLevel, 0) / path.length
    const riskScore = totalDistance * (1 + avgRisk * this.config.riskWeight)

    const isStable = path.every(node => node.riskLevel <= 2)

    return {
      id: `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startNodeId: path[0].nodeId,
      endNodeId: targetEndNode.id,
      nodes: path,
      totalDistance: Math.round(totalDistance),
      estimatedTime: Math.round(estimatedTime),
      riskScore: Math.round(riskScore * 100) / 100,
      isStable
    }
  }

  updateEdgeAccessibility(edgeId: string, isAccessible: boolean): void {
    const edge = this.edges.get(edgeId)
    if (edge) {
      edge.isAccessible = isAccessible
    }
  }

  isPathSafe(path: EvacuationPath): boolean {
    return path.isStable && path.nodes.every(node => node.riskLevel <= 2)
  }

  getPathRiskSummary(path: EvacuationPath): {
    safe: number
    lowRisk: number
    mediumRisk: number
    highRisk: number
    critical: number
  } {
    const summary = { safe: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0, critical: 0 }

    for (const node of path.nodes) {
      switch (node.riskLevel) {
        case 0:
          summary.safe++
          break
        case 1:
          summary.lowRisk++
          break
        case 2:
          summary.mediumRisk++
          break
        case 3:
          summary.highRisk++
          break
        case 4:
          summary.critical++
          break
      }
    }

    return summary
  }
}

export const createPathOptimizer = (config?: Partial<PathfindingConfig>) => {
  return new PathOptimizer(config)
}

export function generatePathWaypoints(path: EvacuationPath): Point[] {
  return path.nodes.map(n => ({ x: n.position.x, y: n.position.y }))
}

export function getPathColor(riskScore: number): string {
  if (riskScore < 50) return '#22c55e'
  if (riskScore < 100) return '#84cc16'
  if (riskScore < 150) return '#eab308'
  if (riskScore < 200) return '#f97316'
  return '#ef4444'
}
