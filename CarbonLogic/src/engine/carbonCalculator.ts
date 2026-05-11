import { CarbonRecordRepository } from '@/database/repository'
import type { CarbonRecord } from '@/types/carbon'

export interface EmissionCalculationInput {
  sourceId: string
  sourceName: string
  type: CarbonRecord['type']
  quantity: number
  unit: string
  department: string
  scope: 1 | 2 | 3
  factor?: number
}

export interface AggregationResult {
  totalEmissions: number
  byScope: Record<1 | 2 | 3, number>
  byType: Record<string, number>
  byDepartment: Record<string, number>
  trend: Array<{ date: string; emissions: number }>
}

class CarbonCalculator {
  private defaultFactors: Record<string, number> = {
    electricity: 0.5,
    natural_gas: 2.0,
    coal: 2.4,
    gasoline: 2.3,
    diesel: 2.7,
    transport_road: 0.2,
    transport_rail: 0.08,
    transport_sea: 0.05
  }

  async calculateAndRecord(input: EmissionCalculationInput): Promise<string> {
    const factor = input.factor || this.getDefaultFactor(input.type)
    const emissions = input.quantity * factor

    return CarbonRecordRepository.add({
      timestamp: new Date().toISOString(),
      type: input.type,
      sourceId: input.sourceId,
      sourceName: input.sourceName,
      quantity: input.quantity,
      unit: input.unit,
      emissions,
      scope: input.scope,
      department: input.department,
      status: 'pending',
      syncStatus: 'local'
    })
  }

  async bulkCalculateAndRecord(inputs: EmissionCalculationInput[]): Promise<string[]> {
    const records = inputs.map(input => {
      const factor = input.factor || this.getDefaultFactor(input.type)
      const emissions = input.quantity * factor

      return {
        timestamp: new Date().toISOString(),
        type: input.type,
        sourceId: input.sourceId,
        sourceName: input.sourceName,
        quantity: input.quantity,
        unit: input.unit,
        emissions,
        scope: input.scope,
        department: input.department,
        status: 'pending',
        syncStatus: 'local'
      }
    })

    return CarbonRecordRepository.bulkAdd(records)
  }

  private getDefaultFactor(type: string): number {
    return this.defaultFactors[type] || 1.0
  }

  async aggregateByTimeRange(start: Date, end: Date): Promise<AggregationResult> {
    const records = await CarbonRecordRepository.getByTimeRange(
      start.toISOString(),
      end.toISOString()
    )

    const result: AggregationResult = {
      totalEmissions: 0,
      byScope: { 1: 0, 2: 0, 3: 0 },
      byType: {},
      byDepartment: {},
      trend: []
    }

    const trendMap = new Map<string, number>()

    for (const record of records) {
      result.totalEmissions += record.emissions
      result.byScope[record.scope] += record.emissions

      result.byType[record.type] = (result.byType[record.type] || 0) + record.emissions
      result.byDepartment[record.department] = (result.byDepartment[record.department] || 0) + record.emissions

      const date = record.timestamp.split('T')[0]
      trendMap.set(date, (trendMap.get(date) || 0) + record.emissions)
    }

    result.trend = Array.from(trendMap.entries())
      .map(([date, emissions]) => ({ date, emissions }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return result
  }

  async calculateSupplyChainFootprint(nodes: Array<{ emissionIntensity: number; volume: number }>): Promise<number> {
    return nodes.reduce((total, node) => {
      return total + node.emissionIntensity * node.volume
    }, 0)
  }

  calculateAlignmentScore(
    actualEmissions: number,
    targetEmissions: number,
    timelineProgress: number
  ): number {
    const expectedEmissions = targetEmissions * timelineProgress
    const deviation = Math.abs(actualEmissions - expectedEmissions) / expectedEmissions
    return Math.max(0, 100 - deviation * 100)
  }

  generateForecast(
    historicalData: Array<{ date: string; emissions: number }>,
    months: number = 12
  ): Array<{ date: string; projectedEmissions: number }> {
    if (historicalData.length < 2) return []

    const totalEmissions = historicalData.reduce((sum, d) => sum + d.emissions, 0)
    const avgEmissions = totalEmissions / historicalData.length

    const xSum = historicalData.reduce((sum, _, i) => sum + i, 0)
    const ySum = historicalData.reduce((sum, d) => sum + d.emissions, 0)
    const xySum = historicalData.reduce((sum, d, i) => sum + i * d.emissions, 0)
    const x2Sum = historicalData.reduce((sum, _, i) => sum + i * i, 0)
    const n = historicalData.length

    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum) || 0

    const forecast: Array<{ date: string; projectedEmissions: number }> = []
    const lastDate = new Date(historicalData[historicalData.length - 1].date)

    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(lastDate)
      forecastDate.setMonth(forecastDate.getMonth() + i)
      const projected = avgEmissions + slope * (historicalData.length + i)
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        projectedEmissions: Math.max(0, projected)
      })
    }

    return forecast
  }
}

export const carbonCalculator = new CarbonCalculator()
