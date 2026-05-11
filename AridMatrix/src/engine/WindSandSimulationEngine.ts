import type { Dune, VegetationZone, WeatherData, SimulationConfig } from '../types'
import { DuneMigrationModel } from '../models/DuneMigrationModel'

type SimulationStatus = 'idle' | 'running' | 'paused' | 'stopped'

export interface SimulationState {
  status: SimulationStatus
  currentTime: number
  dunes: Dune[]
  vegetationZones: VegetationZone[]
  weather: WeatherData
  config: SimulationConfig
  coverageRate: number
}

export class WindSandSimulationEngine {
  private state: SimulationState
  private duneModel: DuneMigrationModel
  private animationFrameId: number | null = null
  private lastTimestamp: number = 0
  private listeners: Set<(state: SimulationState) => void> = new Set()

  constructor(
    initialDunes: Dune[],
    initialVegetation: VegetationZone[],
    config: SimulationConfig
  ) {
    this.duneModel = new DuneMigrationModel()
    this.state = {
      status: 'idle',
      currentTime: 0,
      dunes: initialDunes,
      vegetationZones: initialVegetation,
      weather: {
        windSpeed: 8,
        windDirection: 45,
        precipitation: 0,
        temperature: 25
      },
      config,
      coverageRate: this.calculateOverallCoverage(initialVegetation)
    }
  }

  private calculateOverallCoverage(vegetationZones: VegetationZone[]): number {
    if (vegetationZones.length === 0) return 0
    const totalCoverage = vegetationZones.reduce((sum, z) => sum + z.coverage, 0)
    return Math.min(1, totalCoverage / vegetationZones.length)
  }

  async prestart(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.state.status = 'running'
        this.lastTimestamp = performance.now()
        this.scheduleUpdate()
        resolve()
      }, 100)
    })
  }

  private scheduleUpdate(): void {
    this.animationFrameId = requestAnimationFrame((timestamp) => this.update(timestamp))
  }

  private update(timestamp: number): void {
    if (this.state.status !== 'running') return

    const deltaTime = (timestamp - this.lastTimestamp) / 1000
    this.lastTimestamp = timestamp

    const timeStep = deltaTime * this.state.config.timeScale

    this.state = {
      ...this.state,
      currentTime: this.state.currentTime + timeStep,
      dunes: this.state.dunes.map(dune =>
        this.duneModel.updateDunePosition(
          dune,
          this.state.weather,
          this.state.vegetationZones,
          timeStep
        )
      ),
      vegetationZones: this.updateVegetationGrowth(timeStep),
      coverageRate: this.calculateOverallCoverage(this.state.vegetationZones)
    }

    this.notifyListeners()
    this.scheduleUpdate()
  }

  private updateVegetationGrowth(timeStep: number): VegetationZone[] {
    return this.state.vegetationZones.map(zone => {
      const growth = zone.growthRate * timeStep
      return {
        ...zone,
        coverage: Math.min(1, zone.coverage + growth)
      }
    })
  }

  pause(): void {
    this.state.status = 'paused'
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.notifyListeners()
  }

  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'running'
      this.lastTimestamp = performance.now()
      this.scheduleUpdate()
    }
  }

  stop(): void {
    this.state.status = 'stopped'
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.notifyListeners()
  }

  setWeather(weather: Partial<WeatherData>): void {
    this.state.weather = { ...this.state.weather, ...weather }
  }

  setConfig(config: Partial<SimulationConfig>): void {
    this.state.config = { ...this.state.config, ...config }
  }

  addVegetationZone(zone: VegetationZone): void {
    this.state.vegetationZones = [...this.state.vegetationZones, zone]
  }

  subscribe(listener: (state: SimulationState) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state))
  }

  getState(): SimulationState {
    return { ...this.state }
  }

  destroy(): void {
    this.stop()
    this.listeners.clear()
  }
}