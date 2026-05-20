import type {
  CellData,
  ArrheniusParams,
  ThermalRunawayPrediction,
  WorkerMessage,
  WorkerResult
} from '@/types'
import {
  simulateThermalRunaway,
  calculateThermalPropagation,
  DEFAULT_ARRHENIUS_PARAMS
} from '@/utils/arrhenius'

interface CalculationTask {
  cells: CellData[]
  params: ArrheniusParams
  timeHorizon: number
  timeStep: number
  criticalTemp: number
  ambientTemp: number
}

let isRunning = false
let shouldCancel = false

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data

  switch (type) {
    case 'calculate':
      if (isRunning) {
        self.postMessage({
          type: 'error',
          payload: { message: 'Calculation already in progress' }
        } as WorkerResult)
        return
      }
      await runCalculation(payload)
      break

    case 'cancel':
      shouldCancel = true
      break
  }
}

async function runCalculation(task: CalculationTask) {
  isRunning = true
  shouldCancel = false

  try {
    const { cells, params, timeHorizon, timeStep, criticalTemp, ambientTemp } = task
    const predictions: ThermalRunawayPrediction[] = []
    const totalCells = cells.length

    for (let i = 0; i < cells.length; i++) {
      if (shouldCancel) {
        self.postMessage({
          type: 'error',
          payload: { message: 'Calculation cancelled' }
        } as WorkerResult)
        break
      }

      const cell = cells[i]
      const prediction = simulateThermalRunaway(
        cell,
        params,
        timeHorizon,
        timeStep,
        ambientTemp,
        criticalTemp
      )

      predictions.push(prediction)

      if (i % 5 === 0 || i === cells.length - 1) {
        self.postMessage({
          type: 'progress',
          payload: {
            progress: Math.round(((i + 1) / totalCells) * 100),
            completed: i + 1,
            total: totalCells
          }
        } as WorkerResult)
      }

      await new Promise(resolve => setTimeout(resolve, 10))
    }

    if (!shouldCancel) {
      const propagationMap = calculatePropagationMatrix(cells, params, predictions)

      self.postMessage({
        type: 'result',
        payload: {
          predictions,
          propagationMap,
          completedAt: Date.now()
        }
      } as WorkerResult)
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: { message: (error as Error).message }
    } as WorkerResult)
  } finally {
    isRunning = false
    shouldCancel = false
  }
}

function calculatePropagationMatrix(
  cells: CellData[],
  params: ArrheniusParams,
  predictions: ThermalRunawayPrediction[]
): Map<string, string[]> {
  const propagationMap = new Map<string, string[]>()

  const highRiskCells = predictions.filter(
    p => p.riskLevel === 'high' || p.riskLevel === 'extreme'
  )

  for (const sourcePred of highRiskCells) {
    const sourceCell = cells.find(c => c.id === sourcePred.cellId)
    if (!sourceCell) continue

    const affectedCells: string[] = []

    for (const targetCell of cells) {
      if (targetCell.id === sourceCell.id) continue

      const sameModule = targetCell.moduleId === sourceCell.moduleId
      const distance = sameModule
        ? Math.sqrt(
            Math.pow(targetCell.row - sourceCell.row, 2) +
            Math.pow(targetCell.col - sourceCell.col, 2)
          )
        : Math.abs(targetCell.moduleId - sourceCell.moduleId) * 3

      if (distance < 5) {
        const tempRise = calculateThermalPropagation(sourceCell, targetCell, params, distance * 0.02)
        if (tempRise > 0.5) {
          affectedCells.push(targetCell.id)
        }
      }
    }

    if (affectedCells.length > 0) {
      propagationMap.set(sourcePred.cellId, affectedCells)
    }
  }

  return propagationMap
}
