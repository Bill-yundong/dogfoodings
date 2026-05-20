import type { SmokeField, SmokeGridPoint, Point, FloorMap, Node } from '@/types'
import { getFloorMap } from '@/data/buildingData'

export interface FireSource {
  position: Point
  floor: number
  intensity: number
  startTime: number
}

export interface SimulationConfig {
  gridSize: number
  diffusionRate: number
  maxConcentration: number
  decayRate: number
}

const DEFAULT_CONFIG: SimulationConfig = {
  gridSize: 10,
  diffusionRate: 0.15,
  maxConcentration: 100,
  decayRate: 0.01
}

export class SmokeSimulator {
  private fireSources: Map<string, FireSource> = new Map()
  private smokeFields: Map<number, SmokeField> = new Map()
  private config: SimulationConfig
  private lastUpdate: number = 0

  constructor(config?: Partial<SimulationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  addFireSource(id: string, source: FireSource): void {
    this.fireSources.set(id, source)
  }

  removeFireSource(id: string): void {
    this.fireSources.delete(id)
  }

  clearFireSources(): void {
    this.fireSources.clear()
  }

  update(currentTime: number): Map<number, SmokeField> {
    const deltaTime = this.lastUpdate === 0 ? 1 : (currentTime - this.lastUpdate) / 1000
    this.lastUpdate = currentTime

    const activeSources = Array.from(this.fireSources.values()).filter(
      s => s.startTime <= currentTime
    )

    for (const floor of [1, 2, 3]) {
      const floorMap = getFloorMap(floor)
      if (!floorMap) continue

      const floorSources = activeSources.filter(s => s.floor === floor)
      const smokeField = this.computeSmokeField(floor, floorMap, floorSources, deltaTime, currentTime)
      this.smokeFields.set(floor, smokeField)
    }

    return this.smokeFields
  }

  private computeSmokeField(
    floor: number,
    floorMap: FloorMap,
    sources: FireSource[],
    deltaTime: number,
    currentTime: number
  ): SmokeField {
    const { gridSize, diffusionRate, maxConcentration, decayRate } = this.config
    const { bounds } = floorMap
    const width = Math.ceil((bounds.max.x - bounds.min.x) / gridSize)
    const height = Math.ceil((bounds.max.y - bounds.min.y) / gridSize)

    const points: SmokeGridPoint[] = []
    const previousField = this.smokeFields.get(floor)
    const previousGrid = new Map<string, SmokeGridPoint>()

    if (previousField) {
      previousField.points.forEach(p => {
        previousGrid.set(`${p.x},${p.y}`, p)
      })
    }

    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        const x = bounds.min.x + i * gridSize + gridSize / 2
        const y = bounds.min.y + j * gridSize + gridSize / 2

        let concentration = 0
        let temperature = 25

        for (const source of sources) {
          const distance = Math.sqrt(
            Math.pow(x - source.position.x, 2) + Math.pow(y - source.position.y, 2)
          )
          const timeSinceStart = (currentTime - source.startTime) / 1000
          const spreadRadius = Math.sqrt(timeSinceStart) * source.intensity * 50
          const sourceConcentration = source.intensity * Math.max(0, 1 - distance / spreadRadius) * maxConcentration
          concentration += sourceConcentration
          temperature += sourceConcentration * 0.5
        }

        const key = `${x},${y}`
        const previous = previousGrid.get(key)
        if (previous) {
          const diffusion = (previous.concentration - concentration) * diffusionRate * deltaTime
          concentration = Math.min(maxConcentration, concentration + diffusion)
          concentration *= Math.max(0, 1 - decayRate * deltaTime)
        }

        concentration = Math.max(0, Math.min(maxConcentration, concentration))

        const visibility = this.calculateVisibility(concentration)

        points.push({
          x,
          y,
          floor,
          concentration: Math.round(concentration * 100) / 100,
          temperature: Math.round(temperature * 10) / 10,
          visibility: Math.round(visibility * 100) / 100,
          timestamp: currentTime
        })
      }
    }

    return {
      id: `smoke-${floor}-${currentTime}`,
      floor,
      gridSize,
      points,
      timestamp: currentTime
    }
  }

  private calculateVisibility(concentration: number): number {
    if (concentration < 5) return 100
    if (concentration < 20) return 80 - (concentration - 5) * 1.33
    if (concentration < 50) return 60 - (concentration - 20) * 1.33
    if (concentration < 80) return 20 - (concentration - 50) * 0.5
    return 5
  }

  getSmokeField(floor: number): SmokeField | undefined {
    return this.smokeFields.get(floor)
  }

  getAllSmokeFields(): Map<number, SmokeField> {
    return this.smokeFields
  }

  getConcentrationAt(floor: number, position: Point): number {
    const field = this.smokeFields.get(floor)
    if (!field) return 0

    let nearestPoint: SmokeGridPoint | undefined
    let minDistance = Infinity

    for (const point of field.points) {
      const distance = Math.sqrt(
        Math.pow(point.x - position.x, 2) + Math.pow(point.y - position.y, 2)
      )
      if (distance < minDistance) {
        minDistance = distance
        nearestPoint = point
      }
    }

    return nearestPoint?.concentration ?? 0
  }

  getNodeRiskLevel(node: Node): number {
    const concentration = this.getConcentrationAt(node.floor, node.position)

    if (concentration < 10) return 0
    if (concentration < 30) return 1
    if (concentration < 50) return 2
    if (concentration < 70) return 3
    return 4
  }

  isAreaSafe(floor: number, position: Point, threshold = 30): boolean {
    return this.getConcentrationAt(floor, position) < threshold
  }

  getDangerZones(floor: number, threshold = 50): Point[] {
    const field = this.smokeFields.get(floor)
    if (!field) return []

    return field.points
      .filter(p => p.concentration >= threshold)
      .map(p => ({ x: p.x, y: p.y }))
  }

  getSafeZones(floor: number, threshold = 20): Point[] {
    const field = this.smokeFields.get(floor)
    if (!field) return []

    return field.points
      .filter(p => p.concentration <= threshold)
      .map(p => ({ x: p.x, y: p.y }))
  }
}

export const createSmokeSimulator = (config?: Partial<SimulationConfig>) => {
  return new SmokeSimulator(config)
}

export function getConcentrationColor(concentration: number): string {
  if (concentration < 10) return 'rgba(0, 255, 0, 0.1)'
  if (concentration < 30) return 'rgba(120, 255, 0, 0.2)'
  if (concentration < 50) return 'rgba(255, 255, 0, 0.3)'
  if (concentration < 70) return 'rgba(255, 150, 0, 0.4)'
  return 'rgba(255, 0, 0, 0.5)'
}

export function getRiskLevelColor(level: number): string {
  const colors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444']
  return colors[Math.min(level, colors.length - 1)]
}

export function getRiskLevelText(level: number): string {
  const texts = ['安全', '低风险', '中风险', '高风险', '极危险']
  return texts[Math.min(level, texts.length - 1)]
}
