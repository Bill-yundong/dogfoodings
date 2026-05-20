import type {
  SemanticTag,
  MappingRule,
  FireControlSignal,
  CellData,
  ThermalRunawayPrediction
} from '@/types'
import { generateId } from './arrhenius'

export const BMS_TAGS: SemanticTag[] = [
  {
    id: 'bms_cell_temp',
    domain: 'bms',
    label: '电芯温度',
    unit: '°C',
    dataType: 'number',
    thresholds: [
      { min: 0, max: 45, level: 'normal' },
      { min: 45, max: 60, level: 'warning' },
      { min: 60, level: 'critical' }
    ]
  },
  {
    id: 'bms_cell_voltage',
    domain: 'bms',
    label: '电芯电压',
    unit: 'V',
    dataType: 'number',
    thresholds: [
      { min: 2.8, max: 3.8, level: 'normal' },
      { min: 3.8, max: 4.2, level: 'warning' },
      { min: 4.2, level: 'critical' }
    ]
  },
  {
    id: 'bms_pack_current',
    domain: 'bms',
    label: '电池包电流',
    unit: 'A',
    dataType: 'number',
    thresholds: [
      { min: -200, max: 200, level: 'normal' },
      { min: 200, max: 300, level: 'warning' },
      { min: 300, level: 'critical' }
    ]
  },
  {
    id: 'bms_soc',
    domain: 'bms',
    label: 'SOC',
    unit: '%',
    dataType: 'number',
    thresholds: [
      { min: 20, max: 80, level: 'normal' },
      { min: 10, max: 20, level: 'warning' },
      { max: 10, level: 'critical' }
    ]
  },
  {
    id: 'bms_thermal_runaway_prediction',
    domain: 'bms',
    label: '热失控预测',
    dataType: 'string',
    thresholds: [
      { level: 'normal' },
      { level: 'warning' },
      { level: 'critical' }
    ]
  }
]

export const FIRE_TAGS: SemanticTag[] = [
  {
    id: 'fire_smoke_detector',
    domain: 'fire',
    label: '烟雾探测器',
    dataType: 'boolean',
    thresholds: [
      { level: 'normal' },
      { level: 'critical' }
    ]
  },
  {
    id: 'fire_temperature_sensor',
    domain: 'fire',
    label: '消防温度传感器',
    unit: '°C',
    dataType: 'number',
    thresholds: [
      { max: 57, level: 'normal' },
      { min: 57, max: 70, level: 'warning' },
      { min: 70, level: 'critical' }
    ]
  },
  {
    id: 'fire_gas_detector',
    domain: 'fire',
    label: '可燃气体探测器',
    unit: '%LEL',
    dataType: 'number',
    thresholds: [
      { max: 10, level: 'normal' },
      { min: 10, max: 25, level: 'warning' },
      { min: 25, level: 'critical' }
    ]
  },
  {
    id: 'fire_extinguisher_status',
    domain: 'fire',
    label: '灭火装置状态',
    dataType: 'enum',
    thresholds: [
      { level: 'normal' },
      { level: 'warning' },
      { level: 'critical' }
    ]
  },
  {
    id: 'fire_fan_status',
    domain: 'fire',
    label: '排风扇状态',
    dataType: 'boolean',
    thresholds: [
      { level: 'normal' },
      { level: 'warning' }
    ]
  },
  {
    id: 'fire_emergency_power_off',
    domain: 'fire',
    label: '紧急断电',
    dataType: 'boolean',
    thresholds: [
      { level: 'normal' },
      { level: 'critical' }
    ]
  }
]

export const DEFAULT_MAPPING_RULES: MappingRule[] = [
  {
    id: 'rule_001',
    source: 'bms_cell_temp',
    target: 'fire_temperature_sensor',
    transformType: 'direct',
    enabled: true,
    description: '电芯温度直接映射到消防温度传感器'
  },
  {
    id: 'rule_002',
    source: 'bms_thermal_runaway_prediction',
    target: 'fire_extinguisher_status',
    transformType: 'threshold',
    transformConfig: {
      thresholds: [
        { value: 'high', action: 'standby' },
        { value: 'extreme', action: 'activate' }
      ]
    },
    enabled: true,
    description: '热失控预测高风险时启动灭火装置'
  },
  {
    id: 'rule_003',
    source: 'bms_cell_temp',
    target: 'fire_fan_status',
    transformType: 'threshold',
    transformConfig: {
      threshold: 50,
      aboveAction: true,
      belowAction: false
    },
    enabled: true,
    description: '电芯温度超过50°C时启动排风扇'
  },
  {
    id: 'rule_004',
    source: 'bms_thermal_runaway_prediction',
    target: 'fire_emergency_power_off',
    transformType: 'threshold',
    transformConfig: {
      thresholds: [
        { value: 'extreme', action: true }
      ]
    },
    enabled: true,
    description: '热失控预测极高风险时紧急断电'
  }
]

export function getThresholdLevel(value: number, thresholds: SemanticTag['thresholds']): 'normal' | 'warning' | 'critical' {
  if (!thresholds) return 'normal'

  for (const t of thresholds) {
    const inRange = 
      (t.min === undefined || value >= t.min) &&
      (t.max === undefined || value < t.max)
    if (inRange) {
      return t.level
    }
  }
  return 'normal'
}

export function transformValue(
  value: any,
  rule: MappingRule
): any {
  switch (rule.transformType) {
    case 'direct':
      return value

    case 'linear': {
      const config = rule.transformConfig || {}
      const slope = config.slope || 1
      const intercept = config.intercept || 0
      return value * slope + intercept
    }

    case 'threshold': {
      const config = rule.transformConfig || {}
      if (config.thresholds) {
        for (const t of config.thresholds) {
          if (value === t.value || (typeof value === 'number' && value >= t.value)) {
            return t.action
          }
        }
      }
      if (config.threshold !== undefined) {
        return value > config.threshold ? config.aboveAction : config.belowAction
      }
      return value
    }

    case 'custom':
      try {
        const fn = new Function('value', `return ${rule.transformConfig?.expression}`)
        return fn(value)
      } catch {
        return value
      }

    default:
      return value
  }
}

export function evaluateCondition(
  value: any,
  conditionStr?: string
): boolean {
  if (!conditionStr) return true
  try {
    const fn = new Function('value', `return ${conditionStr}`)
    return fn(value)
  } catch {
    return true
  }
}

export function generateFireControlSignals(
  cellData: CellData[],
  predictions: ThermalRunawayPrediction[],
  rules: MappingRule[]
): FireControlSignal[] {
  const signals: FireControlSignal[] = []

  const activeRules = rules.filter(r => r.enabled)

  const maxTemp = Math.max(...cellData.map(c => c.temperature))
  const highestRisk = predictions.reduce((highest, p) => {
    const priority = { low: 0, medium: 1, high: 2, extreme: 3 }
    return priority[p.riskLevel] > priority[highest] ? p.riskLevel : highest
  }, 'low' as ThermalRunawayPrediction['riskLevel'])

  for (const rule of activeRules) {
    let sourceValue: any
    let signalLevel: FireControlSignal['level'] = 'info'

    if (rule.source === 'bms_cell_temp') {
      sourceValue = maxTemp
      const bmsTag = BMS_TAGS.find(t => t.id === rule.source)
      if (bmsTag?.thresholds) {
        const level = getThresholdLevel(maxTemp, bmsTag.thresholds)
        signalLevel = level === 'normal' ? 'info' : level
      }
    } else if (rule.source === 'bms_thermal_runaway_prediction') {
      sourceValue = highestRisk
      signalLevel = highestRisk === 'low' ? 'info' : highestRisk === 'medium' ? 'warning' : 'critical'
    }

    if (evaluateCondition(sourceValue, rule.condition)) {
      const transformedValue = transformValue(sourceValue, rule)
      if (transformedValue !== undefined && transformedValue !== false && transformedValue !== null) {
        signals.push({
          id: generateId(),
          target: rule.target,
          action: typeof transformedValue === 'boolean' ? (transformedValue ? 'activate' : 'deactivate') : 'set',
          value: transformedValue,
          level: signalLevel,
          timestamp: Date.now()
        })
      }
    }
  }

  return signals
}

export function getFireTagLabel(tagId: string): string {
  const tag = FIRE_TAGS.find(t => t.id === tagId)
  return tag?.label || tagId
}

export function getBmsTagLabel(tagId: string): string {
  const tag = BMS_TAGS.find(t => t.id === tagId)
  return tag?.label || tagId
}
