import type { SimulationParams, SimulationResult } from '../types'

export class SoluteTransportSolver {
  private params: SimulationParams
  private isRunning: boolean = false
  private abortController: AbortController | null = null

  constructor(params: SimulationParams) {
    this.params = params
  }

  updateParams(params: Partial<SimulationParams>) {
    this.params = { ...this.params, ...params }
  }

  async solve(): Promise<SimulationResult[]> {
    this.isRunning = true
    this.abortController = new AbortController()

    const results: SimulationResult[] = []
    const { timeStep, totalTime, diffusionCoefficient, advectionVelocity, retardationFactor, decayCoefficient, sourceConcentration, sourceDepth } = this.params

    const numSteps = Math.floor(totalTime / timeStep)
    const depths = this.generateDepths()
    let concentrations = this.initializeConcentrations(depths, sourceDepth, sourceConcentration)

    for (let step = 0; step < numSteps; step++) {
      if (this.abortController?.signal.aborted) {
        break
      }

      await this.sleep(10)

      concentrations = this.step(concentrations, depths, timeStep, diffusionCoefficient, advectionVelocity, retardationFactor, decayCoefficient)

      results.push({
        time: (step + 1) * timeStep,
        depths: [...depths],
        concentrations: [...concentrations],
        maxConcentration: Math.max(...concentrations),
        plumeFront: this.calculatePlumeFront(depths, concentrations)
      })
    }

    this.isRunning = false
    return results
  }

  private step(
    concentrations: number[],
    depths: number[],
    dt: number,
    D: number,
    v: number,
    R: number,
    lambda: number
  ): number[] {
    const n = concentrations.length
    const newConcentrations = new Array(n).fill(0)

    for (let i = 0; i < n; i++) {
      const dz = i > 0 ? depths[i] - depths[i - 1] : depths[1] - depths[0]

      let diffusion = 0
      if (i > 0 && i < n - 1) {
        diffusion = D * (concentrations[i + 1] - 2 * concentrations[i] + concentrations[i - 1]) / (dz * dz)
      }

      let advection = 0
      if (i > 0) {
        advection = -v * (concentrations[i] - concentrations[i - 1]) / dz
      }

      const decay = -lambda * concentrations[i]

      newConcentrations[i] = concentrations[i] + (dt / R) * (diffusion + advection + decay)
      newConcentrations[i] = Math.max(0, newConcentrations[i])
    }

    return newConcentrations
  }

  private generateDepths(): number[] {
    const depths: number[] = []
    const maxDepth = 3
    const numLayers = 50
    for (let i = 0; i < numLayers; i++) {
      depths.push((i / (numLayers - 1)) * maxDepth)
    }
    return depths
  }

  private initializeConcentrations(depths: number[], sourceDepth: number, sourceConcentration: number): number[] {
    return depths.map(depth => {
      const distance = Math.abs(depth - sourceDepth)
      if (distance < 0.1) {
        return sourceConcentration * Math.exp(-distance * distance / 0.01)
      }
      return 0
    })
  }

  private calculatePlumeFront(depths: number[], concentrations: number[]): number {
    const threshold = concentrations[0] * 0.01
    for (let i = depths.length - 1; i >= 0; i--) {
      if (concentrations[i] > threshold) {
        return depths[i]
      }
    }
    return 0
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  stop() {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.isRunning = false
  }

  getIsRunning(): boolean {
    return this.isRunning
  }
}

export function createDefaultSimulationParams(): SimulationParams {
  return {
    diffusionCoefficient: 0.0001,
    advectionVelocity: 0.0005,
    retardationFactor: 2.5,
    decayCoefficient: 0.0001,
    timeStep: 1,
    totalTime: 100,
    sourceConcentration: 100,
    sourceDepth: 0.5
  }
}
