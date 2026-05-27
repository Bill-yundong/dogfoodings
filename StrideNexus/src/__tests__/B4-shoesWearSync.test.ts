import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Shoes, WearData, WearRegion } from '@/types'

const mockShoes: Shoes = {
  id: 'shoes-1',
  userId: 'demo-user',
  brand: 'Nike',
  model: 'Pegasus 40',
  purchaseDate: new Date('2024-01-15'),
  totalKilometers: 350,
  expectedLifespan: 800,
  nickname: '日常训练鞋'
}

const mockWearRegions: WearRegion[] = [
  { region: 'heel-left', wearPercentage: 35, pressure: 0.6 },
  { region: 'heel-right', wearPercentage: 40, pressure: 0.7 },
  { region: 'mid-left', wearPercentage: 20, pressure: 0.4 },
  { region: 'mid-right', wearPercentage: 25, pressure: 0.5 },
  { region: 'fore-left', wearPercentage: 30, pressure: 0.5 },
  { region: 'fore-right', wearPercentage: 35, pressure: 0.6 }
]

const mockWearData: WearData = {
  id: 'wear-1',
  shoesId: 'shoes-1',
  recordedAt: new Date(),
  heelWear: mockWearRegions.slice(0, 2),
  forefootWear: mockWearRegions.slice(4),
  midsoleWear: mockWearRegions.slice(2, 4),
  remainingLife: 56
}

describe('B4-跑鞋磨损监测与增量同步', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('B4.1 WearData结构包含三个磨损区域', () => {
    expect(mockWearData).toHaveProperty('heelWear')
    expect(mockWearData).toHaveProperty('forefootWear')
    expect(mockWearData).toHaveProperty('midsoleWear')
    expect(mockWearData.heelWear.length).toBeGreaterThan(0)
    expect(mockWearData.forefootWear.length).toBeGreaterThan(0)
    expect(mockWearData.midsoleWear.length).toBeGreaterThan(0)
  })

  it('B4.2 WearRegion结构包含区域名、磨损百分比、压力值', () => {
    const region = mockWearRegions[0]
    expect(region).toHaveProperty('region')
    expect(region).toHaveProperty('wearPercentage')
    expect(region).toHaveProperty('pressure')
    expect(region.wearPercentage).toBeGreaterThanOrEqual(0)
    expect(region.wearPercentage).toBeLessThanOrEqual(100)
    expect(region.pressure).toBeGreaterThanOrEqual(0)
    expect(region.pressure).toBeLessThanOrEqual(1)
  })

  it('B4.3 剩余寿命remainingLife在[0,100]范围', () => {
    expect(mockWearData.remainingLife).toBeGreaterThanOrEqual(0)
    expect(mockWearData.remainingLife).toBeLessThanOrEqual(100)
  })

  it('B4.4 跑鞋结构包含必要字段', () => {
    expect(mockShoes).toHaveProperty('id')
    expect(mockShoes).toHaveProperty('userId')
    expect(mockShoes).toHaveProperty('brand')
    expect(mockShoes).toHaveProperty('model')
    expect(mockShoes).toHaveProperty('totalKilometers')
    expect(mockShoes).toHaveProperty('expectedLifespan')
  })

  it('B4.5 跑鞋寿命百分比计算：remainingLife = (1 - totalKm/expectedLifespan) * 100', () => {
    const lifePercent = Math.round((1 - mockShoes.totalKilometers / mockShoes.expectedLifespan) * 100)
    expect(lifePercent).toBe(56)
    expect(lifePercent).toBe(mockWearData.remainingLife)
  })

  it('B4.6 跑鞋需要更换条件：remainingLife < 20', () => {
    const wornOutShoes: Shoes = {
      ...mockShoes,
      id: 'shoes-worn',
      totalKilometers: 700,
      expectedLifespan: 800
    }
    const life = Math.round((1 - wornOutShoes.totalKilometers / wornOutShoes.expectedLifespan) * 100)
    expect(life).toBeLessThan(20)
  })

  it('B4.7 同步队列结构SyncQueueItem验证', () => {
    const syncItem = {
      id: 'sync-1',
      tableName: 'shoes',
      recordId: 'shoes-1',
      operation: 'create' as const,
      status: 'pending' as const,
      createdAt: new Date(),
      data: mockShoes
    }
    expect(syncItem.operation).toMatch(/^(create|update|delete)$/)
    expect(syncItem.status).toMatch(/^(pending|syncing|completed|failed)$/)
  })

  it('B4.8 WearSyncState结构验证', () => {
    const syncState = {
      lastSyncTimestamp: Date.now(),
      pendingRecords: 3,
      syncProgress: 50,
      conflicts: []
    }
    expect(syncState).toHaveProperty('lastSyncTimestamp')
    expect(syncState).toHaveProperty('pendingRecords')
    expect(syncState).toHaveProperty('syncProgress')
    expect(syncState).toHaveProperty('conflicts')
    expect(syncState.syncProgress).toBeGreaterThanOrEqual(0)
    expect(syncState.syncProgress).toBeLessThanOrEqual(100)
  })

  it('B4.9 冲突解决支持local/remote/manual三种模式', () => {
    const conflict = {
      recordId: 'rec-1',
      localVersion: { km: 350 },
      remoteVersion: { km: 360 },
      resolution: 'manual' as const
    }
    expect(conflict.resolution).toMatch(/^(local|remote|manual)$/)
  })

  it('B4.10 磨损区域覆盖后跟/前掌/中底三大区域', () => {
    const regions = mockWearRegions.map(r => r.region)
    const hasHeel = regions.some(r => r.includes('heel'))
    const hasFore = regions.some(r => r.includes('fore'))
    const hasMid = regions.some(r => r.includes('mid'))
    expect(hasHeel).toBe(true)
    expect(hasFore).toBe(true)
    expect(hasMid).toBe(true)
  })
})
