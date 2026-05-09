import type { Station, PassengerFlow, CongestionLevel } from '@/types'

export const mockStations: Station[] = [
  {
    id: 'ST001',
    name: '人民广场站',
    lineId: 'LINE_01',
    maxCapacity: 8000,
    platformCount: 4,
    entranceCount: 6,
    exitCount: 6
  },
  {
    id: 'ST002',
    name: '南京西路站',
    lineId: 'LINE_01',
    maxCapacity: 6000,
    platformCount: 3,
    entranceCount: 4,
    exitCount: 4
  },
  {
    id: 'ST003',
    name: '徐家汇站',
    lineId: 'LINE_01',
    maxCapacity: 10000,
    platformCount: 5,
    entranceCount: 8,
    exitCount: 8
  },
  {
    id: 'ST004',
    name: '静安寺站',
    lineId: 'LINE_02',
    maxCapacity: 7000,
    platformCount: 3,
    entranceCount: 5,
    exitCount: 5
  },
  {
    id: 'ST005',
    name: '陆家嘴站',
    lineId: 'LINE_02',
    maxCapacity: 9000,
    platformCount: 4,
    entranceCount: 7,
    exitCount: 7
  }
]

function determineCongestionLevel(density: number): CongestionLevel {
  if (density < 0.4) return 'low'
  if (density < 0.6) return 'medium'
  if (density < 0.85) return 'high'
  return 'critical'
}

export function generatePassengerFlow(station: Station, baseDensity?: number): PassengerFlow {
  const density = baseDensity ?? Math.random()
  const congestionLevel = determineCongestionLevel(density)
  
  const baseEntryRate = station.entranceCount * 0.8
  const baseExitRate = station.exitCount * 0.7
  
  const entryRateVariation = (Math.random() - 0.3) * 0.5
  const exitRateVariation = (Math.random() - 0.5) * 0.4
  
  const entryRate = baseEntryRate * (1 + entryRateVariation) * (density > 0.6 ? 1.2 : 1)
  const exitRate = baseExitRate * (1 + exitRateVariation)
  const transferRate = Math.random() * 0.5 * baseEntryRate
  
  const currentCount = Math.floor(station.maxCapacity * density * (0.8 + Math.random() * 0.4))
  const platformDensity = density * (0.7 + Math.random() * 0.6)

  return {
    stationId: station.id,
    timestamp: Date.now(),
    currentCount,
    entryRate,
    exitRate,
    transferRate,
    platformDensity,
    congestionLevel
  }
}

export function updatePassengerFlow(
  prevFlow: PassengerFlow, 
  station: Station,
  elapsedSeconds: number = 5
): PassengerFlow {
  const densityChange = (Math.random() - 0.45) * 0.02 * elapsedSeconds
  let newDensity = Math.max(0.1, Math.min(0.98, prevFlow.platformDensity + densityChange))
  
  const congestionLevel = determineCongestionLevel(newDensity)
  
  const rateMultiplier = congestionLevel === 'critical' ? 1.5 : 
                         congestionLevel === 'high' ? 1.2 : 1
  
  const entryRateVariation = (Math.random() - 0.4) * 0.3
  const exitRateVariation = (Math.random() - 0.5) * 0.25
  
  const newEntryRate = prevFlow.entryRate * (1 + entryRateVariation) * rateMultiplier
  const newExitRate = prevFlow.exitRate * (1 + exitRateVariation)
  const newTransferRate = prevFlow.transferRate * (0.8 + Math.random() * 0.4)
  
  const netChange = (newEntryRate + newTransferRate - newExitRate) * elapsedSeconds
  const newCurrentCount = Math.max(0, Math.min(
    station.maxCapacity * 1.1,
    prevFlow.currentCount + Math.floor(netChange)
  ))
  
  const newPlatformDensity = Math.max(0.1, Math.min(1.0, 
    newCurrentCount / station.maxCapacity
  ))

  return {
    stationId: station.id,
    timestamp: Date.now(),
    currentCount: newCurrentCount,
    entryRate: newEntryRate,
    exitRate: newExitRate,
    transferRate: newTransferRate,
    platformDensity: newPlatformDensity,
    congestionLevel: determineCongestionLevel(newPlatformDensity)
  }
}
