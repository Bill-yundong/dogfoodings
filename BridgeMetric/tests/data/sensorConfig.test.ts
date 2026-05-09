import { describe, it, expect } from 'vitest'
import { bridgeSensors, sensorUnits } from '../../src/data/sensorConfig'

describe('sensorConfig', () => {
  describe('传感器配置', () => {
    it('应该包含配置的传感器', () => {
      expect(bridgeSensors.length).toBeGreaterThan(0)
    })

    it('每个传感器应该有完整的配置', () => {
      bridgeSensors.forEach(sensor => {
        expect(sensor.id).toBeDefined()
        expect(sensor.name).toBeDefined()
        expect(sensor.type).toBeDefined()
        expect(sensor.location).toBeDefined()
        expect(sensor.location.x).toBeDefined()
        expect(sensor.location.y).toBeDefined()
        expect(sensor.location.z).toBeDefined()
        expect(sensor.location.structureType).toBeDefined()
        expect(sensor.location.description).toBeDefined()
        expect(sensor.calibration).toBeDefined()
        expect(sensor.calibration.offset).toBeDefined()
        expect(sensor.calibration.scale).toBeDefined()
        expect(sensor.calibration.temperatureCoefficient).toBeDefined()
        expect(sensor.thresholds).toBeDefined()
        expect(sensor.thresholds.warning).toBeDefined()
        expect(sensor.thresholds.danger).toBeDefined()
        expect(sensor.thresholds.critical).toBeDefined()
        expect(sensor.installationDate).toBeDefined()
        expect(sensor.lastCalibrationDate).toBeDefined()
      })
    })

    it('阈值应该按照 warning < danger < critical 顺序', () => {
      bridgeSensors.forEach(sensor => {
        expect(sensor.thresholds.warning).toBeLessThan(sensor.thresholds.danger)
        expect(sensor.thresholds.danger).toBeLessThan(sensor.thresholds.critical)
      })
    })

    it('应变片传感器应该有正确的阈值范围', () => {
      const strainGauges = bridgeSensors.filter(s => s.type === 'strain_gauge')
      expect(strainGauges.length).toBeGreaterThan(0)
      
      strainGauges.forEach(sensor => {
        expect(sensor.thresholds.warning).toBeGreaterThan(0)
        expect(sensor.thresholds.danger).toBeGreaterThan(sensor.thresholds.warning)
        expect(sensor.thresholds.critical).toBeGreaterThan(sensor.thresholds.danger)
      })
    })

    it('位移传感器阈值应该在合理范围内', () => {
      const displacementSensors = bridgeSensors.filter(s => s.type === 'displacement')
      displacementSensors.forEach(sensor => {
        expect(sensor.thresholds.critical).toBeLessThan(500) // mm
      })
    })

    it('加速度传感器阈值应该在合理范围内', () => {
      const accelerationSensors = bridgeSensors.filter(s => s.type === 'acceleration')
      accelerationSensors.forEach(sensor => {
        expect(sensor.thresholds.warning).toBeGreaterThan(0)
        expect(sensor.thresholds.critical).toBeLessThan(10) // m/s²
      })
    })

    it('温度传感器阈值应该在合理范围内', () => {
      const temperatureSensors = bridgeSensors.filter(s => s.type === 'temperature')
      temperatureSensors.forEach(sensor => {
        expect(sensor.thresholds.warning).toBeGreaterThan(0)
        expect(sensor.thresholds.critical).toBeLessThan(100) // °C
      })
    })

    it('传感器ID应该是唯一的', () => {
      const ids = bridgeSensors.map(s => s.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('传感器名称应该是唯一的', () => {
      const names = bridgeSensors.map(s => s.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })

    it('传感器位置应该与结构类型匹配', () => {
      bridgeSensors.forEach(sensor => {
        switch (sensor.location.structureType) {
          case 'main_girder':
            expect(sensor.name).toMatch(/主梁/)
            break
          case 'pier':
            expect(sensor.name).toMatch(/桥墩/)
            break
          case 'cable':
            expect(sensor.name).toMatch(/拉索/)
            break
          case 'deck':
            expect(sensor.name).toMatch(/桥面/)
            break
          case 'bearing':
            expect(sensor.name).toMatch(/支座/)
            break
        }
      })
    })

    it('校准参数应该是有效的', () => {
      bridgeSensors.forEach(sensor => {
        expect(sensor.calibration.scale).toBeGreaterThan(0)
        expect(sensor.calibration.temperatureCoefficient).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('传感器单位', () => {
    it('应该包含所有传感器类型的单位', () => {
      expect(sensorUnits.strain_gauge).toBe('με')
      expect(sensorUnits.displacement).toBe('mm')
      expect(sensorUnits.acceleration).toBe('m/s²')
      expect(sensorUnits.temperature).toBe('°C')
    })

    it('单位应该是标准的工程单位', () => {
      expect(sensorUnits.strain_gauge).toBe('με') // 微应变
      expect(sensorUnits.displacement).toBe('mm') // 毫米
      expect(sensorUnits.acceleration).toBe('m/s²') // 米每二次方秒
      expect(sensorUnits.temperature).toBe('°C') // 摄氏度
    })
  })
})
