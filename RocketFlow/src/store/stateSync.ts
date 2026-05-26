import type { NormalizedParameter } from '@/types'

type ParamCallback = (value: number, timestamp: number) => void
type EventCallback = (data: any) => void

interface ParameterConfig {
  name: string
  unit: string
  min: number
  max: number
  modules: string[]
}

const PARAMETER_CONFIGS: Record<string, ParameterConfig> = {
  temperatureGradient: {
    name: '温度梯度',
    unit: 'K/m',
    min: 0,
    max: 50,
    modules: ['command', 'safety']
  },
  pressureDifference: {
    name: '压力差',
    unit: 'MPa',
    min: 0,
    max: 5,
    modules: ['command', 'safety']
  },
  waterHammerRisk: {
    name: '水锤风险',
    unit: '%',
    min: 0,
    max: 100,
    modules: ['safety', 'control']
  },
  oxygenFlowRate: {
    name: '氧加注速率',
    unit: 'kg/s',
    min: 0,
    max: 15,
    modules: ['control', 'command']
  },
  hydrogenFlowRate: {
    name: '氢加注速率',
    unit: 'kg/s',
    min: 0,
    max: 10,
    modules: ['control', 'command']
  },
  oxygenFillLevel: {
    name: '氧液位',
    unit: '%',
    min: 0,
    max: 100,
    modules: ['command', 'control']
  },
  hydrogenFillLevel: {
    name: '氢液位',
    unit: '%',
    min: 0,
    max: 100,
    modules: ['command', 'control']
  },
  oxygenTemperature: {
    name: '氧温度',
    unit: 'K',
    min: 80,
    max: 300,
    modules: ['command', 'safety']
  },
  hydrogenTemperature: {
    name: '氢温度',
    unit: 'K',
    min: 20,
    max: 300,
    modules: ['command', 'safety']
  },
  oxygenPressure: {
    name: '氧压力',
    unit: 'MPa',
    min: 0,
    max: 5,
    modules: ['command', 'safety']
  },
  hydrogenPressure: {
    name: '氢压力',
    unit: 'MPa',
    min: 0,
    max: 5,
    modules: ['command', 'safety']
  },
  healthIndex: {
    name: '系统健康度',
    unit: '%',
    min: 0,
    max: 100,
    modules: ['command', 'safety', 'control']
  }
}

class StateSynchronizer {
  private paramSubscriptions: Map<string, Set<ParamCallback>> = new Map()
  private eventSubscriptions: Map<string, Set<EventCallback>> = new Map()
  private currentValues: Map<string, number> = new Map()
  private registeredModules: Set<string> = new Set()
  
  registerModule(moduleId: string, params: string[]): void {
    this.registeredModules.add(moduleId)
    
    for (const param of params) {
      if (!this.paramSubscriptions.has(param)) {
        this.paramSubscriptions.set(param, new Set())
      }
    }
  }
  
  updateParam(paramName: string, value: number): void {
    const config = PARAMETER_CONFIGS[paramName]
    if (!config) return
    
    const normalized = (value - config.min) / (config.max - config.min)
    const clampedValue = Math.max(config.min, Math.min(config.max, value))
    
    this.currentValues.set(paramName, clampedValue)
    
    const callbacks = this.paramSubscriptions.get(paramName)
    if (callbacks) {
      const timestamp = Date.now()
      for (const callback of callbacks) {
        try {
          callback(clampedValue, timestamp)
        } catch (e) {
          console.error(`Error in param callback for ${paramName}:`, e)
        }
      }
    }
    
    this.broadcastEvent('paramUpdate', {
      paramName,
      value: clampedValue,
      normalized,
      timestamp: Date.now()
    })
  }
  
  subscribe(paramName: string, callback: ParamCallback): () => void {
    if (!this.paramSubscriptions.has(paramName)) {
      this.paramSubscriptions.set(paramName, new Set())
    }
    
    const callbacks = this.paramSubscriptions.get(paramName)!
    callbacks.add(callback)
    
    if (this.currentValues.has(paramName)) {
      callback(this.currentValues.get(paramName)!, Date.now())
    }
    
    return () => {
      callbacks.delete(callback)
    }
  }
  
  getParam(paramName: string): number {
    return this.currentValues.get(paramName) || 0
  }
  
  getNormalizedParam(paramName: string): NormalizedParameter | null {
    const config = PARAMETER_CONFIGS[paramName]
    const value = this.currentValues.get(paramName)
    
    if (!config || value === undefined) return null
    
    return {
      name: config.name,
      value,
      unit: config.unit,
      min: config.min,
      max: config.max,
      normalized: (value - config.min) / (config.max - config.min),
      modules: config.modules
    }
  }
  
  broadcastEvent(eventType: string, data: any): void {
    const callbacks = this.eventSubscriptions.get(eventType)
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data)
        } catch (e) {
          console.error(`Error in event callback for ${eventType}:`, e)
        }
      }
    }
    
    const allCallbacks = this.eventSubscriptions.get('*')
    if (allCallbacks) {
      for (const callback of allCallbacks) {
        try {
          callback({ eventType, ...data })
        } catch (e) {
          console.error(`Error in wildcard event callback:`, e)
        }
      }
    }
  }
  
  onEvent(eventType: string, callback: EventCallback): () => void {
    if (!this.eventSubscriptions.has(eventType)) {
      this.eventSubscriptions.set(eventType, new Set())
    }
    
    const callbacks = this.eventSubscriptions.get(eventType)!
    callbacks.add(callback)
    
    return () => {
      callbacks.delete(callback)
    }
  }
  
  getAvailableParams(): string[] {
    return Object.keys(PARAMETER_CONFIGS)
  }
  
  getParamConfig(paramName: string): ParameterConfig | null {
    return PARAMETER_CONFIGS[paramName] || null
  }
  
  getModuleParams(moduleId: string): string[] {
    return Object.entries(PARAMETER_CONFIGS)
      .filter(([_, config]) => config.modules.includes(moduleId))
      .map(([name]) => name)
  }
  
  getAllValues(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [key, value] of this.currentValues) {
      result[key] = value
    }
    return result
  }
  
  getAllNormalized(): NormalizedParameter[] {
    const result: NormalizedParameter[] = []
    for (const paramName of Object.keys(PARAMETER_CONFIGS)) {
      const normalized = this.getNormalizedParam(paramName)
      if (normalized) {
        result.push(normalized)
      }
    }
    return result
  }
  
  reset(): void {
    this.currentValues.clear()
    this.broadcastEvent('reset', { timestamp: Date.now() })
  }
  
  getRegisteredModules(): string[] {
    return Array.from(this.registeredModules)
  }
}

export const stateSync = new StateSynchronizer()
