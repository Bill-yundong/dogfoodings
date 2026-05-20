import type { ArrheniusParams, ThermalRunawayPrediction, CellData } from '@/types'

export const GAS_CONSTANT = 8.314

export const DEFAULT_ARRHENIUS_PARAMS: ArrheniusParams = {
  activationEnergy: 100000,
  preExponentialFactor: 1e10,
  gasConstant: GAS_CONSTANT,
  initialTemperature: 25,
  heatCapacity: 1000,
  thermalConductivity: 1.5,
  mass: 0.5,
  reactionHeat: 500000,
  volume: 0.001
}

export function calculateReactionRate(
  temperature: number,
  activationEnergy: number,
  preExponentialFactor: number,
  gasConstant: number = GAS_CONSTANT
): number {
  const kelvin = temperature + 273.15
  return preExponentialFactor * Math.exp(-activationEnergy / (gasConstant * kelvin))
}

export function calculateHeatGeneration(
  reactionRate: number,
  reactionHeat: number,
  volume: number
): number {
  return reactionRate * reactionHeat * volume
}

export function calculateTemperatureRise(
  heatGeneration: number,
  mass: number,
  heatCapacity: number,
  timeStep: number
): number {
  return (heatGeneration * timeStep) / (mass * heatCapacity)
}

export function calculateHeatDissipation(
  temperature: number,
  ambientTemperature: number,
  thermalConductivity: number,
  surfaceArea: number = 0.06
): number {
  return thermalConductivity * surfaceArea * (temperature - ambientTemperature)
}

export function simulateThermalRunaway(
  cell: CellData,
  params: ArrheniusParams,
  timeHorizon: number = 3600,
  timeStep: number = 1,
  ambientTemp: number = 25,
  criticalTemp: number = 180
): ThermalRunawayPrediction {
  const temperatureCurve: number[] = []
  const timePoints: number[] = []
  let currentTemp = cell.temperature
  let timeToRunaway = -1
  let reachedCritical = false

  for (let t = 0; t < timeHorizon; t += timeStep) {
    const reactionRate = calculateReactionRate(
      currentTemp,
      params.activationEnergy,
      params.preExponentialFactor,
      params.gasConstant
    )

    const heatGen = calculateHeatGeneration(reactionRate, params.reactionHeat, params.volume)
    const heatDiss = calculateHeatDissipation(currentTemp, ambientTemp, params.thermalConductivity)
    const netHeat = heatGen - heatDiss
    const tempRise = calculateTemperatureRise(netHeat, params.mass, params.heatCapacity, timeStep)

    currentTemp += tempRise

    temperatureCurve.push(currentTemp)
    timePoints.push(t)

    if (!reachedCritical && currentTemp >= criticalTemp) {
      timeToRunaway = t
      reachedCritical = true
    }

    if (currentTemp > 500) {
      break
    }
  }

  let riskLevel: ThermalRunawayPrediction['riskLevel'] = 'low'
  if (timeToRunaway === -1) {
    riskLevel = 'low'
  } else if (timeToRunaway > 1800) {
    riskLevel = 'medium'
  } else if (timeToRunaway > 600) {
    riskLevel = 'high'
  } else {
    riskLevel = 'extreme'
  }

  return {
    cellId: cell.id,
    timeToRunaway,
    temperatureCurve,
    timePoints,
    criticalTemperature: criticalTemp,
    riskLevel
  }
}

export function calculateThermalPropagation(
  sourceCell: CellData,
  targetCell: CellData,
  params: ArrheniusParams,
  distance: number = 0.02
): number {
  const sourceTemp = sourceCell.temperature
  const targetTemp = targetCell.temperature
  const area = 0.01
  const timeStep = 1

  const heatTransfer = params.thermalConductivity * area * (sourceTemp - targetTemp) * timeStep / distance
  const tempRise = heatTransfer / (params.mass * params.heatCapacity)

  return tempRise
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export function getTemperatureColor(temp: number): string {
  if (temp < 30) return '#00B42A'
  if (temp < 45) return '#165DFF'
  if (temp < 60) return '#FF7D00'
  if (temp < 80) return '#F53F3F'
  return '#722ED1'
}

export function getRiskLevelColor(level: ThermalRunawayPrediction['riskLevel']): string {
  switch (level) {
    case 'low': return '#00B42A'
    case 'medium': return '#FF7D00'
    case 'high': return '#F53F3F'
    case 'extreme': return '#722ED1'
  }
}

export function getRiskLevelText(level: ThermalRunawayPrediction['riskLevel']): string {
  switch (level) {
    case 'low': return '低风险'
    case 'medium': return '中风险'
    case 'high': return '高风险'
    case 'extreme': return '极高风险'
  }
}
