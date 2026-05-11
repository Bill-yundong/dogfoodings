import type { Particle, SimulationConfig, WeatherData, WindField } from '../types'

class WindFieldImpl implements WindField {
  private weatherData: WeatherData[] = []

  update(weatherData: WeatherData[]): void {
    this.weatherData = weatherData
  }

  getVelocity(lat: number, lng: number, time: number): { u: number; v: number } {
    if (this.weatherData.length === 0) {
      return { u: 0, v: 0 }
    }

    let totalWeight = 0
    let u = 0
    let v = 0

    for (const station of this.weatherData) {
      const dx = lng - station.lng
      const dy = lat - station.lat
      const dist = Math.sqrt(dx * dx + dy * dy)
      const weight = 1 / (dist + 0.001)

      const windRad = (station.windDirection * Math.PI) / 180
      const speed = station.windSpeed

      u += -speed * Math.sin(windRad) * weight
      v += -speed * Math.cos(windRad) * weight
      totalWeight += weight
    }

    return { u: u / totalWeight, v: v / totalWeight }
  }
}

export class LagrangianSimulator {
  private particles: Particle[] = []
  private config: SimulationConfig
  private windField: WindField
  private currentTime: number = 0

  constructor(config: SimulationConfig) {
    this.config = config
    this.windField = new WindFieldImpl()
  }

  updateWindField(weatherData: WeatherData[]): void {
    this.windField.update(weatherData)
  }

  initializeParticles(sources: Array<{ lat: number; lng: number; pm25: number; id: string }>): void {
    this.particles = []
    const particlesPerSource = Math.floor(this.config.particleCount / Math.max(1, sources.length))

    for (const source of sources) {
      for (let i = 0; i < particlesPerSource; i++) {
        const angle = Math.random() * 2 * Math.PI
        const radius = Math.random() * 0.1
        this.particles.push({
          id: `particle-${source.id}-${i}`,
          lat: source.lat + radius * Math.cos(angle),
          lng: source.lng + radius * Math.sin(angle),
          pm25: source.pm25 / particlesPerSource,
          age: 0,
          sourceId: source.id,
          velocity: { u: 0, v: 0 }
        })
      }
    }
  }

  async step(onProgress?: (current: number, total: number) => void): Promise<Particle[]> {
    const total = this.particles.length
    let processed = 0

    for (let i = 0; i < this.particles.length; i++) {
      this.updateParticle(this.particles[i])
      processed++
      if (processed % 100 === 0) {
        onProgress?.(processed, total)
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    this.particles = this.particles.filter(p => p.pm25 > 0.1)
    this.currentTime += this.config.timeStep

    return this.particles
  }

  private updateParticle(particle: Particle): void {
    const velocity = this.windField.getVelocity(particle.lat, particle.lng, this.currentTime)

    particle.velocity.u = velocity.u * this.config.advectionWeight +
      particle.velocity.u * (1 - this.config.advectionWeight)
    particle.velocity.v = velocity.v * this.config.advectionWeight +
      particle.velocity.v * (1 - this.config.advectionWeight)

    const randomU = this.randomWalk() * this.config.diffusionCoefficient
    const randomV = this.randomWalk() * this.config.diffusionCoefficient

    const totalU = particle.velocity.u + randomU
    const totalV = particle.velocity.v + randomV

    const latPerKm = 1 / 111
    const lngPerKm = 1 / (111 * Math.cos((particle.lat * Math.PI) / 180))

    particle.lng += totalU * this.config.timeStep * lngPerKm
    particle.lat += totalV * this.config.timeStep * latPerKm

    particle.age += this.config.timeStep
    particle.pm25 *= Math.exp(-this.config.decayRate * this.config.timeStep)
  }

  private randomWalk(): number {
    let u = 0, v = 0, s = 0
    while (s === 0 || s >= 1) {
      u = Math.random() * 2 - 1
      v = Math.random() * 2 - 1
      s = u * u + v * v
    }
    const mul = Math.sqrt(-2 * Math.log(s) / s)
    return u * mul
  }

  getParticles(): Particle[] {
    return [...this.particles]
  }

  getCurrentTime(): number {
    return this.currentTime
  }

  reset(): void {
    this.particles = []
    this.currentTime = 0
  }
}
