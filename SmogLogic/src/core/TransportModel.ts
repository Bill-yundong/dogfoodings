import type { InterpolationResult, Particle, SimulationConfig, TraceResult } from '../types'
import { pluginRegistry } from './PluginRegistry'
import { KrigingPlugin } from '../plugins/KrigingPlugin'
import { LagrangianPlugin } from '../plugins/LagrangianPlugin'

export class PM25TransportModel {
  private initialized = false

  async init(): Promise<void> {
    if (!this.initialized) {
      pluginRegistry.register(KrigingPlugin)
      pluginRegistry.register(LagrangianPlugin)
      this.initialized = true
    }
  }

  async runInterpolation(
    stations: Parameters<typeof KrigingPlugin.execute>[0]['stations'],
    bounds: Parameters<typeof KrigingPlugin.execute>[0]['bounds'],
    resolution?: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<InterpolationResult> {
    return pluginRegistry.execute(
      'kriging-interpolation',
      { stations, bounds, resolution },
      { progress: onProgress }
    )
  }

  async runSimulation(
    sources: Array<{ lat: number; lng: number; pm25: number; id: string }>,
    weatherData: Parameters<typeof LagrangianPlugin.execute>[0]['weatherData'],
    config: SimulationConfig,
    steps?: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ particles: Particle[][]; finalParticles: Particle[]; totalTime: number }> {
    return pluginRegistry.execute(
      'lagrangian-simulation',
      { sources, weatherData, config, steps },
      { progress: onProgress }
    )
  }

  async traceSource(
    particles: Particle[],
    targetLat: number,
    targetLng: number,
    radius: number = 0.1
  ): Promise<TraceResult[]> {
    const nearbyParticles = particles.filter(p => {
      const dx = p.lng - targetLng
      const dy = p.lat - targetLat
      return Math.sqrt(dx * dx + dy * dy) < radius
    })

    const sourceContributions: Map<string, { total: number; count: number; path: Particle[] }> = new Map()

    for (const particle of nearbyParticles) {
      const existing = sourceContributions.get(particle.sourceId)
      if (existing) {
        existing.total += particle.pm25
        existing.count++
        existing.path.push(particle)
      } else {
        sourceContributions.set(particle.sourceId, {
          total: particle.pm25,
          count: 1,
          path: [particle]
        })
      }
    }

    const totalPM25 = Array.from(sourceContributions.values()).reduce((sum, v) => sum + v.total, 0)

    return Array.from(sourceContributions.entries())
      .map(([sourceId, data]) => ({
        sourceId,
        contribution: totalPM25 > 0 ? data.total / totalPM25 : 0,
        path: data.path
          .sort((a, b) => a.age - b.age)
          .map(p => ({ lat: p.lat, lng: p.lng })),
        startTime: data.path.length > 0 ? Date.now() - Math.max(...data.path.map(p => p.age)) * 3600000 : Date.now(),
        endTime: Date.now()
      }))
      .sort((a, b) => b.contribution - a.contribution)
  }

  calculateRegionalContribution(
    particles: Particle[],
    regions: Array<{ id: string; minLat: number; maxLat: number; minLng: number; maxLng: number; name: string }>
  ): Array<{ regionId: string; regionName: string; contribution: number; pm25: number }> {
    const regionPM25: Map<string, { pm25: number; name: string }> = new Map()

    for (const region of regions) {
      const inRegion = particles.filter(p =>
        p.lat >= region.minLat && p.lat <= region.maxLat &&
        p.lng >= region.minLng && p.lng <= region.maxLng
      )
      const totalPM25 = inRegion.reduce((sum, p) => sum + p.pm25, 0)
      regionPM25.set(region.id, { pm25: totalPM25, name: region.name })
    }

    const total = Array.from(regionPM25.values()).reduce((sum, v) => sum + v.pm25, 0)

    return Array.from(regionPM25.entries()).map(([regionId, data]) => ({
      regionId,
      regionName: data.name,
      contribution: total > 0 ? data.pm25 / total : 0,
      pm25: data.pm25
    }))
  }
}

export const transportModel = new PM25TransportModel()
