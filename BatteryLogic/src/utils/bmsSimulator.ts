import type { CellData, BatteryPack, BatteryModule, Alarm } from '@/types'
import { generateId } from './arrhenius'

export const CELLS_PER_MODULE = 12
export const MODULES_PER_PACK = 8
export const TOTAL_CELLS = CELLS_PER_MODULE * MODULES_PER_PACK

export function createCell(
  id: string,
  moduleId: number,
  row: number,
  col: number,
  baseTemp: number = 25,
  baseVoltage: number = 3.65
): CellData {
  const tempVariation = (Math.random() - 0.5) * 5
  const voltVariation = (Math.random() - 0.5) * 0.05

  return {
    id,
    moduleId,
    row,
    col,
    voltage: +(baseVoltage + voltVariation).toFixed(3),
    temperature: +(baseTemp + tempVariation).toFixed(1),
    soc: +(60 + Math.random() * 30).toFixed(1),
    internalResistance: +(2 + Math.random() * 0.5).toFixed(3),
    status: 'normal',
    timestamp: Date.now()
  }
}

export function createModule(moduleId: number): BatteryModule {
  const cells: CellData[] = []
  const rows = 3
  const cols = 4

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellIndex = row * cols + col
      cells.push(
        createCell(
          `cell_${moduleId}_${row}_${col}`,
          moduleId,
          row,
          col,
          25 + Math.random() * 8
        )
      )
    }
  }

  return {
    id: moduleId,
    name: `模组 ${moduleId + 1}`,
    cellCount: cells.length,
    cells
  }
}

export function createBatteryPack(): BatteryPack {
  const modules: BatteryModule[] = []
  for (let i = 0; i < MODULES_PER_PACK; i++) {
    modules.push(createModule(i))
  }

  return {
    id: 'pack_001',
    name: '主电池包',
    model: 'BL-280Ah-1P8S',
    moduleCount: MODULES_PER_PACK,
    cellCount: TOTAL_CELLS,
    capacity: 280,
    voltage: 51.2,
    modules
  }
}

export function updateCellData(
  cell: CellData,
  deltaTime: number,
  thermalRunawayCellId?: string,
  propagationIntensity: number = 0
): CellData {
  let tempChange = (Math.random() - 0.45) * 0.3
  let voltChange = (Math.random() - 0.5) * 0.02

  if (thermalRunawayCellId === cell.id) {
    tempChange = 5 + Math.random() * 3
    voltChange = 0.1 + Math.random() * 0.05
  } else if (propagationIntensity > 0) {
    tempChange = propagationIntensity * (1 + Math.random() * 0.5)
  }

  const newTemp = Math.max(20, Math.min(500, cell.temperature + tempChange))
  const newVolt = Math.max(2.5, Math.min(4.5, cell.voltage + voltChange))
  const newSoc = Math.max(0, Math.min(100, cell.soc + (Math.random() - 0.5) * 0.2))

  let status: CellData['status'] = 'normal'
  if (newTemp >= 80) {
    status = 'thermal_runaway'
  } else if (newTemp >= 55 || newVolt >= 4.2 || newVolt <= 2.8) {
    status = 'warning'
  }

  return {
    ...cell,
    temperature: +newTemp.toFixed(1),
    voltage: +newVolt.toFixed(3),
    soc: +newSoc.toFixed(1),
    status,
    timestamp: Date.now()
  }
}

export function updateBatteryPack(
  pack: BatteryPack,
  deltaTime: number,
  thermalRunawayCellId?: string
): BatteryPack {
  const runawayCell = thermalRunawayCellId
    ? pack.modules.flatMap(m => m.cells).find(c => c.id === thermalRunawayCellId)
    : null

  const updatedModules = pack.modules.map(module => {
    const updatedCells = module.cells.map(cell => {
      let propagationIntensity = 0

      if (runawayCell && runawayCell.moduleId === cell.moduleId) {
        const distance = Math.sqrt(
          Math.pow(cell.row - runawayCell.row, 2) +
          Math.pow(cell.col - runawayCell.col, 2)
        )
        if (distance > 0 && distance < 5) {
          propagationIntensity = Math.max(0, 2 - distance * 0.4)
        }
      } else if (runawayCell) {
        const moduleDistance = Math.abs(cell.moduleId - runawayCell.moduleId)
        if (moduleDistance === 1) {
          propagationIntensity = 0.5
        }
      }

      return updateCellData(cell, deltaTime, thermalRunawayCellId, propagationIntensity)
    })

    return {
      ...module,
      cells: updatedCells
    }
  })

  return {
    ...pack,
    modules: updatedModules
  }
}

export function generateAlarms(cells: CellData[], existingAlarms: Alarm[]): Alarm[] {
  const newAlarms: Alarm[] = []
  const existingAlarmCellIds = new Set(
    existingAlarms.filter(a => !a.acknowledged).map(a => a.cellId)
  )

  for (const cell of cells) {
    if (existingAlarmCellIds.has(cell.id)) continue

    if (cell.status === 'thermal_runaway') {
      newAlarms.push({
        id: generateId(),
        type: 'thermal_runaway',
        level: 'critical',
        cellId: cell.id,
        moduleId: cell.moduleId,
        message: `电芯 ${cell.id} 触发热失控！温度: ${cell.temperature}°C`,
        timestamp: Date.now(),
        acknowledged: false
      })
    } else if (cell.status === 'warning') {
      if (cell.temperature >= 55) {
        newAlarms.push({
          id: generateId(),
          type: 'temperature',
          level: 'warning',
          cellId: cell.id,
          moduleId: cell.moduleId,
          message: `电芯 ${cell.id} 温度过高: ${cell.temperature}°C`,
          timestamp: Date.now(),
          acknowledged: false
        })
      }
      if (cell.voltage >= 4.2 || cell.voltage <= 2.8) {
        newAlarms.push({
          id: generateId(),
          type: 'voltage',
          level: 'warning',
          cellId: cell.id,
          moduleId: cell.moduleId,
          message: `电芯 ${cell.id} 电压异常: ${cell.voltage}V`,
          timestamp: Date.now(),
          acknowledged: false
        })
      }
    }
  }

  return newAlarms
}

export function getPackStats(pack: BatteryPack) {
  const allCells = pack.modules.flatMap(m => m.cells)
  const temps = allCells.map(c => c.temperature)
  const volts = allCells.map(c => c.voltage)
  const socs = allCells.map(c => c.soc)

  return {
    avgTemp: +(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1),
    maxTemp: +Math.max(...temps).toFixed(1),
    minTemp: +Math.min(...temps).toFixed(1),
    avgVoltage: +(volts.reduce((a, b) => a + b, 0) / volts.length).toFixed(3),
    totalVoltage: +(volts.reduce((a, b) => a + b, 0)).toFixed(2),
    avgSoc: +(socs.reduce((a, b) => a + b, 0) / socs.length).toFixed(1),
    warningCount: allCells.filter(c => c.status === 'warning').length,
    runawayCount: allCells.filter(c => c.status === 'thermal_runaway').length,
    normalCount: allCells.filter(c => c.status === 'normal').length
  }
}
