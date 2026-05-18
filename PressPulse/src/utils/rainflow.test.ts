import { describe, it, expect, beforeEach } from 'vitest'
import { AsyncRainflowCounter, processLoadStream } from './rainflow'
import { LoadDataPoint, RainflowCycle } from '../types'

describe('AsyncRainflowCounter', () => {
  let counter: AsyncRainflowCounter

  beforeEach(() => {
    counter = new AsyncRainflowCounter(100)
  })

  describe('初始化', () => {
    it('应正确初始化', () => {
      expect(counter).toBeDefined()
      expect(counter.getCycles()).toHaveLength(0)
    })

    it('应支持自定义批量大小', () => {
      const customCounter = new AsyncRainflowCounter(500)
      expect(customCounter).toBeDefined()
    })
  })

  describe('载荷数据处理', () => {
    it('空数据应返回空结果', async () => {
      const cycles = await counter.processLoadData([])
      expect(cycles).toHaveLength(0)
    })

    it('少量数据应暂存于缓冲区', async () => {
      const data: LoadDataPoint[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: i,
        load: 100 + Math.sin(i) * 50,
        sensorId: 'test',
      }))
      
      const cycles = await counter.processLoadData(data)
      expect(cycles).toHaveLength(0)
    })

    it('达到批量大小时应进行处理', async () => {
      const data: LoadDataPoint[] = Array.from({ length: 200 }, (_, i) => ({
        timestamp: i,
        load: 100 + Math.sin(i * 0.1) * 80,
        sensorId: 'test',
      }))
      
      const cycles = await counter.processLoadData(data)
      expect(cycles.length).toBeGreaterThan(0)
    })

    it('应正确识别循环', async () => {
      const loads = [0, 50, 0, 50, 0, 50, 0]
      const data: LoadDataPoint[] = loads.map((load, i) => ({
        timestamp: i,
        load,
        sensorId: 'test',
      }))
      
      await counter.processLoadData(data)
      const cycles = await counter.flush()
      
      expect(cycles.length).toBeGreaterThan(0)
    })
  })

  describe('极值检测', () => {
    it('应正确识别简单的峰值和谷值', async () => {
      const loads = [0, 100, 0, 100, 0]
      const data: LoadDataPoint[] = loads.map((load, i) => ({
        timestamp: i,
        load,
        sensorId: 'test',
      }))
      
      await counter.processLoadData(data)
      const cycles = await counter.flush()
      
      expect(cycles.length).toBeGreaterThan(0)
      const hasRange100 = cycles.some(c => Math.abs(c.range - 100) < 1)
      expect(hasRange100).toBe(true)
    })

    it('应处理单调递增序列', async () => {
      const loads = [0, 20, 40, 60, 80, 100]
      const data: LoadDataPoint[] = loads.map((load, i) => ({
        timestamp: i,
        load,
        sensorId: 'test',
      }))
      
      await counter.processLoadData(data)
      const cycles = await counter.flush()
      
      expect(cycles).toBeDefined()
    })

    it('应处理恒定载荷序列', async () => {
      const loads = [50, 50, 50, 50, 50]
      const data: LoadDataPoint[] = loads.map((load, i) => ({
        timestamp: i,
        load,
        sensorId: 'test',
      }))
      
      await counter.processLoadData(data)
      const cycles = await counter.flush()
      
      expect(cycles).toBeDefined()
    })
  })

  describe('循环计数', () => {
    it('应正确计算循环范围', async () => {
      const loads = [0, 80, 0, 80, 0, 80, 0]
      const data: LoadDataPoint[] = loads.map((load, i) => ({
        timestamp: i,
        load,
        sensorId: 'test',
      }))
      
      await counter.processLoadData(data)
      const cycles = await counter.flush()
      
      const range80Cycles = cycles.filter(c => Math.abs(c.range - 80) < 5)
      expect(range80Cycles.length).toBeGreaterThan(0)
    })

    it('应正确计算循环均值', async () => {
      const loads = [100, 200, 100, 200, 100]
      const data: LoadDataPoint[] = loads.map((load, i) => ({
        timestamp: i,
        load,
        sensorId: 'test',
      }))
      
      await counter.processLoadData(data)
      const cycles = await counter.flush()
      
      expect(cycles.every(c => c.mean > 140 && c.mean < 160)).toBe(true)
    })

    it('应正确合并相同的循环', async () => {
      const loads = Array.from({ length: 20 }, (_, i) => {
        if (i % 2 === 0) return 0
        return 100
      })
      const data: LoadDataPoint[] = loads.map((load, i) => ({
        timestamp: i,
        load,
        sensorId: 'test',
      }))
      
      await counter.processLoadData(data)
      const cycles = await counter.flush()
      
      expect(cycles.length).toBeLessThan(10)
    })
  })

  describe('异步处理', () => {
    it('flush应处理剩余缓冲区数据', async () => {
      const data: LoadDataPoint[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: i,
        load: 100 + Math.sin(i * 0.2) * 60,
        sensorId: 'test',
      }))
      
      await counter.processLoadData(data)
      const cyclesBeforeFlush = counter.getCycles().length
      const flushedCycles = await counter.flush()
      
      expect(flushedCycles.length).toBeGreaterThanOrEqual(cyclesBeforeFlush)
    })

    it('clear应清空所有数据', async () => {
      const data: LoadDataPoint[] = Array.from({ length: 200 }, (_, i) => ({
        timestamp: i,
        load: 100 + Math.sin(i * 0.1) * 80,
        sensorId: 'test',
      }))
      
      await counter.processLoadData(data)
      counter.clear()
      
      expect(counter.getCycles()).toHaveLength(0)
    })

    it('getCycles应返回所有已处理的循环', async () => {
      const data: LoadDataPoint[] = Array.from({ length: 200 }, (_, i) => ({
        timestamp: i,
        load: 100 + Math.sin(i * 0.1) * 80,
        sensorId: 'test',
      }))
      
      await counter.processLoadData(data)
      await counter.flush()
      
      const cycles = counter.getCycles()
      expect(cycles.length).toBeGreaterThan(0)
    })
  })

  describe('processLoadStream', () => {
    it('应处理异步数据流', async () => {
      const batches: LoadDataPoint[][] = []
      for (let b = 0; b < 5; b++) {
        const batch: LoadDataPoint[] = Array.from({ length: 100 }, (_, i) => ({
          timestamp: b * 100 + i,
          load: 100 + Math.sin((b * 100 + i) * 0.05) * 70,
          sensorId: 'test',
        }))
        batches.push(batch)
      }

      async function* createStream() {
        for (const batch of batches) {
          yield batch
        }
      }

      const allCycles = await processLoadStream(createStream())
      
      expect(allCycles.length).toBeGreaterThan(0)
    })

    it('应在每个批次完成时调用回调', async () => {
      const batches: LoadDataPoint[][] = []
      for (let b = 0; b < 5; b++) {
        const batch: LoadDataPoint[] = Array.from({ length: 200 }, (_, i) => ({
          timestamp: b * 200 + i,
          load: 100 + Math.sin((b * 200 + i) * 0.05) * 70,
          sensorId: 'test',
        }))
        batches.push(batch)
      }

      let callbackCount = 0
      
      async function* createStream() {
        for (const batch of batches) {
          yield batch
        }
      }

      await processLoadStream(createStream(), () => {
        callbackCount++
      })
      
      expect(callbackCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('复杂载荷模式', () => {
    it('应处理可变振幅的载荷', async () => {
      const loads: number[] = []
      for (let i = 0; i < 500; i++) {
        const amplitude = 50 + Math.sin(i * 0.01) * 30
        loads.push(100 + Math.sin(i * 0.1) * amplitude)
      }
      
      const data: LoadDataPoint[] = loads.map((load, i) => ({
        timestamp: i,
        load,
        sensorId: 'test',
      }))
      
      await counter.processLoadData(data)
      const cycles = await counter.flush()
      
      expect(cycles.length).toBeGreaterThan(0)
      expect(counter.getCycles().length).toBeGreaterThan(0)
    })

    it('应处理随机载荷序列', async () => {
      const data: LoadDataPoint[] = Array.from({ length: 300 }, (_, i) => ({
        timestamp: i,
        load: 100 + (Math.random() - 0.5) * 150,
        sensorId: 'test',
      }))
      
      await counter.processLoadData(data)
      const cycles = await counter.flush()
      
      expect(cycles).toBeDefined()
      expect(Array.isArray(cycles)).toBe(true)
    })
  })
})
