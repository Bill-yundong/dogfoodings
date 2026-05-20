import { describe, it, expect, beforeEach } from 'vitest'
import {
  createBatteryPack,
  updateCellData,
  updateBatteryPack,
  getPackStats,
  generateAlarms
} from '@/utils/bmsSimulator'
import type { BatteryPack, CellData } from '@/types'

describe('BMS数据模拟器', () => {
  let batteryPack: BatteryPack

  beforeEach(() => {
    batteryPack = createBatteryPack()
  })

  describe('电池包创建', () => {
    it('应该创建正确数量的模组和电芯', () => {
      expect(batteryPack.modules.length).toBe(8)
      expect(batteryPack.modules[0].cells.length).toBe(12)
      expect(batteryPack.cellCount).toBe(96)
    })

    it('电芯应该有正确的初始值', () => {
      const firstCell = batteryPack.modules[0].cells[0]
      expect(firstCell.voltage).toBeGreaterThanOrEqual(3.2)
      expect(firstCell.voltage).toBeLessThanOrEqual(4.2)
      expect(firstCell.temperature).toBeGreaterThanOrEqual(20)
      expect(firstCell.temperature).toBeLessThanOrEqual(40)
      expect(firstCell.soc).toBeGreaterThanOrEqual(0)
      expect(firstCell.soc).toBeLessThanOrEqual(100)
    })

    it('每个电芯应该有唯一的ID', () => {
      const ids = new Set<string>()
      batteryPack.modules.forEach(module => {
        module.cells.forEach(cell => {
          expect(ids.has(cell.id)).toBe(false)
          ids.add(cell.id)
        })
      })
      expect(ids.size).toBe(96)
    })

    it('电芯应该有正确的行列位置', () => {
      const cell = batteryPack.modules[0].cells[0]
      expect(cell.moduleId).toBe(0)
      expect(cell.row).toBe(0)
      expect(cell.col).toBe(0)
      
      const cell2 = batteryPack.modules[1].cells[11]
      expect(cell2.moduleId).toBe(1)
      expect(cell2.row).toBe(2)
      expect(cell2.col).toBe(3)
    })
  })

  describe('数据更新', () => {
    it('单个电芯更新后数据应该在合理范围内', () => {
      const cell = batteryPack.modules[0].cells[0]
      const originalTemp = cell.temperature
      const updatedCell = updateCellData(cell, 1000)
      
      expect(updatedCell.temperature).toBeGreaterThanOrEqual(originalTemp - 2)
      expect(updatedCell.temperature).toBeLessThanOrEqual(originalTemp + 2)
    })

    it('整个电池包更新应该更新所有电芯', () => {
      const originalTimestamps = batteryPack.modules.flatMap(m => m.cells.map(c => c.timestamp))
      const updatedPack = updateBatteryPack(batteryPack, 1000)
      
      updatedPack.modules.forEach((module, i) => {
        module.cells.forEach((cell, j) => {
          expect(cell.timestamp).toBeGreaterThanOrEqual(originalTimestamps[i * 12 + j])
        })
      })
    })
  })

  describe('热失控触发', () => {
    it('热失控电芯温度应该显著升高', () => {
      const cellId = batteryPack.modules[0].cells[0].id
      const updatedPack = updateBatteryPack(batteryPack, 1000, cellId)
      
      const cell = updatedPack.modules[0].cells[0]
      expect(cell.temperature).toBeGreaterThan(30)
    })

    it('热失控应该蔓延到相邻电芯', () => {
      const cellId = batteryPack.modules[0].cells[0].id
      const originalTemp = batteryPack.modules[0].cells[1].temperature
      
      const updatedPack = updateBatteryPack(batteryPack, 1000, cellId)
      const adjacentCell = updatedPack.modules[0].cells[1]
      
      expect(adjacentCell.temperature).toBeGreaterThan(originalTemp - 1)
    })
  })

  describe('统计计算', () => {
    it('应该返回正确的统计数据', () => {
      const stats = getPackStats(batteryPack)
      
      expect(stats).toHaveProperty('avgTemp')
      expect(stats).toHaveProperty('maxTemp')
      expect(stats).toHaveProperty('minTemp')
      expect(stats).toHaveProperty('avgVoltage')
      expect(stats).toHaveProperty('avgSoc')
      expect(stats.avgTemp).toBeGreaterThan(0)
    })

    it('最高温度应该大于等于平均温度', () => {
      const stats = getPackStats(batteryPack)
      expect(stats.maxTemp).toBeGreaterThanOrEqual(stats.avgTemp)
    })

    it('最低温度应该小于等于平均温度', () => {
      const stats = getPackStats(batteryPack)
      expect(stats.minTemp).toBeLessThanOrEqual(stats.avgTemp)
    })
  })

  describe('告警生成', () => {
    it('正常电芯不应该产生告警', () => {
      const normalCell: CellData = {
        id: 'normal',
        moduleId: 1,
        row: 0,
        col: 0,
        voltage: 3.7,
        temperature: 30,
        soc: 85,
        internalResistance: 2.5,
        status: 'normal',
        timestamp: Date.now()
      }
      
      const alarms = generateAlarms([normalCell], [])
      expect(alarms.length).toBe(0)
    })

    it('高温电芯应该产生温度告警', () => {
      const hotCell: CellData = {
        id: 'hot',
        moduleId: 1,
        row: 0,
        col: 0,
        voltage: 3.7,
        temperature: 60,
        soc: 85,
        internalResistance: 2.5,
        status: 'warning',
        timestamp: Date.now()
      }
      
      const alarms = generateAlarms([hotCell], [])
      const tempAlarms = alarms.filter(a => a.type === 'temperature')
      expect(tempAlarms.length).toBeGreaterThan(0)
    })

    it('热失控电芯应该产生热失控告警', () => {
      const criticalCell: CellData = {
        id: 'critical',
        moduleId: 1,
        row: 0,
        col: 0,
        voltage: 3.7,
        temperature: 100,
        soc: 85,
        internalResistance: 2.5,
        status: 'thermal_runaway',
        timestamp: Date.now()
      }
      
      const alarms = generateAlarms([criticalCell], [])
      const runawayAlarms = alarms.filter(a => a.type === 'thermal_runaway')
      expect(runawayAlarms.length).toBeGreaterThan(0)
    })

    it('低电压电芯应该产生电压告警', () => {
      const lowVoltageCell: CellData = {
        id: 'low_voltage',
        moduleId: 1,
        row: 0,
        col: 0,
        voltage: 2.5,
        temperature: 30,
        soc: 20,
        internalResistance: 2.5,
        status: 'warning',
        timestamp: Date.now()
      }
      
      const alarms = generateAlarms([lowVoltageCell], [])
      const voltageAlarms = alarms.filter(a => a.type === 'voltage')
      expect(voltageAlarms.length).toBeGreaterThan(0)
    })

    it('已经存在的告警不应该重复生成', () => {
      const cell: CellData = {
        id: 'test_cell',
        moduleId: 1,
        row: 0,
        col: 0,
        voltage: 2.5,
        temperature: 30,
        soc: 20,
        internalResistance: 2.5,
        status: 'warning',
        timestamp: Date.now()
      }
      
      const existingAlarms = [{
        id: 'existing',
        type: 'voltage',
        level: 'warning',
        message: 'test',
        cellId: 'test_cell',
        moduleId: 1,
        timestamp: Date.now() - 1000,
        acknowledged: false
      }]
      
      const newAlarms = generateAlarms([cell], existingAlarms)
      expect(newAlarms.length).toBe(0)
    })
  })
})
