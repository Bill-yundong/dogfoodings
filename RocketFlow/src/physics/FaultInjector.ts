import type { FaultConfig, FaultType, ActiveFault, SimulationState, EventSeverity } from '@/types'
import { FAULT_TEMPLATES } from '@/types'
import { clamp } from '@/utils/math'

interface FaultEffect {
  oxygenFlowMultiplier: number
  hydrogenFlowMultiplier: number
  oxygenPressureOffset: number
  hydrogenPressureOffset: number
  oxygenTempOffset: number
  hydrogenTempOffset: number
  oxygenFillRateMultiplier: number
  hydrogenFillRateMultiplier: number
  sensorNoise: number
}

const ZERO_EFFECT: FaultEffect = {
  oxygenFlowMultiplier: 1,
  hydrogenFlowMultiplier: 1,
  oxygenPressureOffset: 0,
  hydrogenPressureOffset: 0,
  oxygenTempOffset: 0,
  hydrogenTempOffset: 0,
  oxygenFillRateMultiplier: 1,
  hydrogenFillRateMultiplier: 1,
  sensorNoise: 0
}

export class FaultInjector {
  private activeFaults: ActiveFault[] = []
  private faultHistory: ActiveFault[] = []
  private lastFaultCheck: number = 0
  private faultCheckInterval: number = 5000
  private globalProbabilityMultiplier: number = 1

  constructor() {}

  setProbabilityMultiplier(multiplier: number): void {
    this.globalProbabilityMultiplier = clamp(multiplier, 0, 5)
  }

  injectFault(faultType: FaultType, targetLine?: 'OXYGEN' | 'HYDROGEN' | 'BOTH'): ActiveFault {
    const template = FAULT_TEMPLATES[faultType]
    const config: FaultConfig = {
      ...template,
      targetLine: targetLine || template.targetLine,
      startTime: Date.now()
    }
    
    const fault: ActiveFault = {
      id: `fault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      config,
      startTime: Date.now(),
      endTime: Date.now() + config.duration,
      isActive: true,
      triggered: true
    }
    
    this.activeFaults.push(fault)
    this.faultHistory.push(fault)
    
    return fault
  }

  triggerRandomFault(_phase: string, globalProbability: number = 0.3): ActiveFault | null {
    const now = Date.now()
    if (now - this.lastFaultCheck < this.faultCheckInterval) return null
    this.lastFaultCheck = now

    const baseProb = globalProbability * this.globalProbabilityMultiplier
    if (Math.random() > baseProb) return null

    const faultTypes = Object.keys(FAULT_TEMPLATES) as FaultType[]
    const eligibleFaults = faultTypes.filter(type => {
      const template = FAULT_TEMPLATES[type]
      const phaseProb = template.probability * baseProb
      return Math.random() < phaseProb
    })

    if (eligibleFaults.length === 0) return null

    const selectedType = eligibleFaults[Math.floor(Math.random() * eligibleFaults.length)]
    return this.injectFault(selectedType)
  }

  update(_dt: number, _state: SimulationState): { effects: FaultEffect; events: Array<{ type: string; severity: EventSeverity; description: string }> } {
    const now = Date.now()
    const events: Array<{ type: string; severity: EventSeverity; description: string }> = []
    
    this.activeFaults = this.activeFaults.filter(fault => {
      if (!fault.isActive) return false
      
      if (now >= fault.endTime) {
        events.push({
          type: `FAULT_RESOLVED`,
          severity: 'INFO',
          description: `${fault.config.name} 已恢复`
        })
        return false
      }
      
      if (!fault.triggered && now >= fault.startTime) {
        fault.triggered = true
        events.push({
          type: `FAULT_${fault.config.type}`,
          severity: fault.config.severity,
          description: `${fault.config.name}: ${fault.config.description}`
        })
      }
      
      return true
    })

    return {
      effects: this.calculateEffects(now),
      events
    }
  }

  private calculateEffects(now: number): FaultEffect {
    if (this.activeFaults.length === 0) {
      return { ...ZERO_EFFECT }
    }

    const totalEffect: FaultEffect = { ...ZERO_EFFECT }
    let faultCount = 0

    for (const fault of this.activeFaults) {
      if (!fault.triggered) continue
      
      const elapsed = now - fault.startTime
      const duration = fault.config.duration
      const progress = Math.min(elapsed / duration, 1)
      
      const intensityCurve = this.getIntensityCurve(progress) * fault.config.intensity
      const target = fault.config.targetLine
      
      faultCount++

      switch (fault.config.type) {
        case 'WATER_HAMMER':
          const hammerPressure = Math.sin(progress * Math.PI * 8) * 0.5 * intensityCurve
          if (target === 'OXYGEN' || target === 'BOTH') {
            totalEffect.oxygenPressureOffset += hammerPressure
          }
          if (target === 'HYDROGEN' || target === 'BOTH') {
            totalEffect.hydrogenPressureOffset += hammerPressure
          }
          break

        case 'OVER_TEMPERATURE':
          const tempRise = intensityCurve * 30
          if (target === 'OXYGEN' || target === 'BOTH') {
            totalEffect.oxygenTempOffset += tempRise
          }
          if (target === 'HYDROGEN' || target === 'BOTH') {
            totalEffect.hydrogenTempOffset += tempRise * 0.3
          }
          break

        case 'OVER_PRESSURE':
          const pressureRise = intensityCurve * 0.3
          if (target === 'OXYGEN' || target === 'BOTH') {
            totalEffect.oxygenPressureOffset += pressureRise
          }
          if (target === 'HYDROGEN' || target === 'BOTH') {
            totalEffect.hydrogenPressureOffset += pressureRise
          }
          break

        case 'LEAKAGE':
          const leakageFactor = 1 - intensityCurve * 0.4
          if (target === 'OXYGEN' || target === 'BOTH') {
            totalEffect.oxygenFlowMultiplier *= leakageFactor
            totalEffect.oxygenFillRateMultiplier *= leakageFactor
          }
          if (target === 'HYDROGEN' || target === 'BOTH') {
            totalEffect.hydrogenFlowMultiplier *= leakageFactor
            totalEffect.hydrogenFillRateMultiplier *= leakageFactor
          }
          break

        case 'VALVE_STUCK':
          const valveFactor = 1 - intensityCurve * 0.6
          if (target === 'OXYGEN' || target === 'BOTH') {
            totalEffect.oxygenFlowMultiplier *= valveFactor
          }
          if (target === 'HYDROGEN' || target === 'BOTH') {
            totalEffect.hydrogenFlowMultiplier *= valveFactor
          }
          break

        case 'PUMP_FAILURE':
          const pumpFactor = 1 - intensityCurve * 0.8
          if (target === 'OXYGEN' || target === 'BOTH') {
            totalEffect.oxygenFlowMultiplier *= pumpFactor
            totalEffect.oxygenFillRateMultiplier *= pumpFactor
          }
          if (target === 'HYDROGEN' || target === 'BOTH') {
            totalEffect.hydrogenFlowMultiplier *= pumpFactor
            totalEffect.hydrogenFillRateMultiplier *= pumpFactor
          }
          break

        case 'SENSOR_FAILURE':
          totalEffect.sensorNoise += intensityCurve * 0.2
          break
      }
    }

    if (faultCount > 0) {
      totalEffect.oxygenFlowMultiplier = clamp(totalEffect.oxygenFlowMultiplier, 0, 2)
      totalEffect.hydrogenFlowMultiplier = clamp(totalEffect.hydrogenFlowMultiplier, 0, 2)
      totalEffect.oxygenFillRateMultiplier = clamp(totalEffect.oxygenFillRateMultiplier, 0, 2)
      totalEffect.hydrogenFillRateMultiplier = clamp(totalEffect.hydrogenFillRateMultiplier, 0, 2)
    }

    return totalEffect
  }

  private getIntensityCurve(progress: number): number {
    if (progress < 0.1) {
      return progress / 0.1
    } else if (progress > 0.9) {
      return (1 - progress) / 0.1
    }
    return 1
  }

  getActiveFaults(): ActiveFault[] {
    return [...this.activeFaults]
  }

  getFaultHistory(): ActiveFault[] {
    return [...this.faultHistory]
  }

  clearFault(faultId: string): boolean {
    const index = this.activeFaults.findIndex(f => f.id === faultId)
    if (index >= 0) {
      this.activeFaults[index].isActive = false
      return true
    }
    return false
  }

  clearAllFaults(): void {
    this.activeFaults.forEach(f => f.isActive = false)
    this.activeFaults = []
  }

  reset(): void {
    this.activeFaults = []
    this.faultHistory = []
    this.lastFaultCheck = 0
    this.globalProbabilityMultiplier = 1
  }

  applySensorNoise(value: number, noiseLevel: number): number {
    if (noiseLevel === 0) return value
    const noise = (Math.random() - 0.5) * 2 * noiseLevel * value
    return value + noise
  }
}

export const faultInjector = new FaultInjector()
