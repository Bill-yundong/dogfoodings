import type { SensorData, IcingPrediction, ThermalConvectionParams } from '../types'

export class IcingPredictionService {
  private static instance: IcingPredictionService
  private defaultParams: ThermalConvectionParams = {
    thermalConductivity: 0.026,
    convectionCoefficient: 100,
    surfaceArea: 12.56,
    bladeThickness: 0.05
  }

  private constructor() {}

  public static getInstance(): IcingPredictionService {
    if (!IcingPredictionService.instance) {
      IcingPredictionService.instance = new IcingPredictionService()
    }
    return IcingPredictionService.instance
  }

  public async predictIcingMassAsync(
    sensorData: SensorData,
    params?: Partial<ThermalConvectionParams>
  ): Promise<IcingPrediction> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const prediction = this.calculateIcingMass(sensorData, params)
        resolve(prediction)
      }, 100)
    })
  }

  public calculateIcingMass(
    sensorData: SensorData,
    params?: Partial<ThermalConvectionParams>
  ): IcingPrediction {
    const mergedParams = { ...this.defaultParams, ...params }

    const { temperature, humidity, windSpeed, altitude } = sensorData

    if (temperature > 5 || humidity < 80) {
      return {
        timestamp: sensorData.timestamp,
        icingMass: 0,
        riskLevel: 'low',
        confidence: 0.95
      }
    }

    const heatTransferRate = this.calculateHeatTransferRate(
      temperature,
      windSpeed,
      mergedParams
    )

    const waterContent = this.calculateLiquidWaterContent(humidity, temperature, altitude)
    const collectionEfficiency = this.calculateCollectionEfficiency(windSpeed)

    const icingRate = this.calculateIcingRate(heatTransferRate, waterContent, collectionEfficiency)
    const predictedMass = icingRate * 3600

    const riskLevel = this.determineRiskLevel(predictedMass, temperature)
    const confidence = this.calculateConfidence(sensorData)

    return {
      timestamp: sensorData.timestamp,
      icingMass: Math.max(0, predictedMass),
      riskLevel,
      confidence
    }
  }

  private calculateHeatTransferRate(
    temperature: number,
    windSpeed: number,
    params: ThermalConvectionParams
  ): number {
    const deltaT = Math.abs(temperature - 0)
    const reynoldsNumber = this.calculateReynoldsNumber(windSpeed, params.bladeThickness)
    const nusseltNumber = 0.664 * Math.pow(reynoldsNumber, 0.5) * Math.pow(0.71, 0.33)

    const convectionHeatTransfer = nusseltNumber * params.thermalConductivity / params.bladeThickness
    const conductionHeatTransfer = params.thermalConductivity * params.surfaceArea * deltaT / params.bladeThickness

    return (convectionHeatTransfer * params.surfaceArea + conductionHeatTransfer) / 1000
  }

  private calculateReynoldsNumber(windSpeed: number, characteristicLength: number): number {
    const airKinematicViscosity = 1.516e-5
    return (windSpeed * characteristicLength) / airKinematicViscosity
  }

  private calculateLiquidWaterContent(
    humidity: number,
    temperature: number,
    altitude: number
  ): number {
    const saturationPressure = 611.21 * Math.exp((18.678 - temperature / 234.5) * (temperature / (257.14 + temperature)))
    const actualVaporPressure = saturationPressure * (humidity / 100)
    const pressureAtAltitude = 101325 * Math.exp(-0.00012 * altitude)

    const waterVaporDensity = (actualVaporPressure * 0.01801528) / (8.314 * (temperature + 273.15))
    const liquidWaterFraction = Math.max(0, (humidity - 95) / 5)

    return waterVaporDensity * liquidWaterFraction * (pressureAtAltitude / 101325)
  }

  private calculateCollectionEfficiency(windSpeed: number): number {
    const baseEfficiency = 0.6
    const windFactor = Math.min(1, windSpeed / 15)
    return baseEfficiency * (0.5 + 0.5 * windFactor)
  }

  private calculateIcingRate(
    heatTransferRate: number,
    waterContent: number,
    collectionEfficiency: number
  ): number {
    const latentHeatFusion = 334000
    const freezingFraction = Math.min(1, heatTransferRate / (waterContent * latentHeatFusion + 0.001))

    return waterContent * collectionEfficiency * freezingFraction
  }

  private determineRiskLevel(icingMass: number, temperature: number): IcingPrediction['riskLevel'] {
    if (icingMass < 0.5) return 'low'
    if (icingMass < 2.0) return 'medium'
    if (icingMass < 5.0) return 'high'
    return 'critical'
  }

  private calculateConfidence(sensorData: SensorData): number {
    let confidence = 0.85

    if (sensorData.temperature > -10 && sensorData.temperature < 2) {
      confidence += 0.05
    }
    if (sensorData.humidity > 85) {
      confidence += 0.05
    }
    if (sensorData.windSpeed > 5 && sensorData.windSpeed < 20) {
      confidence += 0.03
    }

    return Math.min(0.99, confidence)
  }

  public async batchPredict(sensorDataArray: SensorData[]): Promise<IcingPrediction[]> {
    const predictions: IcingPrediction[] = []

    for (const data of sensorDataArray) {
      const prediction = await this.predictIcingMassAsync(data)
      predictions.push(prediction)
    }

    return predictions
  }
}

export const icingPredictionService = IcingPredictionService.getInstance()
