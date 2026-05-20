import type { Vector3D, GPSPosition, BlackBoxLog, Mission, DroneState } from '@/types'
import { vectorDistance, vectorLerp, gpsToVector, vectorToGPS, generateId } from '@/utils/math'

interface TrajectoryPoint {
  position: Vector3D
  gps: GPSPosition
  timestamp: number
  velocity: Vector3D
  acceleration: Vector3D
  battery: number
  status: string
}

interface TrajectorySegment {
  id: string
  droneId: string
  missionId: string
  startTime: number
  endTime: number
  points: TrajectoryPoint[]
  distance: number
  maxAltitude: number
  minAltitude: number
  avgSpeed: number
  energyConsumed: number
}

interface LifecycleEvent {
  id: string
  type: 'takeoff' | 'landing' | 'mission_start' | 'mission_end' | 'emergency' | 'maintenance'
  timestamp: number
  droneId: string
  position: Vector3D
  details: Record<string, any>
}

export class TrajectoryBase {
  private trajectories: Map<string, TrajectorySegment[]> = new Map()
  private activeTrajectories: Map<string, TrajectorySegment> = new Map()
  private lifecycleEvents: LifecycleEvent[] = []
  private maxTrajectoryPoints: number = 10000
  private originGPS: GPSPosition = { latitude: 39.9, longitude: 116.4, altitude: 50 }

  public setOrigin(gps: GPSPosition): void {
    this.originGPS = gps
  }

  public startTrajectory(droneId: string, missionId: string): string {
    const segmentId = generateId()
    const segment: TrajectorySegment = {
      id: segmentId,
      droneId,
      missionId,
      startTime: Date.now(),
      endTime: 0,
      points: [],
      distance: 0,
      maxAltitude: 0,
      minAltitude: Infinity,
      avgSpeed: 0,
      energyConsumed: 0
    }
    
    this.activeTrajectories.set(droneId, segment)
    return segmentId
  }

  public addTrajectoryPoint(droneId: string, state: DroneState): void {
    const segment = this.activeTrajectories.get(droneId)
    if (!segment) return

    const point: TrajectoryPoint = {
      position: { ...state.position },
      gps: { ...state.gps },
      timestamp: Date.now(),
      velocity: { ...state.velocity },
      acceleration: { ...state.acceleration },
      battery: state.battery,
      status: state.status
    }

    segment.points.push(point)

    if (segment.points.length > 1) {
      const lastPoint = segment.points[segment.points.length - 2]
      segment.distance += vectorDistance(lastPoint.position, point.position)
    }

    segment.maxAltitude = Math.max(segment.maxAltitude, state.altitude)
    segment.minAltitude = Math.min(segment.minAltitude, state.altitude)
  }

  public endTrajectory(droneId: string): TrajectorySegment | null {
    const segment = this.activeTrajectories.get(droneId)
    if (!segment) return null

    segment.endTime = Date.now()

    if (segment.points.length > 1) {
      const totalTime = (segment.endTime - segment.startTime) / 1000
      segment.avgSpeed = totalTime > 0 ? segment.distance / totalTime : 0
      
      const firstBattery = segment.points[0].battery
      const lastBattery = segment.points[segment.points.length - 1].battery
      segment.energyConsumed = firstBattery - lastBattery
    }

    const existing = this.trajectories.get(droneId) || []
    existing.push(segment)
    
    if (existing.length > this.maxTrajectoryPoints / 100) {
      existing.shift()
    }
    
    this.trajectories.set(droneId, existing)
    this.activeTrajectories.delete(droneId)

    return segment
  }

  public addLifecycleEvent(event: Omit<LifecycleEvent, 'id'>): string {
    const id = generateId()
    this.lifecycleEvents.push({ ...event, id })
    
    if (this.lifecycleEvents.length > 10000) {
      this.lifecycleEvents.shift()
    }
    
    return id
  }

  public getTrajectory(droneId: string, segmentId?: string): TrajectorySegment[] {
    const segments = this.trajectories.get(droneId) || []
    if (segmentId) {
      return segments.filter(s => s.id === segmentId)
    }
    return segments
  }

  public getActiveTrajectory(droneId: string): TrajectorySegment | null {
    return this.activeTrajectories.get(droneId) || null
  }

  public getCurrentPosition(droneId: string): TrajectoryPoint | null {
    const active = this.activeTrajectories.get(droneId)
    if (active && active.points.length > 0) {
      return active.points[active.points.length - 1]
    }

    const historical = this.trajectories.get(droneId)
    if (historical && historical.length > 0) {
      const lastSegment = historical[historical.length - 1]
      if (lastSegment.points.length > 0) {
        return lastSegment.points[lastSegment.points.length - 1]
      }
    }

    return null
  }

  public getTrajectoryAtTime(droneId: string, timestamp: number): TrajectoryPoint | null {
    const allSegments = [
      ...(this.trajectories.get(droneId) || []),
      ...Array.from(this.activeTrajectories.values())
    ].filter(s => s.startTime <= timestamp && (s.endTime === 0 || s.endTime >= timestamp))

    for (const segment of allSegments) {
      let left = 0
      let right = segment.points.length - 1

      while (left <= right) {
        const mid = Math.floor((left + right) / 2)
        if (segment.points[mid].timestamp === timestamp) {
          return segment.points[mid]
        } else if (segment.points[mid].timestamp < timestamp) {
          left = mid + 1
        } else {
          right = mid - 1
        }
      }

      if (right >= 0 && right < segment.points.length - 1) {
        const p1 = segment.points[right]
        const p2 = segment.points[right + 1]
        const t = (timestamp - p1.timestamp) / (p2.timestamp - p1.timestamp)
        return {
          position: vectorLerp(p1.position, p2.position, t),
          gps: {
            latitude: p1.gps.latitude + (p2.gps.latitude - p1.gps.latitude) * t,
            longitude: p1.gps.longitude + (p2.gps.longitude - p1.gps.longitude) * t,
            altitude: p1.gps.altitude + (p2.gps.altitude - p1.gps.altitude) * t
          },
          timestamp,
          velocity: vectorLerp(p1.velocity, p2.velocity, t),
          acceleration: vectorLerp(p1.acceleration, p2.acceleration, t),
          battery: p1.battery + (p2.battery - p1.battery) * t,
          status: p1.status
        }
      }
    }

    return null
  }

  public getLifecycleEvents(
    droneId?: string,
    type?: LifecycleEvent['type'],
    startTime?: number,
    endTime?: number
  ): LifecycleEvent[] {
    return this.lifecycleEvents.filter(event => {
      if (droneId && event.droneId !== droneId) return false
      if (type && event.type !== type) return false
      if (startTime && event.timestamp < startTime) return false
      if (endTime && event.timestamp > endTime) return false
      return true
    })
  }

  public getDroneStats(droneId: string): {
    totalFlightTime: number
    totalDistance: number
    totalMissions: number
    totalEnergy: number
  } {
    const segments = this.trajectories.get(droneId) || []
    let totalFlightTime = 0
    let totalDistance = 0
    let totalEnergy = 0

    for (const segment of segments) {
      totalFlightTime += (segment.endTime - segment.startTime) / 1000
      totalDistance += segment.distance
      totalEnergy += segment.energyConsumed
    }

    const active = this.activeTrajectories.get(droneId)
    if (active) {
      totalFlightTime += (Date.now() - active.startTime) / 1000
      totalDistance += active.distance
    }

    return {
      totalFlightTime,
      totalDistance,
      totalMissions: segments.length + (active ? 1 : 0),
      totalEnergy
    }
  }

  public getHeatmapData(
    startTime: number,
    endTime: number,
    resolution: number = 50
  ): Array<{ position: Vector3D; count: number; avgSpeed: number }> {
    const grid: Map<string, { count: number; totalSpeed: number; position: Vector3D }> = new Map()

    for (const [droneId, segments] of this.trajectories) {
      for (const segment of segments) {
        if (segment.endTime < startTime || segment.startTime > endTime) continue

        for (const point of segment.points) {
          if (point.timestamp < startTime || point.timestamp > endTime) continue

          const gridX = Math.floor(point.position.x / resolution) * resolution
          const gridY = Math.floor(point.position.y / resolution) * resolution
          const gridZ = Math.floor(point.position.z / resolution) * resolution
          const key = `${gridX},${gridY},${gridZ}`

          const existing = grid.get(key) || { count: 0, totalSpeed: 0, position: { x: gridX, y: gridY, z: gridZ } }
          existing.count++
          existing.totalSpeed += Math.sqrt(
            point.velocity.x ** 2 + point.velocity.y ** 2 + point.velocity.z ** 2
          )
          grid.set(key, existing)
        }
      }
    }

    const result: Array<{ position: Vector3D; count: number; avgSpeed: number }> = []
    grid.forEach((value) => {
      result.push({
        position: value.position,
        count: value.count,
        avgSpeed: value.count > 0 ? value.totalSpeed / value.count : 0
      })
    })

    return result
  }

  public generateBlackBoxLog(
    droneId: string,
    state: DroneState,
    windCondition: any,
    motorOutput: number[]
  ): Omit<BlackBoxLog> {
    return {
      droneId,
      timestamp: Date.now(),
      position: { ...state.position },
      gps: { ...state.gps },
      velocity: { ...state.velocity },
      acceleration: { ...state.acceleration },
      battery: state.battery,
      motorOutput,
      windCondition,
      status: state.status,
      synced: false
    }
  }

  public importFromBlackBoxLogs(logs: BlackBoxLog[]): void {
    for (const log of logs) {
      const droneId = log.droneId
      let segment = this.activeTrajectories.get(droneId)
      
      if (!segment) {
        const existingSegments = this.trajectories.get(droneId) || []
        const lastSegment = existingSegments[existingSegments.length - 1]
        
        if (!lastSegment || log.timestamp - lastSegment.endTime > 60000) {
          segment = {
            id: generateId(),
            droneId,
            missionId: 'imported',
            startTime: log.timestamp,
            endTime: 0,
            points: [],
            distance: 0,
            maxAltitude: 0,
            minAltitude: Infinity,
            avgSpeed: 0,
            energyConsumed: 0
          }
          this.activeTrajectories.set(droneId, segment)
        }
      }

      if (segment) {
        const point: TrajectoryPoint = {
          position: log.position,
          gps: log.gps,
          timestamp: log.timestamp,
          velocity: log.velocity,
          acceleration: log.acceleration,
          battery: log.battery,
          status: log.status
        }
        segment.points.push(point)
      }
    }

    for (const [droneId, segment] of this.activeTrajectories) {
      if (segment.points.length > 0) {
        const lastPoint = segment.points[segment.points.length - 1]
        if (Date.now() - lastPoint.timestamp > 60000) {
          this.endTrajectory(droneId)
        }
      }
    }
  }

  public exportTrajectoryToGeoJSON(droneId: string, segmentId: string): any {
    const segments = this.getTrajectory(droneId, segmentId)
    if (segments.length === 0) return null

    const segment = segments[0]
    const coordinates = segment.points.map(p => [
      p.gps.longitude,
      p.gps.latitude,
      p.gps.altitude
    ])

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          droneId,
          missionId: segment.missionId,
          startTime: segment.startTime,
          endTime: segment.endTime,
          distance: segment.distance,
          avgSpeed: segment.avgSpeed
        },
        geometry: {
          type: 'LineString',
          coordinates
        }
      }]
    }
  }

  public clearDroneData(droneId: string): void {
    this.trajectories.delete(droneId)
    this.activeTrajectories.delete(droneId)
    this.lifecycleEvents = this.lifecycleEvents.filter(e => e.droneId !== droneId)
  }

  public clearAll(): void {
    this.trajectories.clear()
    this.activeTrajectories.clear()
    this.lifecycleEvents = []
  }

  public getStats(): {
    totalDrones: number
    activeDrones: number
    totalSegments: number
    totalPoints: number
  } {
    let totalSegments = 0
    let totalPoints = 0

    this.trajectories.forEach(segments => {
      totalSegments += segments.length
      segments.forEach(s => totalPoints += s.points.length)
    })

    this.activeTrajectories.forEach(segment => {
      totalPoints += segment.points.length
    })

    return {
      totalDrones: this.trajectories.size + this.activeTrajectories.size,
      activeDrones: this.activeTrajectories.size,
      totalSegments,
      totalPoints
    }
  }
}
