import type { SolverConfig, SolverOutput } from '@/types'
import { FLUID_PROPERTIES } from '@/types'
import { clamp, gaussianNoise, calculateGradient, maxAbs, cflCondition } from '@/utils/math'

export class TwoPhaseSolver {
  private config: SolverConfig | null = null
  private isRunning: boolean = false
  private callbacks: ((data: SolverOutput) => void)[] = []
  private gridPoints: number = 100
  private dx: number = 0
  
  private pressure: Float32Array = new Float32Array()
  private temperature: Float32Array = new Float32Array()
  private velocity: Float32Array = new Float32Array()
  private voidFraction: Float32Array = new Float32Array()
  
  private lastUpdate: number = 0
  private simulationTime: number = 0
  
  configure(config: SolverConfig): void {
    this.config = config
    this.gridPoints = Math.floor(config.pipeLength / 0.5)
    this.dx = config.pipeLength / this.gridPoints
    
    this.pressure = new Float32Array(this.gridPoints)
    this.temperature = new Float32Array(this.gridPoints)
    this.velocity = new Float32Array(this.gridPoints)
    this.voidFraction = new Float32Array(this.gridPoints)
    
    for (let i = 0; i < this.gridPoints; i++) {
      this.pressure[i] = config.initialPressure * 1e6
      this.temperature[i] = config.initialTemperature
      this.velocity[i] = 0
      this.voidFraction[i] = 0
    }
    
    this.simulationTime = 0
  }
  
  async start(): Promise<void> {
    if (!this.config) {
      throw new Error('Solver not configured')
    }
    
    this.isRunning = true
    this.lastUpdate = performance.now()
    this.runLoop()
  }
  
  stop(): void {
    this.isRunning = false
  }
  
  onData(callback: (data: SolverOutput) => void): void {
    this.callbacks.push(callback)
  }
  
  getCurrentState(): SolverOutput {
    const pressureGrad = calculateGradient(this.pressure, this.dx)
    const waterHammerRisk = this.calculateWaterHammerRisk(pressureGrad)
    
    return {
      timestamp: performance.now(),
      pressureProfile: new Float32Array(this.pressure.map(p => p / 1e6)),
      temperatureProfile: new Float32Array(this.temperature),
      velocityProfile: new Float32Array(this.velocity),
      voidFractionProfile: new Float32Array(this.voidFraction),
      waterHammerRisk: waterHammerRisk,
      maxPressureGradient: maxAbs(pressureGrad) / 1e6
    }
  }
  
  private runLoop(): void {
    if (!this.isRunning || !this.config) return
    
    const now = performance.now()
    const dtReal = (now - this.lastUpdate) / 1000
    this.lastUpdate = now
    
    const props = FLUID_PROPERTIES[this.config.fluidType]
    const dt = Math.min(dtReal, cflCondition(Math.max(...this.velocity), this.dx, props.soundSpeed))
    
    this.solveContinuityEquation(dt)
    this.solveMomentumEquation(dt)
    this.solveEnergyEquation(dt)
    this.updateVoidFraction()
    this.addNumericalNoise()
    this.applyBoundaryConditions()
    
    this.simulationTime += dt
    
    const output = this.getCurrentState()
    for (const callback of this.callbacks) {
      callback(output)
    }
    
    setTimeout(() => this.runLoop(), 10)
  }
  
  private solveContinuityEquation(dt: number): void {
    if (!this.config) return
    
    const props = FLUID_PROPERTIES[this.config.fluidType]
    const rho = props.density
    const newPressure = new Float32Array(this.pressure)
    
    for (let i = 1; i < this.gridPoints - 1; i++) {
      const alpha = 1 - this.voidFraction[i]
      const dRhoU = (rho * alpha * this.velocity[i + 1] - rho * alpha * this.velocity[i - 1]) / (2 * this.dx)
      const dp = -(props.soundSpeed ** 2) * dRhoU * dt
      newPressure[i] += dp
    }
    
    this.pressure = newPressure
  }
  
  private solveMomentumEquation(dt: number): void {
    if (!this.config) return
    
    const props = FLUID_PROPERTIES[this.config.fluidType]
    const rho = props.density
    const newVelocity = new Float32Array(this.velocity)
    
    for (let i = 1; i < this.gridPoints - 1; i++) {
      const alpha = 1 - this.voidFraction[i]
      const dpdx = (this.pressure[i + 1] - this.pressure[i - 1]) / (2 * this.dx)
      const dudx = (this.velocity[i + 1] - this.velocity[i - 1]) / (2 * this.dx)
      
      const convection = this.velocity[i] * dudx
      const pressureTerm = dpdx / (rho * alpha)
      const viscosity = props.viscosity / (rho * alpha) * 
        (this.velocity[i + 1] - 2 * this.velocity[i] + this.velocity[i - 1]) / (this.dx ** 2)
      const gravity = 9.81
      
      const du = (-convection - pressureTerm + viscosity + gravity) * dt
      newVelocity[i] += du
      
      newVelocity[i] = clamp(newVelocity[i], -50, 50)
    }
    
    this.velocity = newVelocity
  }
  
  private solveEnergyEquation(dt: number): void {
    if (!this.config) return
    
    const props = FLUID_PROPERTIES[this.config.fluidType]
    const rho = props.density
    const cp = props.specificHeat
    const k = props.thermalConductivity
    const newTemperature = new Float32Array(this.temperature)
    
    for (let i = 1; i < this.gridPoints - 1; i++) {
      const alpha = 1 - this.voidFraction[i]
      const dTdx = (this.temperature[i + 1] - this.temperature[i - 1]) / (2 * this.dx)
      const d2Tdx2 = (this.temperature[i + 1] - 2 * this.temperature[i] + this.temperature[i - 1]) / (this.dx ** 2)
      const dpdt = (this.pressure[i] - this.pressure[i]) / dt
      
      const convection = this.velocity[i] * dTdx
      const diffusion = k / (rho * cp * alpha) * d2Tdx2
      const pressureWork = dpdt / (rho * cp * alpha)
      
      const dT = (-convection + diffusion + pressureWork) * dt
      newTemperature[i] += dT
      
      newTemperature[i] = clamp(newTemperature[i], props.boilingPoint * 0.8, 300)
    }
    
    this.temperature = newTemperature
  }
  
  private updateVoidFraction(): void {
    if (!this.config) return
    
    const props = FLUID_PROPERTIES[this.config.fluidType]
    const newVoidFraction = new Float32Array(this.voidFraction)
    
    for (let i = 0; i < this.gridPoints; i++) {
      const saturationPressure = this.calculateSaturationPressure(this.temperature[i], props.boilingPoint)
      if (this.pressure[i] < saturationPressure) {
        newVoidFraction[i] = Math.min(0.8, newVoidFraction[i] + 0.01)
      } else {
        newVoidFraction[i] = Math.max(0, newVoidFraction[i] - 0.005)
      }
    }
    
    this.voidFraction = newVoidFraction
  }
  
  private calculateSaturationPressure(T: number, Tb: number): number {
    const Tr = T / Tb
    const lnPs = 10.6 * (1 - 1 / Tr)
    return 0.101325e6 * Math.exp(lnPs)
  }
  
  private addNumericalNoise(): void {
    const noiseAmp = 0.0001
    
    for (let i = 0; i < this.gridPoints; i++) {
      this.pressure[i] += gaussianNoise(0, noiseAmp * this.pressure[i])
      this.temperature[i] += gaussianNoise(0, noiseAmp * this.temperature[i])
      this.velocity[i] += gaussianNoise(0, noiseAmp * Math.abs(this.velocity[i]))
    }
  }
  
  private applyBoundaryConditions(): void {
    if (!this.config) return
    
    const props = FLUID_PROPERTIES[this.config.fluidType]
    const area = Math.PI * (this.config.pipeDiameter / 2) ** 2
    const inletVelocity = this.config.massFlowRate / (props.density * area)
    
    this.pressure[0] = this.config.initialPressure * 1e6
    this.temperature[0] = this.config.initialTemperature
    this.velocity[0] = inletVelocity
    this.voidFraction[0] = 0
    
    const last = this.gridPoints - 1
    this.pressure[last] = this.pressure[last - 1]
    this.temperature[last] = this.temperature[last - 1]
    this.velocity[last] = this.velocity[last - 1]
    this.voidFraction[last] = this.voidFraction[last - 1]
  }
  
  private calculateWaterHammerRisk(pressureGrad: Float32Array): number {
    if (!this.config) return 0
    
    const ratedPressure = this.config.initialPressure * 1e6
    const maxGrad = maxAbs(pressureGrad)
    const risk = (maxGrad * this.dx / ratedPressure) * 100
    
    const maxVel = Math.max(...this.velocity)
    const velFactor = clamp(maxVel / 20, 0, 1)
    
    return clamp(risk * (1 + velFactor * 0.5), 0, 100)
  }
}
