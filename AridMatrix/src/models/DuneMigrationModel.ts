import type { Dune, VegetationZone, WeatherData } from '../types'

export class DuneMigrationModel {
  private readonly PARTICLE_SIZE = 0.25
  private readonly THRESHOLD_VELOCITY = 5.0

  calculateSaltationHeight(windSpeed: number): number {
    const excessVelocity = Math.max(0, windSpeed - this.THRESHOLD_VELOCITY)
    return 0.1 * Math.pow(excessVelocity, 1.5)
  }

  calculateTransportRate(windSpeed: number, vegetationCoverage: number): number {
    const shelteringEffect = Math.exp(-2.5 * vegetationCoverage)
    const excessVelocity = Math.max(0, windSpeed - this.THRESHOLD_VELOCITY)
    return 0.001 * Math.pow(excessVelocity, 3) * shelteringEffect
  }

  calculateMigrationRate(
    dune: Dune,
    windSpeed: number,
    windDirection: number,
    vegetationZones: VegetationZone[]
  ): number {
    const localCoverage = this.calculateLocalCoverage(dune.position, vegetationZones)
    const transportRate = this.calculateTransportRate(windSpeed, localCoverage)
    const directionAlignment = Math.cos((windDirection - dune.direction) * Math.PI / 180)
    return transportRate * Math.max(0.1, directionAlignment) / dune.height
  }

  private calculateLocalCoverage(
    position: { x: number; y: number },
    vegetationZones: VegetationZone[]
  ): number {
    let totalWeight = 0
    let weightedCoverage = 0

    for (const zone of vegetationZones) {
      const distance = Math.sqrt(
        Math.pow(position.x - zone.position.x, 2) +
        Math.pow(position.y - zone.position.y, 2)
      )
      if (distance < zone.radius) {
        const weight = 1 - distance / zone.radius
        totalWeight += weight
        weightedCoverage += weight * zone.coverage
      }
    }

    return totalWeight > 0 ? weightedCoverage / totalWeight : 0
  }

  updateDunePosition(
    dune: Dune,
    weather: WeatherData,
    vegetationZones: VegetationZone[],
    timeStep: number
  ): Dune {
    const migrationRate = this.calculateMigrationRate(
      dune,
      weather.windSpeed,
      weather.windDirection,
      vegetationZones
    )

    const radians = weather.windDirection * Math.PI / 180
    const dx = migrationRate * Math.cos(radians) * timeStep
    const dy = migrationRate * Math.sin(radians) * timeStep

    return {
      ...dune,
      position: {
        x: dune.position.x + dx,
        y: dune.position.y + dy
      },
      migrationRate
    }
  }
}