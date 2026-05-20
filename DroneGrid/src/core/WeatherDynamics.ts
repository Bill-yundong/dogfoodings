import type { Vector3D, WindData, WeatherGridCell } from '@/types'
import { vectorDistance, vectorLerp, degToRad } from '@/utils/math'

export class WeatherDynamics {
  private gridSize: number
  private cellSize: number
  private grid: Map<string, WeatherGridCell> = new Map()
  private origin: Vector3D = { x: 0, y: 0, z: 0 }
  private time: number = 0

  constructor(gridSize: number = 50, cellSize: number = 10) {
    this.gridSize = gridSize
    this.cellSize = cellSize
    this.initializeGrid()
  }

  private initializeGrid(): void {
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        for (let z = 0; z < this.gridSize; z++) {
          const position = {
            x: this.origin.x + x * this.cellSize - (this.gridSize * this.cellSize) / 2,
            y: this.origin.y + y * this.cellSize,
            z: this.origin.z + z * this.cellSize - (this.gridSize * this.cellSize) / 2
          }
          const key = this.getGridKey(x, y, z)
          this.grid.set(key, {
            position,
            wind: this.generateWindData(position),
            timestamp: Date.now()
          })
        }
      }
    }
  }

  private getGridKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`
  }

  private getGridCoords(position: Vector3D): { x: number; y: number; z: number } {
    const offset = (this.gridSize * this.cellSize) / 2
    return {
      x: Math.floor((position.x + offset) / this.cellSize),
      y: Math.floor(position.y / this.cellSize),
      z: Math.floor((position.z + offset) / this.cellSize)
    }
  }

  private generateWindData(position: Vector3D): WindData {
    const baseSpeed = 3 + Math.random() * 5
    const heightFactor = Math.min(1, position.y / 200)
    const turbulence = 0.1 + Math.random() * 0.3 * heightFactor
    
    return {
      speed: baseSpeed * (0.8 + heightFactor * 0.4),
      direction: Math.random() * 360,
      turbulence,
      temperature: 15 + (100 - position.y) * 0.06 + Math.random() * 5,
      pressure: 101325 - position.y * 0.12,
      humidity: 50 + Math.random() * 30
    }
  }

  public getWindAt(position: Vector3D): WindData {
    const coords = this.getGridCoords(position)
    
    const clampedCoords = {
      x: Math.max(0, Math.min(this.gridSize - 1, coords.x)),
      y: Math.max(0, Math.min(this.gridSize - 1, coords.y)),
      z: Math.max(0, Math.min(this.gridSize - 1, coords.z))
    }

    const neighbors: WeatherGridCell[] = []
    for (let dx = 0; dx <= 1; dx++) {
      for (let dy = 0; dy <= 1; dy++) {
        for (let dz = 0; dz <= 1; dz++) {
          const key = this.getGridKey(
            clampedCoords.x + dx,
            clampedCoords.y + dy,
            clampedCoords.z + dz
          )
          const cell = this.grid.get(key)
          if (cell) neighbors.push(cell)
        }
      }
    }

    if (neighbors.length === 0) {
      return this.generateWindData(position)
    }

    return this.trilinearInterpolation(position, neighbors)
  }

  private trilinearInterpolation(
    position: Vector3D,
    cells: WeatherGridCell[]
  ): WindData {
    if (cells.length === 0) return this.generateWindData(position)
    if (cells.length === 1) return cells[0].wind

    const minPos = {
      x: Math.min(...cells.map(c => c.position.x)),
      y: Math.min(...cells.map(c => c.position.y)),
      z: Math.min(...cells.map(c => c.position.z))
    }
    const maxPos = {
      x: Math.max(...cells.map(c => c.position.x)),
      y: Math.max(...cells.map(c => c.position.y)),
      z: Math.max(...cells.map(c => c.position.z))
    }

    const tx = maxPos.x === minPos.x ? 0 : (position.x - minPos.x) / (maxPos.x - minPos.x)
    const ty = maxPos.y === minPos.y ? 0 : (position.y - minPos.y) / (maxPos.y - minPos.y)
    const tz = maxPos.z === minPos.z ? 0 : (position.z - minPos.z) / (maxPos.z - minPos.z)

    const c000 = cells.find(c => 
      c.position.x === minPos.x && c.position.y === minPos.y && c.position.z === minPos.z
    )?.wind || this.generateWindData(position)
    const c100 = cells.find(c => 
      c.position.x === maxPos.x && c.position.y === minPos.y && c.position.z === minPos.z
    )?.wind || c000
    const c010 = cells.find(c => 
      c.position.x === minPos.x && c.position.y === maxPos.y && c.position.z === minPos.z
    )?.wind || c000
    const c110 = cells.find(c => 
      c.position.x === maxPos.x && c.position.y === maxPos.y && c.position.z === minPos.z
    )?.wind || c000
    const c001 = cells.find(c => 
      c.position.x === minPos.x && c.position.y === minPos.y && c.position.z === maxPos.z
    )?.wind || c000
    const c101 = cells.find(c => 
      c.position.x === maxPos.x && c.position.y === minPos.y && c.position.z === maxPos.z
    )?.wind || c000
    const c011 = cells.find(c => 
      c.position.x === minPos.x && c.position.y === maxPos.y && c.position.z === maxPos.z
    )?.wind || c000
    const c111 = cells.find(c => 
      c.position.x === maxPos.x && c.position.y === maxPos.y && c.position.z === maxPos.z
    )?.wind || c000

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const c00 = this.lerpWind(c000, c100, tx)
    const c10 = this.lerpWind(c010, c110, tx)
    const c01 = this.lerpWind(c001, c101, tx)
    const c11 = this.lerpWind(c011, c111, tx)

    const c0 = this.lerpWind(c00, c10, ty)
    const c1 = this.lerpWind(c01, c11, ty)

    return this.lerpWind(c0, c1, tz)
  }

  private lerpWind(a: WindData, b: WindData, t: number): WindData {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    return {
      speed: lerp(a.speed, b.speed, t),
      direction: lerp(a.direction, b.direction, t),
      turbulence: lerp(a.turbulence, b.turbulence, t),
      temperature: lerp(a.temperature, b.temperature, t),
      pressure: lerp(a.pressure, b.pressure, t),
      humidity: lerp(a.humidity, b.humidity, t)
    }
  }

  public calculateWindResistance(
    velocity: Vector3D,
    wind: WindData,
    crossSectionalArea: number = 0.05
  ): Vector3D {
    const windRad = degToRad(wind.direction)
    const windVelocity: Vector3D = {
      x: Math.sin(windRad) * wind.speed,
      y: 0,
      z: Math.cos(windRad) * wind.speed
    }

    const relativeVelocity = {
      x: velocity.x - windVelocity.x,
      y: velocity.y - windVelocity.y,
      z: velocity.z - windVelocity.z
    }

    const airDensity = 1.225
    const dragCoefficient = 0.8
    const speed = Math.sqrt(
      relativeVelocity.x ** 2 + relativeVelocity.y ** 2 + relativeVelocity.z ** 2
    )

    if (speed === 0) return { x: 0, y: 0, z: 0 }

    const dragForceMagnitude = 0.5 * airDensity * dragCoefficient * crossSectionalArea * speed ** 2
    const turbulenceFactor = 1 + wind.turbulence * 0.5

    return {
      x: -relativeVelocity.x / speed * dragForceMagnitude * turbulenceFactor,
      y: -relativeVelocity.y / speed * dragForceMagnitude * turbulenceFactor,
      z: -relativeVelocity.z / speed * dragForceMagnitude * turbulenceFactor
    }
  }

  public calculateEnergyLoss(
    velocity: Vector3D,
    wind: WindData,
    duration: number
  ): number {
    const windResistance = this.calculateWindResistance(velocity, wind)
    const resistanceMagnitude = Math.sqrt(
      windResistance.x ** 2 + windResistance.y ** 2 + windResistance.z ** 2
    )
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2)
    
    const basePower = 150
    const windPower = resistanceMagnitude * speed * 0.3
    const turbulencePenalty = wind.turbulence * 50
    
    return (basePower + windPower + turbulencePenalty) * duration
  }

  public update(deltaTime: number): void {
    this.time += deltaTime
    
    this.grid.forEach((cell, key) => {
      const noiseX = Math.sin(this.time * 0.5 + cell.position.x * 0.01) * 0.1
      const noiseY = Math.cos(this.time * 0.3 + cell.position.z * 0.01) * 0.05
      
      cell.wind.speed += noiseX * 0.5
      cell.wind.direction += noiseY * 2
      cell.wind.turbulence = Math.max(0.1, Math.min(0.8, cell.wind.turbulence + noiseX * 0.01))
      cell.timestamp = Date.now()
    })
  }

  public getGridStats(): { totalCells: number; avgWindSpeed: number; maxWindSpeed: number } {
    let totalSpeed = 0
    let maxSpeed = 0
    
    this.grid.forEach(cell => {
      totalSpeed += cell.wind.speed
      maxSpeed = Math.max(maxSpeed, cell.wind.speed)
    })
    
    return {
      totalCells: this.grid.size,
      avgWindSpeed: totalSpeed / this.grid.size,
      maxWindSpeed: maxSpeed
    }
  }
}
