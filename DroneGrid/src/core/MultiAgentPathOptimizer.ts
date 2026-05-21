import type { Vector3D, Mission, PathOptimizationResult, DroneState, AirspaceZone, CollisionDetectionResult } from '@/types'
import { vectorDistance, vectorNormalize, vectorAdd, vectorScale, vectorSub } from '@/utils/math'
import { WeatherDynamics } from './WeatherDynamics'

interface PathNode {
  position: Vector3D
  g: number
  h: number
  f: number
  parent: PathNode | null
}

export class MultiAgentPathOptimizer {
  private weatherDynamics: WeatherDynamics
  private airspaceZones: AirspaceZone[] = []
  private agents: Map<string, DroneState> = new Map()
  private maxIterations: number = 1000
  private collisionDistance: number = 10

  constructor(weatherDynamics: WeatherDynamics) {
    this.weatherDynamics = weatherDynamics
  }

  public setAirspaceZones(zones: AirspaceZone[]): void {
    this.airspaceZones = zones
  }

  public registerAgent(droneId: string, state: DroneState): void {
    this.agents.set(droneId, state)
  }

  public unregisterAgent(droneId: string): void {
    this.agents.delete(droneId)
  }

  public updateAgentState(droneId: string, state: DroneState): void {
    this.agents.set(droneId, state)
  }

  public async optimizePathAsync(
    mission: Mission,
    startPosition: Vector3D,
    onProgress?: (progress: number) => void
  ): Promise<PathOptimizationResult> {
    const waypoints = mission.waypoints.map(wp => wp.position)
    const fullPath: Vector3D[] = [startPosition]
    let totalDistance = 0
    let totalEnergy = 0
    let totalDuration = 0
    let maxWindPenalty = 0
    let maxCollisionRisk = 0

    const orderedWaypoints = this.optimizeWaypointOrder(startPosition, waypoints)

    for (let i = 0; i < orderedWaypoints.length; i++) {
      const start = i === 0 ? startPosition : orderedWaypoints[i - 1]
      const end = orderedWaypoints[i]
      
      const segmentPath = this.aStarPathfinding(start, end, mission.droneId)
      
      if (i > 0) segmentPath.shift()
      
      fullPath.push(...segmentPath)

      const segmentResult = this.calculateSegmentMetrics(segmentPath, mission.droneId)
      totalDistance += segmentResult.distance
      totalEnergy += segmentResult.energy
      totalDuration += segmentResult.duration
      maxWindPenalty = Math.max(maxWindPenalty, segmentResult.windPenalty)
      maxCollisionRisk = Math.max(maxCollisionRisk, segmentResult.collisionRisk)

      if (onProgress) {
        onProgress(((i + 1) / orderedWaypoints.length) * 100)
      }

      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return {
      missionId: mission.id,
      optimizedPath: fullPath,
      totalDistance,
      estimatedEnergy: totalEnergy,
      estimatedDuration: totalDuration,
      windPenalty: maxWindPenalty,
      collisionRisk: maxCollisionRisk
    }
  }

  public optimizePath(
    mission: Mission,
    startPosition: Vector3D,
    onProgress?: (progress: number) => void
  ): PathOptimizationResult {
    const waypoints = mission.waypoints.map(wp => wp.position)
    const fullPath: Vector3D[] = [startPosition]
    let totalDistance = 0
    let totalEnergy = 0
    let totalDuration = 0
    let maxWindPenalty = 0
    let maxCollisionRisk = 0

    const orderedWaypoints = this.optimizeWaypointOrder(startPosition, waypoints)

    for (let i = 0; i < orderedWaypoints.length; i++) {
      const start = i === 0 ? startPosition : orderedWaypoints[i - 1]
      const end = orderedWaypoints[i]
      
      const segmentPath = this.aStarPathfinding(start, end, mission.droneId)
      
      if (i > 0) segmentPath.shift()
      
      fullPath.push(...segmentPath)

      const segmentResult = this.calculateSegmentMetrics(segmentPath, mission.droneId)
      totalDistance += segmentResult.distance
      totalEnergy += segmentResult.energy
      totalDuration += segmentResult.duration
      maxWindPenalty = Math.max(maxWindPenalty, segmentResult.windPenalty)
      maxCollisionRisk = Math.max(maxCollisionRisk, segmentResult.collisionRisk)

      if (onProgress) {
        onProgress(((i + 1) / orderedWaypoints.length) * 100)
      }
    }

    return {
      missionId: mission.id,
      optimizedPath: fullPath,
      totalDistance,
      estimatedEnergy: totalEnergy,
      estimatedDuration: totalDuration,
      windPenalty: maxWindPenalty,
      collisionRisk: maxCollisionRisk
    }
  }

  private optimizeWaypointOrder(start: Vector3D, waypoints: Vector3D[]): Vector3D[] {
    if (waypoints.length <= 1) return waypoints

    const remaining = [...waypoints]
    const ordered: Vector3D[] = []
    let current = start

    while (remaining.length > 0) {
      let nearestIndex = 0
      let nearestDistance = Infinity

      for (let i = 0; i < remaining.length; i++) {
        const dist = vectorDistance(current, remaining[i])
        if (dist < nearestDistance) {
          nearestDistance = dist
          nearestIndex = i
        }
      }

      current = remaining[nearestIndex]
      ordered.push(remaining.splice(nearestIndex, 1)[0])
    }

    return ordered
  }

  private aStarPathfinding(
    start: Vector3D,
    end: Vector3D,
    droneId: string
  ): Vector3D[] {
    const stepSize = 5
    const openSet: PathNode[] = []
    const closedSet: Set<string> = new Set()

    const startNode: PathNode = {
      position: start,
      g: 0,
      h: this.heuristic(start, end),
      f: this.heuristic(start, end),
      parent: null
    }

    openSet.push(startNode)
    let iterations = 0

    while (openSet.length > 0 && iterations < this.maxIterations) {
      iterations++
      
      let currentIndex = 0
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i
        }
      }

      const current = openSet[currentIndex]
      const distToEnd = vectorDistance(current.position, end)

      if (distToEnd < stepSize) {
        return this.reconstructPath(current)
      }

      openSet.splice(currentIndex, 1)
      closedSet.add(this.getPositionKey(current.position))

      const neighbors = this.getNeighbors(current.position, stepSize, end)

      for (const neighbor of neighbors) {
        const neighborKey = this.getPositionKey(neighbor.position)
        
        if (closedSet.has(neighborKey)) continue
        
        if (!this.isValidPosition(neighbor.position, droneId)) continue

        const collisionCost = this.calculateCollisionCost(neighbor.position, droneId)
        const windCost = this.calculateWindCost(current.position, neighbor.position)
        const tentativeG = current.g + neighbor.cost + collisionCost + windCost

        const existingNode = openSet.find(n => this.getPositionKey(n.position) === neighborKey)
        
        if (!existingNode) {
          const h = this.heuristic(neighbor.position, end)
          openSet.push({
            position: neighbor.position,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: current
          })
        } else if (tentativeG < existingNode.g) {
          existingNode.g = tentativeG
          existingNode.f = tentativeG + existingNode.h
          existingNode.parent = current
        }
      }
    }

    return [start, end]
  }

  private getNeighbors(
    position: Vector3D,
    stepSize: number,
    target: Vector3D
  ): Array<{ position: Vector3D; cost: number }> {
    const neighbors: Array<{ position: Vector3D; cost: number }> = []
    const directions = [
      { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
      { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 },
      { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: -1 }
    ]

    const toTarget = vectorNormalize(vectorSub(target, position))

    for (const dir of directions) {
      const neighborPos = vectorAdd(position, vectorScale(dir, stepSize))
      const dirNorm = vectorNormalize(dir)
      const alignmentBonus = vectorDot(dirNorm, toTarget) * 0.5
      const cost = stepSize * (1 - alignmentBonus)

      neighbors.push({ position: neighborPos, cost })
    }

    return neighbors
  }

  private heuristic(a: Vector3D, b: Vector3D): number {
    return vectorDistance(a, b)
  }

  private getPositionKey(pos: Vector3D): string {
    return `${Math.round(pos.x)},${Math.round(pos.y)},${Math.round(pos.z)}`
  }

  private reconstructPath(endNode: PathNode): Vector3D[] {
    const path: Vector3D[] = []
    let current: PathNode | null = endNode

    while (current) {
      path.unshift(current.position)
      current = current.parent
    }

    return path
  }

  private isValidPosition(position: Vector3D, droneId: string): boolean {
    if (position.y < 5 || position.y > 200) return false

    for (const zone of this.airspaceZones) {
      if (zone.type === 'restricted' && this.isInZone(position, zone)) {
        return false
      }
    }

    return true
  }

  private isInZone(position: Vector3D, zone: AirspaceZone): boolean {
    if (position.y < zone.altitudeMin || position.y > zone.altitudeMax) return false

    const boundary = zone.boundary
    if (boundary.length < 3) return false

    let inside = false
    for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
      const xi = boundary[i].x, zi = boundary[i].z
      const xj = boundary[j].x, zj = boundary[j].z

      if (((zi > position.z) !== (zj > position.z)) &&
          (position.x < (xj - xi) * (position.z - zi) / (zj - zi) + xi)) {
        inside = !inside
      }
    }

    return inside
  }

  private calculateCollisionCost(position: Vector3D, droneId: string): number {
    let cost = 0

    for (const [id, state] of this.agents) {
      if (id === droneId) continue
      
      const dist = vectorDistance(position, state.position)
      if (dist < this.collisionDistance) {
        cost += (this.collisionDistance - dist) * 10
      }
    }

    for (const zone of this.airspaceZones) {
      if (zone.type === 'warning' && this.isInZone(position, zone)) {
        cost += 50
      }
    }

    return cost
  }

  private calculateWindCost(from: Vector3D, to: Vector3D): number {
    const midPoint = {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
      z: (from.z + to.z) / 2
    }

    const wind = this.weatherDynamics.getWindAt(midPoint)
    const direction = vectorNormalize(vectorSub(to, from))
    const windRad = (wind.direction * Math.PI) / 180
    
    const windVector = {
      x: Math.sin(windRad) * wind.speed,
      y: 0,
      z: Math.cos(windRad) * wind.speed
    }

    const dotProduct = direction.x * windVector.x + direction.z * windVector.z
    const windFactor = Math.max(0, -dotProduct)

    return windFactor * wind.speed * 2 * (1 + wind.turbulence)
  }

  private calculateSegmentMetrics(
    path: Vector3D[],
    droneId: string
  ): { distance: number; energy: number; duration: number; windPenalty: number; collisionRisk: number } {
    let distance = 0
    let energy = 0
    let duration = 0
    let maxWindPenalty = 0
    let maxCollisionRisk = 0

    const droneSpeed = 8

    for (let i = 1; i < path.length; i++) {
      const segmentDist = vectorDistance(path[i - 1], path[i])
      distance += segmentDist

      const velocity = vectorScale(vectorNormalize(vectorSub(path[i], path[i - 1])), droneSpeed)
      const wind = this.weatherDynamics.getWindAt(path[i])
      
      const segmentDuration = segmentDist / droneSpeed
      duration += segmentDuration

      const segmentEnergy = this.weatherDynamics.calculateEnergyLoss(velocity, wind, segmentDuration)
      energy += segmentEnergy

      const windRad = (wind.direction * Math.PI) / 180
      const windVector = { x: Math.sin(windRad) * wind.speed, y: 0, z: Math.cos(windRad) * wind.speed }
      const direction = vectorNormalize(vectorSub(path[i], path[i - 1]))
      const dotProduct = direction.x * windVector.x + direction.z * windVector.z
      maxWindPenalty = Math.max(maxWindPenalty, Math.max(0, -dotProduct * wind.speed))

      const collisionRisk = this.calculateCollisionRisk(path[i], droneId)
      maxCollisionRisk = Math.max(maxCollisionRisk, collisionRisk)
    }

    return {
      distance,
      energy,
      duration,
      windPenalty: maxWindPenalty,
      collisionRisk: maxCollisionRisk
    }
  }

  private calculateCollisionRisk(position: Vector3D, droneId: string): number {
    let maxRisk = 0

    for (const [id, state] of this.agents) {
      if (id === droneId) continue
      
      const dist = vectorDistance(position, state.position)
      if (dist < this.collisionDistance * 3) {
        const risk = 1 - (dist / (this.collisionDistance * 3))
        maxRisk = Math.max(maxRisk, risk)
      }
    }

    return maxRisk
  }

  public checkCollisions(droneId: string, position: Vector3D): CollisionDetectionResult {
    for (const [id, state] of this.agents) {
      if (id === droneId) continue
      
      const dist = vectorDistance(position, state.position)
      if (dist < this.collisionDistance) {
        const relativeSpeed = vectorDistance(
          this.agents.get(droneId)?.velocity || { x: 0, y: 0, z: 0 },
          state.velocity
        )
        const timeToCollision = relativeSpeed > 0 ? dist / relativeSpeed : Infinity

        return {
          hasCollision: true,
          distance: dist,
          obstacleId: id,
          position: state.position,
          timeToCollision
        }
      }
    }

    return {
      hasCollision: false,
      distance: Infinity,
      obstacleId: '',
      position: { x: 0, y: 0, z: 0 },
      timeToCollision: Infinity
    }
  }
}
