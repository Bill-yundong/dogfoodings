import type { ComputationPlugin, ExecutionContext, Particle, SimulationConfig, WeatherData } from '../types'
import { LagrangianSimulator } from '../core/LagrangianSimulation'

interface LagrangianInput {
  sources: Array<{ lat: number; lng: number; pm25: number; id: string }>
  weatherData: WeatherData[]
  config: SimulationConfig
  steps?: number
}

interface LagrangianOutput {
  particles: Particle[][]
  finalParticles: Particle[]
  totalTime: number
}

export const LagrangianPlugin: ComputationPlugin<LagrangianInput, LagrangianOutput> = {
  id: 'lagrangian-simulation',
  name: '拉格朗日粒子模拟',
  version: '1.0.0',
  description: '基于拉格朗日方法的大气颗粒物传输模拟',
  type: 'simulation',

  validate(input: LagrangianInput): boolean {
    if (!input.sources || input.sources.length === 0) {
      return false
    }
    if (!input.config) {
      return false
    }
    return true
  },

  async execute(input: LagrangianInput, context?: ExecutionContext): Promise<LagrangianOutput> {
    const simulator = new LagrangianSimulator(input.config)
    simulator.updateWindField(input.weatherData)
    simulator.initializeParticles(input.sources)

    const particleHistory: Particle[][] = []
    const steps = input.steps ?? 10

    for (let i = 0; i < steps; i++) {
      context?.progress?.(i, steps)
      context?.signal?.throwIfAborted()

      const particles = await simulator.step()
      particleHistory.push([...particles])
    }

    context?.progress?.(steps, steps)

    return {
      particles: particleHistory,
      finalParticles: simulator.getParticles(),
      totalTime: simulator.getCurrentTime()
    }
  }
}
