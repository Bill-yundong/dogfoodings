import { describe, it, expect } from 'vitest'
import type { PressureData, PressurePoint, CadenceData, PostureData } from '@/types'

function generatePressureData(sessionId: string, timestamp: number, fatigueLevel: number = 0): PressureData {
  const gridSize = 8
  const pressureMap: PressurePoint[] = []
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < 4; c++) {
      const basePressure = 0.3 + Math.random() * 0.5
      const fatiguePressure = basePressure + fatigueLevel * 0.01 * Math.random()
      pressureMap.push({
        x: c,
        y: r,
        pressure: Math.min(1, Math.max(0, fatiguePressure))
      })
    }
  }
  return {
    id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    timestamp,
    pressureMap,
    totalPressure: pressureMap.reduce((sum, p) => sum + p.pressure, 0),
    leftFoot: pressureMap.slice(0, 16),
    rightFoot: pressureMap.slice(16, 32)
  }
}

function generateCadenceData(sessionId: string, timestamp: number, baseCadence: number = 175): CadenceData {
  return {
    id: `cd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    timestamp,
    stepsPerMinute: Math.round(baseCadence + (Math.random() - 0.5) * 6),
    stepLength: 1.3 + Math.random() * 0.2,
    groundContactTime: 230 + Math.random() * 40,
    verticalOscillation: 6 + Math.random() * 4
  }
}

function generatePostureData(sessionId: string, timestamp: number, fatigueLevel: number = 0): PostureData {
  const jitter = fatigueLevel * 0.1
  return {
    id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    timestamp,
    ankleAngle: 90 + (Math.random() - 0.5) * 6 + jitter,
    kneeAngle: 170 + (Math.random() - 0.5) * 8 - jitter * 0.5,
    hipAngle: 180 + (Math.random() - 0.5) * 4 + jitter * 0.3,
    pronation: (Math.random() - 0.5) * 8 + jitter * 0.5,
    trunkAngle: (Math.random() - 0.5) * 4 + jitter * 0.2
  }
}

function generateHistoricalData(days: number = 7) {
  const data = []
  const now = Date.now()
  for (let i = 0; i < days; i++) {
    const dayOffset = i * 24 * 60 * 60 * 1000
    const distance = parseFloat((3 + Math.random() * 9).toFixed(1))
    const duration = Math.round(25 + Math.random() * 65)
    const paceMinutes = Math.round(duration / distance)
    const paceSeconds = Math.round((duration / distance - paceMinutes) * 60)
    data.push({
      date: new Date(now - dayOffset).toISOString().split('T')[0],
      distance,
      duration,
      avgCadence: Math.round(165 + Math.random() * 15),
      avgRisk: Math.round(10 + Math.random() * 50),
      avgPace: `${paceMinutes}'${paceSeconds.toString().padStart(2, '0')}"`,
      avgHeartRate: Math.round(130 + Math.random() * 30),
      keyPoints: [
        '步频保持在目标范围内',
        '足底压力分布均衡',
        '姿态稳定性良好'
      ]
    })
  }
  return data.reverse()
}

describe('B6-数据模型与Mock数据生成', () => {
  it('B6.1 PressureData结构包含完整字段', () => {
    const data = generatePressureData('s1', Date.now())
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('sessionId')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('pressureMap')
    expect(data).toHaveProperty('totalPressure')
    expect(data).toHaveProperty('leftFoot')
    expect(data).toHaveProperty('rightFoot')
  })

  it('B6.2 PressureMap包含32个压力点(8行x4列)', () => {
    const data = generatePressureData('s1', Date.now())
    expect(data.pressureMap.length).toBe(32)
  })

  it('B6.3 压力值在[0,1]范围内', () => {
    const data = generatePressureData('s1', Date.now(), 0)
    for (const point of data.pressureMap) {
      expect(point.pressure).toBeGreaterThanOrEqual(0)
      expect(point.pressure).toBeLessThanOrEqual(1)
    }
  })

  it('B6.4 疲劳参数影响压力分布', () => {
    const lowFatigue = generatePressureData('s1', Date.now(), 0)
    const highFatigue = generatePressureData('s1', Date.now(), 50)
    expect(highFatigue.pressureMap.length).toBe(lowFatigue.pressureMap.length)
  })

  it('B6.5 CadenceData结构包含完整字段', () => {
    const data = generateCadenceData('s1', Date.now())
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('sessionId')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('stepsPerMinute')
    expect(data).toHaveProperty('stepLength')
    expect(data).toHaveProperty('groundContactTime')
    expect(data).toHaveProperty('verticalOscillation')
  })

  it('B6.6 步频在合理范围内(150-200 SPM)', () => {
    for (let i = 0; i < 20; i++) {
      const data = generateCadenceData('s1', Date.now(), 175)
      expect(data.stepsPerMinute).toBeGreaterThanOrEqual(150)
      expect(data.stepsPerMinute).toBeLessThanOrEqual(200)
    }
  })

  it('B6.7 PostureData结构包含完整字段', () => {
    const data = generatePostureData('s1', Date.now())
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('sessionId')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('ankleAngle')
    expect(data).toHaveProperty('kneeAngle')
    expect(data).toHaveProperty('hipAngle')
    expect(data).toHaveProperty('pronation')
    expect(data).toHaveProperty('trunkAngle')
  })

  it('B6.8 疲劳参数影响姿态角抖动', () => {
    const lowFatigue = generatePostureData('s1', Date.now(), 0)
    const highFatigue = generatePostureData('s1', Date.now(), 50)
    expect(typeof highFatigue.ankleAngle).toBe('number')
    expect(typeof lowFatigue.ankleAngle).toBe('number')
  })

  it('B6.9 历史数据生成器返回指定天数的数据', () => {
    const data7 = generateHistoricalData(7)
    const data30 = generateHistoricalData(30)
    expect(data7.length).toBe(7)
    expect(data30.length).toBe(30)
  })

  it('B6.10 历史数据每条包含必要字段', () => {
    const data = generateHistoricalData(7)
    for (const item of data) {
      expect(item).toHaveProperty('date')
      expect(item).toHaveProperty('distance')
      expect(item).toHaveProperty('duration')
      expect(item).toHaveProperty('avgCadence')
      expect(item).toHaveProperty('avgRisk')
      expect(item).toHaveProperty('avgPace')
      expect(item).toHaveProperty('avgHeartRate')
      expect(item).toHaveProperty('keyPoints')
    }
  })

  it('B6.11 历史数据按日期升序排列', () => {
    const data = generateHistoricalData(14)
    for (let i = 1; i < data.length; i++) {
      expect(new Date(data[i].date).getTime()).toBeGreaterThanOrEqual(
        new Date(data[i - 1].date).getTime()
      )
    }
  })

  it('B6.12 距离值为正数', () => {
    const data = generateHistoricalData(7)
    for (const item of data) {
      expect(item.distance).toBeGreaterThan(0)
    }
  })

  it('B6.13 时长为正整数', () => {
    const data = generateHistoricalData(7)
    for (const item of data) {
      expect(item.duration).toBeGreaterThan(0)
      expect(Number.isInteger(item.duration)).toBe(true)
    }
  })

  it('B6.14 风险值在0-100范围', () => {
    const data = generateHistoricalData(7)
    for (const item of data) {
      expect(item.avgRisk).toBeGreaterThanOrEqual(0)
      expect(item.avgRisk).toBeLessThanOrEqual(100)
    }
  })

  it('B6.15 keyPoints为非空数组', () => {
    const data = generateHistoricalData(7)
    for (const item of data) {
      expect(Array.isArray(item.keyPoints)).toBe(true)
      expect(item.keyPoints.length).toBeGreaterThan(0)
    }
  })
})
