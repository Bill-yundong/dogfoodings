import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RadarHistoryDB } from '../../src/utils/radarHistoryDB.js'
import { generateMockRadarData } from '../../src/utils/forecastEngine.js'

describe('RadarHistoryDB - 历史数据存储', () => {
  let db

  beforeEach(async () => {
    db = new RadarHistoryDB()
    await db.init()
  })

  afterEach(async () => {
    if (db) {
      await db.clearStore('radar_frames')
      db.close()
    }
  })

  describe('IndexedDB 初始化', () => {
    it('应成功初始化数据库连接', () => {
      expect(db.db).not.toBeNull()
    })

    it('应创建正确的对象存储', () => {
      const storeNames = Array.from(db.db.objectStoreNames)
      expect(storeNames).toContain('radar_frames')
      expect(storeNames).toContain('forecast_history')
    })
  })

  describe('save - 单条数据保存', () => {
    it('应成功保存雷达帧数据', async () => {
      const testData = {
        id: Date.now(),
        data: generateMockRadarData(50, 1)[0],
        timestamp: Date.now(),
        type: 'observed'
      }

      const result = await db.save('radar_frames', testData)
      expect(result).toEqual(testData.id)
    })
  })

  describe('saveBatch - 批量数据保存', () => {
    it('应成功批量保存多帧雷达数据', async () => {
      const radarFrames = generateMockRadarData(50, 10)
      const testData = radarFrames.map((data, idx) => ({
        id: Date.now() + idx,
        data,
        timestamp: Date.now() + idx * 60000,
        type: 'observed'
      }))

      await expect(db.saveBatch('radar_frames', testData)).resolves.not.toThrow()
      
      const count = await db.count('radar_frames')
      expect(count).toBe(10)
    })
  })

  describe('get - 数据查询', () => {
    it('应根据 ID 正确获取数据', async () => {
      const testId = Date.now()
      const testData = {
        id: testId,
        data: generateMockRadarData(50, 1)[0],
        timestamp: Date.now(),
        type: 'observed'
      }

      await db.save('radar_frames', testData)
      const result = await db.get('radar_frames', testId)
      
      expect(result).not.toBeNull()
      expect(result.id).toBe(testId)
      expect(result.type).toBe('observed')
    })
  })

  describe('queryByTimeRange - 时间范围查询', () => {
    it('应返回指定时间范围内的数据', async () => {
      const now = Date.now()
      const testData = Array.from({ length: 5 }, (_, i) => ({
        id: now + i,
        data: generateMockRadarData(50, 1)[0],
        timestamp: now + i * 60000,
        type: 'observed'
      }))

      await db.saveBatch('radar_frames', testData)
      
      const results = await db.queryByTimeRange('radar_frames', now, now + 5 * 60000)
      expect(results).toHaveLength(5)
    })

    it('时间范围外的数据不应被返回', async () => {
      const now = Date.now()
      const testData = {
        id: now,
        data: generateMockRadarData(50, 1)[0],
        timestamp: now - 3600000,
        type: 'observed'
      }

      await db.save('radar_frames', testData)
      
      const results = await db.queryByTimeRange('radar_frames', now - 1800000, now)
      expect(results).toHaveLength(0)
    })
  })

  describe('getAll - 获取所有数据', () => {
    it('应返回存储中的所有数据', async () => {
      const testData = Array.from({ length: 3 }, (_, i) => ({
        id: Date.now() + i,
        data: generateMockRadarData(50, 1)[0],
        timestamp: Date.now() + i * 60000,
        type: 'observed'
      }))

      await db.saveBatch('radar_frames', testData)
      const results = await db.getAll('radar_frames')
      
      expect(results).toHaveLength(3)
    })
  })

  describe('delete - 数据删除', () => {
    it('应根据 ID 正确删除数据', async () => {
      const testId = Date.now()
      const testData = {
        id: testId,
        data: generateMockRadarData(50, 1)[0],
        timestamp: Date.now(),
        type: 'observed'
      }

      await db.save('radar_frames', testData)
      await db.delete('radar_frames', testId)
      
      const result = await db.get('radar_frames', testId)
      expect(result).toBeUndefined()
    })
  })

  describe('clearStore - 清空存储', () => {
    it('应清空指定存储的所有数据', async () => {
      const testData = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        data: generateMockRadarData(50, 1)[0],
        timestamp: Date.now() + i * 60000,
        type: 'observed'
      }))

      await db.saveBatch('radar_frames', testData)
      await db.clearStore('radar_frames')
      
      const count = await db.count('radar_frames')
      expect(count).toBe(0)
    })
  })

  describe('count - 数据计数', () => {
    it('应返回正确的记录数量', async () => {
      const testData = Array.from({ length: 7 }, (_, i) => ({
        id: Date.now() + i,
        data: generateMockRadarData(50, 1)[0],
        timestamp: Date.now() + i * 60000,
        type: 'observed'
      }))

      await db.saveBatch('radar_frames', testData)
      const count = await db.count('radar_frames')
      
      expect(count).toBe(7)
    })
  })
})
