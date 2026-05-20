import type { SatellitePosition, GroundStation, TrajectoryPoint } from './types'
import { DEG2RAD, EARTH_RADIUS } from './constants'

export interface GlobeRendererConfig {
  width: number
  height: number
  centerX?: number
  centerY?: number
  scale?: number
  rotation?: number
}

interface Point2D {
  x: number
  y: number
  visible: boolean
}

export class GlobeRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private config: Required<GlobeRendererConfig>
  private dpr: number

  constructor(canvas: HTMLCanvasElement, config: GlobeRendererConfig) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')
    this.ctx = ctx

    this.dpr = window.devicePixelRatio || 1

    this.config = {
      width: config.width,
      height: config.height,
      centerX: config.centerX ?? config.width / 2,
      centerY: config.centerY ?? config.height / 2,
      scale: config.scale ?? Math.min(config.width, config.height) * 0.4,
      rotation: config.rotation ?? 0
    }

    this.resize(config.width, config.height)
  }

  resize(width: number, height: number): void {
    this.config.width = width
    this.config.height = height
    this.config.centerX = width / 2
    this.config.centerY = height / 2
    this.config.scale = Math.min(width, height) * 0.4

    this.canvas.width = width * this.dpr
    this.canvas.height = height * this.dpr
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.ctx.scale(this.dpr, this.dpr)
  }

  project(latitude: number, longitude: number): Point2D {
    const lat = latitude * DEG2RAD
    const lng = (longitude + this.config.rotation) * DEG2RAD

    const x = Math.cos(lat) * Math.sin(lng)
    const y = Math.sin(lat)
    const z = Math.cos(lat) * Math.cos(lng)

    const scale = this.config.scale
    const centerX = this.config.centerX
    const centerY = this.config.centerY

    return {
      x: centerX + x * scale,
      y: centerY - y * scale,
      visible: z >= -0.1
    }
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.config.width, this.config.height)
  }

  drawEarth(): void {
    const { centerX, centerY, scale } = this.config

    const gradient = this.ctx.createRadialGradient(
      centerX - scale * 0.3,
      centerY - scale * 0.3,
      0,
      centerX,
      centerY,
      scale
    )
    gradient.addColorStop(0, '#1e3a5f')
    gradient.addColorStop(0.5, '#0d1b2a')
    gradient.addColorStop(1, '#050a14')

    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, scale, 0, Math.PI * 2)
    this.ctx.fillStyle = gradient
    this.ctx.fill()

    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, scale, 0, Math.PI * 2)
    this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    const atmosphereGradient = this.ctx.createRadialGradient(
      centerX,
      centerY,
      scale * 0.95,
      centerX,
      centerY,
      scale * 1.1
    )
    atmosphereGradient.addColorStop(0, 'rgba(59, 130, 246, 0)')
    atmosphereGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.1)')
    atmosphereGradient.addColorStop(1, 'rgba(59, 130, 246, 0)')

    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, scale * 1.1, 0, Math.PI * 2)
    this.ctx.fillStyle = atmosphereGradient
    this.ctx.fill()
  }

  drawGrid(): void {
    this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)'
    this.ctx.lineWidth = 0.5

    for (let lat = -60; lat <= 60; lat += 30) {
      this.drawLatitudeLine(lat)
    }

    for (let lng = -180; lng < 180; lng += 30) {
      this.drawLongitudeLine(lng)
    }
  }

  private drawLatitudeLine(latitude: number): void {
    const lat = latitude * DEG2RAD
    const points: Point2D[] = []

    for (let lng = -180; lng <= 180; lng += 5) {
      points.push(this.project(latitude, lng))
    }

    this.drawPath(points)
  }

  private drawLongitudeLine(longitude: number): void {
    const points: Point2D[] = []

    for (let lat = -90; lat <= 90; lat += 5) {
      points.push(this.project(lat, longitude))
    }

    this.drawPath(points)
  }

  private drawPath(points: Point2D[]): void {
    let started = false

    for (let i = 0; i < points.length; i++) {
      const point = points[i]

      if (point.visible) {
        if (!started) {
          this.ctx.beginPath()
          this.ctx.moveTo(point.x, point.y)
          started = true
        } else {
          this.ctx.lineTo(point.x, point.y)
        }
      } else if (started) {
        this.ctx.stroke()
        started = false
      }
    }

    if (started) {
      this.ctx.stroke()
    }
  }

  drawGroundStations(stations: GroundStation[], activeStationId?: string): void {
    for (const station of stations) {
      const point = this.project(station.latitude, station.longitude)
      if (!point.visible) continue

      const isActive = station.id === activeStationId

      if (isActive) {
        this.ctx.beginPath()
        this.ctx.arc(point.x, point.y, 12, 0, Math.PI * 2)
        this.ctx.fillStyle = `${station.color}33`
        this.ctx.fill()
      }

      this.ctx.beginPath()
      this.ctx.arc(point.x, point.y, 6, 0, Math.PI * 2)
      this.ctx.fillStyle = station.color
      this.ctx.fill()

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      this.ctx.lineWidth = 1
      this.ctx.stroke()

      this.ctx.fillStyle = 'rgba(230, 237, 247, 0.9)'
      this.ctx.font = '11px Inter, sans-serif'
      this.ctx.textAlign = 'left'
      this.ctx.fillText(station.name, point.x + 10, point.y + 4)
    }
  }

  drawSatellites(positions: SatellitePosition[], colors: Map<string, string>): void {
    for (const pos of positions) {
      const color = colors.get(pos.satelliteId) || '#3b82f6'
      this.drawSatelliteTrajectory(pos.trajectory, color)
      this.drawSatellite(pos.state.latitude, pos.state.longitude, color)
    }
  }

  private drawSatelliteTrajectory(trajectory: TrajectoryPoint[], color: string): void {
    if (trajectory.length < 2) return

    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 1.5

    let started = false

    for (let i = 0; i < trajectory.length; i++) {
      const point = this.project(trajectory[i].latitude, trajectory[i].longitude)

      if (point.visible) {
        if (!started) {
          this.ctx.beginPath()
          this.ctx.moveTo(point.x, point.y)
          started = true
        } else {
          this.ctx.lineTo(point.x, point.y)
        }
      } else if (started) {
        this.ctx.globalAlpha = 0.6
        this.ctx.stroke()
        this.ctx.globalAlpha = 1
        started = false
      }
    }

    if (started) {
      this.ctx.globalAlpha = 0.6
      this.ctx.stroke()
      this.ctx.globalAlpha = 1
    }
  }

  private drawSatellite(latitude: number, longitude: number, color: string): void {
    const point = this.project(latitude, longitude)
    if (!point.visible) return

    const glowGradient = this.ctx.createRadialGradient(
      point.x,
      point.y,
      0,
      point.x,
      point.y,
      15
    )
    glowGradient.addColorStop(0, `${color}88`)
    glowGradient.addColorStop(1, `${color}00`)

    this.ctx.beginPath()
    this.ctx.arc(point.x, point.y, 15, 0, Math.PI * 2)
    this.ctx.fillStyle = glowGradient
    this.ctx.fill()

    this.ctx.beginPath()
    this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2)
    this.ctx.fillStyle = color
    this.ctx.fill()

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    this.ctx.lineWidth = 1
    this.ctx.stroke()
  }

  drawVisibilityCone(
    station: GroundStation,
    satelliteLat: number,
    satelliteLng: number,
    isVisible: boolean
  ): void {
    const stationPoint = this.project(station.latitude, station.longitude)
    const satellitePoint = this.project(satelliteLat, satelliteLng)

    if (!stationPoint.visible || !satellitePoint.visible) return

    this.ctx.beginPath()
    this.ctx.moveTo(stationPoint.x, stationPoint.y)
    this.ctx.lineTo(satellitePoint.x, satellitePoint.y)
    this.ctx.strokeStyle = isVisible ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.3)'
    this.ctx.lineWidth = isVisible ? 2 : 1
    this.ctx.setLineDash(isVisible ? [] : [5, 5])
    this.ctx.stroke()
    this.ctx.setLineDash([])
  }

  setRotation(rotation: number): void {
    this.config.rotation = rotation
  }

  getRotation(): number {
    return this.config.rotation
  }

  render(
    positions: SatellitePosition[],
    stations: GroundStation[],
    satelliteColors: Map<string, string>,
    activeStationId?: string
  ): void {
    this.clear()
    this.drawEarth()
    this.drawGrid()
    this.drawGroundStations(stations, activeStationId)
    this.drawSatellites(positions, satelliteColors)
  }
}
