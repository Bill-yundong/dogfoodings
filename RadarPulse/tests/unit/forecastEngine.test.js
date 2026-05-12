import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ForecastEngine, generateMockRadarData } from '../../src/utils/forecastEngine.js'

describe('ForecastEngine - 降水预报引擎', () => {
  let engine

  beforeEach(() => {
    engine = new ForecastEngine()
  })

  afterEach(() => {
    engine.destroy()
  })

  describe('generateMockRadarData - 模拟雷达数据生成', () => {
    it('应生成指定数量的帧数据', () => {
      const frames = 20
      const gridSize = 50
      const data = generateMockRadarData(gridSize, frames)
      
      expect(data).toHaveLength(frames)
      expect(data[0]).toHaveLength(gridSize * gridSize)
    })

    it('每帧应包含有效的 dBZ 值范围 (0-60)', () => {
      const data = generateMockRadarData(50, 5)
      
      data.forEach(frame => {
        const maxDbz = Math.max(...frame)
        expect(maxDbz).toBeGreaterThanOrEqual(0)
        expect(maxDbz).toBeLessThanOrEqual(60)
      })
    })

    it('应呈现云团移动趋势（连续帧有相关性）', () => {
      const data = generateMockRadarData(50, 5)
      const frame1Sum = data[0].reduce((a, b) => a + b, 0)
      const frame2Sum = data[1].reduce((a, b) => a + b, 0)
      
      const diff = Math.abs(frame1Sum - frame2Sum) / frame1Sum
      expect(diff).toBeLessThan(0.3)
    })
  })

  describe('ForecastEngine 初始化', () => {
    it('应正确初始化引擎实例', () => {
      expect(engine).toBeInstanceOf(ForecastEngine)
      expect(engine.worker).toBeNull()
      expect(engine.isProcessing).toBe(false)
    })

    it('init 方法应成功初始化 Web Worker', async () => {
      await engine.init()
      expect(engine.worker).not.toBeNull()
    })
  })

  describe('computeForecast - 降水预报计算', () => {
    it('雷达帧不足时应不进行计算', async () => {
      await engine.init()
      const callback = vi.fn()
      
      engine.computeForecast([], 30, callback)
      expect(callback).not.toHaveBeenCalled()
    })

    it('应正确处理预报请求并返回结果', async () => {
      await engine.init()
      const radarFrames = generateMockRadarData(50, 10)
      
      return new Promise((resolve) => {
        engine.computeForecast(radarFrames, 5, (results) => {
          expect(results).toHaveLength(5)
          expect(results[0]).toHaveProperty('minute')
          expect(results[0]).toHaveProperty('data')
          expect(results[0]).toHaveProperty('timestamp')
          expect(results[0].data).toHaveLength(2500)
          resolve()
        })
      })
    })

    it('预报结果应呈现降水减弱趋势', async () => {
      await engine.init()
      const radarFrames = generateMockRadarData(50, 10)
      
      return new Promise((resolve) => {
        engine.computeForecast(radarFrames, 10, (results) => {
          const firstMax = Math.max(...results[0].data)
          const lastMax = Math.max(...results[results.length - 1].data)
          expect(lastMax).toBeLessThanOrEqual(firstMax)
          resolve()
        })
      })
    })
  })
})
