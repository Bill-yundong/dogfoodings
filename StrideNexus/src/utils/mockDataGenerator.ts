import type {
  PressureData,
  PressurePoint,
  CadenceData,
  PostureData,
  Shoes,
  WearData,
  WearRegion,
  RunSession
} from '@/types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function generateFootPressurePoints(foot: 'left' | 'right'): PressurePoint[] {
  const points: PressurePoint[] = []
  const rows = 8
  const cols = 4
  const offsetX = foot === 'left' ? 0 : 5

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const basePressure = r < 2 ? randomInRange(0.3, 0.8) : 
                          r < 5 ? randomInRange(0.5, 1.0) :
                          randomInRange(0.2, 0.6)
      const noise = randomInRange(-0.1, 0.1)
      points.push({
        x: offsetX + c,
        y: r,
        pressure: Math.max(0, Math.min(1, basePressure + noise))
      })
    }
  }
  return points
}

export function generatePressureData(sessionId: string, timestamp: number): PressureData {
  const leftFoot = generateFootPressurePoints('left')
  const rightFoot = generateFootPressurePoints('right')
  const pressureMap = [...leftFoot, ...rightFoot]
  const totalPressure = pressureMap.reduce((sum, p) => sum + p.pressure, 0)

  return {
    id: generateId(),
    sessionId,
    timestamp,
    pressureMap,
    totalPressure,
    leftFoot,
    rightFoot
  }
}

export function generateCadenceData(sessionId: string, timestamp: number, baseCadence: number = 175): CadenceData {
  const variation = randomInRange(-8, 8)
  const stepsPerMinute = baseCadence + variation
  const stepLength = randomInRange(1.2, 1.6)
  const groundContactTime = randomInRange(220, 280)
  const verticalOscillation = randomInRange(6, 12)

  return {
    id: generateId(),
    sessionId,
    timestamp,
    stepsPerMinute,
    stepLength,
    groundContactTime,
    verticalOscillation
  }
}

export function generatePostureData(sessionId: string, timestamp: number, fatigueLevel: number = 0): PostureData {
  const fatigueFactor = fatigueLevel / 100
  
  return {
    id: generateId(),
    sessionId,
    timestamp,
    ankleAngle: 85 + randomInRange(-10, 10) * (1 + fatigueFactor),
    kneeAngle: 170 + randomInRange(-15, 15) * (1 + fatigueFactor * 0.5),
    hipAngle: 180 + randomInRange(-8, 8) * (1 + fatigueFactor * 0.3),
    pronation: randomInRange(-8 + fatigueFactor * 3, 8 + fatigueFactor * 3),
    trunkAngle: randomInRange(-5 + fatigueFactor * 2, 5 + fatigueFactor * 2)
  }
}

export function generateMockShoes(userId: string): Shoes {
  const brands = ['Nike', 'Adidas', 'Asics', 'Brooks', 'New Balance', 'Hoka']
  const models = [
    'ZoomX Vaporfly', 
    'Ultraboost 22', 
    'Gel-Nimbus 25', 
    'Ghost 15', 
    'Fresh Foam 1080',
    'Clifton 9'
  ]
  
  const brandIndex = Math.floor(Math.random() * brands.length)
  
  return {
    id: generateId(),
    userId,
    brand: brands[brandIndex],
    model: models[brandIndex],
    purchaseDate: new Date(Date.now() - randomInRange(0, 180) * 24 * 60 * 60 * 1000),
    totalKilometers: randomInRange(50, 500),
    expectedLifespan: 800,
    nickname: `我的${brands[brandIndex]}跑鞋`
  }
}

export function generateWearData(shoesId: string, totalKm: number): WearData {
  const wearPercentage = Math.min(100, (totalKm / 800) * 100)
  const heelRegions = ['内侧足跟', '中央足跟', '外侧足跟']
  const forefootRegions = ['前掌内侧', '前掌中央', '前掌外侧', '脚趾区域']
  const midsoleRegions = ['足弓内侧', '足弓中央', '足弓外侧']

  const heelWear: WearRegion[] = heelRegions.map(region => ({
    region,
    wearPercentage: wearPercentage * randomInRange(0.7, 1.3),
    pressure: randomInRange(0.5, 1.0)
  }))

  const forefootWear: WearRegion[] = forefootRegions.map(region => ({
    region,
    wearPercentage: wearPercentage * randomInRange(0.6, 1.2),
    pressure: randomInRange(0.6, 1.1)
  }))

  const midsoleWear: WearRegion[] = midsoleRegions.map(region => ({
    region,
    wearPercentage: wearPercentage * randomInRange(0.4, 0.9),
    pressure: randomInRange(0.3, 0.7)
  }))

  const avgWear = (
    heelWear.reduce((s, w) => s + w.wearPercentage, 0) +
    forefootWear.reduce((s, w) => s + w.wearPercentage, 0) +
    midsoleWear.reduce((s, w) => s + w.wearPercentage, 0)
  ) / (heelWear.length + forefootWear.length + midsoleWear.length)

  return {
    id: generateId(),
    shoesId,
    recordedAt: new Date(),
    heelWear,
    forefootWear,
    midsoleWear,
    remainingLife: Math.max(0, 100 - avgWear)
  }
}

export function generateMockRunSession(userId: string): RunSession {
  const startTime = new Date(Date.now() - randomInRange(30, 60) * 60 * 1000)
  
  return {
    id: generateId(),
    userId,
    startTime,
    endTime: new Date(),
    distance: parseFloat(randomInRange(5, 15).toFixed(2)),
    averageCadence: Math.round(randomInRange(165, 185)),
    status: 'completed'
  }
}

export function generateHistoricalData(days: number = 7) {
  const data = []
  const now = Date.now()
  
  for (let i = 0; i < days; i++) {
    const dayOffset = i * 24 * 60 * 60 * 1000
    const distance = parseFloat(randomInRange(3, 12).toFixed(1))
    const duration = Math.round(randomInRange(25, 90))
    const paceMinutes = Math.round(duration / distance)
    const paceSeconds = Math.round((duration / distance - paceMinutes) * 60)
    
    data.push({
      date: new Date(now - dayOffset).toISOString().split('T')[0],
      distance,
      duration,
      avgCadence: Math.round(randomInRange(165, 180)),
      avgRisk: Math.round(randomInRange(10, 60)),
      avgPace: `${paceMinutes}'${paceSeconds.toString().padStart(2, '0')}"`,
      avgHeartRate: Math.round(randomInRange(130, 160)),
      keyPoints: [
        '步频保持在目标范围内',
        '足底压力分布均衡',
        '姿态稳定性良好'
      ]
    })
  }
  
  return data.reverse()
}
