/// <reference lib="webworker" />
import * as satellite from 'satellite.js'
import { parseTLE, getOrbitState, generateTrajectory, calculateVisibility } from '../core/orbitCalculator'
import type {
  Satellite,
  GroundStation,
  SatellitePosition,
  VisibilityWindow,
  SimulationConfig,
  WorkerMessage,
  OrbitCalculationResult,
  VisibilityCalculationResult
} from '../core/types'

interface WorkerState {
  satellites: Map<string, { satrec: satellite.SatRec; satellite: Satellite }>
  stations: GroundStation[]
  config: SimulationConfig
  isRunning: boolean
}

const state: WorkerState = {
  satellites: new Map(),
  stations: [],
  config: {
    timeSpeed: 1,
    trajectoryPoints: 180,
    predictionHours: 24,
    updateInterval: 100
  },
  isRunning: false
}

let animationFrameId: number | null = null
let idleIntervalId: number | null = null
let lastUpdateTime = 0
let simulationStartTime: number | null = null
let baseTime: number = Date.now()

function initialize(payload: {
  satellites: Satellite[]
  stations: GroundStation[]
  config: Partial<SimulationConfig>
}): void {
  state.satellites.clear()
  
  for (const sat of payload.satellites) {
    try {
      const satrec = parseTLE(sat.tle)
      state.satellites.set(sat.id, { satrec, satellite: sat })
    } catch (error) {
      console.error(`Failed to parse TLE for satellite ${sat.name}:`, error)
    }
  }
  
  state.stations = payload.stations
  state.config = { ...state.config, ...payload.config }
  baseTime = Date.now()
  
  self.postMessage({
    type: 'initialized',
    payload: {
      satelliteCount: state.satellites.size,
      stationCount: state.stations.length
    }
  })
  
  updateSimulation(baseTime)
  startIdleUpdates()
}

function startIdleUpdates(): void {
  if (idleIntervalId !== null) return
  
  idleIntervalId = (self as unknown as Window).setInterval(() => {
    if (!state.isRunning) {
      const now = Date.now()
      updateSimulation(now)
      baseTime = now
    }
  }, 1000)
}

function stopIdleUpdates(): void {
  if (idleIntervalId !== null) {
    (self as unknown as Window).clearInterval(idleIntervalId)
    idleIntervalId = null
  }
}

function calculatePositions(currentTime: number): SatellitePosition[] {
  const positions: SatellitePosition[] = []
  const now = new Date(currentTime)
  
  for (const [satId, { satrec, satellite }] of state.satellites) {
    if (!satellite.active) continue
    
    const currentState = getOrbitState(satrec, now)
    if (!currentState) continue
    
    const orbitalPeriod = (2 * Math.PI / satrec.no) * 60
    const trajectory = generateTrajectory(
      satrec,
      now,
      orbitalPeriod,
      state.config.trajectoryPoints
    )
    
    positions.push({
      satelliteId: satId,
      state: currentState,
      trajectory
    })
  }
  
  return positions
}

function predictVisibility(payload: {
  startTime: number
  endTime: number
  satelliteIds?: string[]
  stationIds?: string[]
}): VisibilityCalculationResult {
  const startTime = performance.now()
  const windows: VisibilityWindow[] = []
  
  const startDate = new Date(payload.startTime)
  const endDate = new Date(payload.endTime)
  
  const targetSatellites = payload.satelliteIds
    ? Array.from(state.satellites.entries()).filter(([id]) => payload.satelliteIds!.includes(id))
    : Array.from(state.satellites.entries())
  
  const targetStations = payload.stationIds
    ? state.stations.filter(s => payload.stationIds!.includes(s.id))
    : state.stations
  
  for (const [satId, { satrec, satellite }] of targetSatellites) {
    if (!satellite.active) continue
    
    for (const station of targetStations) {
      const satWindows = calculateVisibility(satrec, station, startDate, endDate, 30)
      
      for (const window of satWindows) {
        windows.push({
          ...window,
          satelliteId: satId,
          satelliteName: satellite.name
        })
      }
    }
  }
  
  windows.sort((a, b) => a.startTime - b.startTime)
  
  return {
    windows,
    calculationTime: performance.now() - startTime
  }
}

function updateSimulation(currentTime: number): void {
  const positions = calculatePositions(currentTime)
  
  const result: OrbitCalculationResult = {
    positions,
    timestamp: currentTime
  }
  
  self.postMessage({
    type: 'positions',
    payload: result
  })
}

function startSimulation(): void {
  if (state.isRunning) return
  state.isRunning = true
  const simStart = Date.now()
  simulationStartTime = simStart
  baseTime = simStart
  
  const loop = () => {
    if (!state.isRunning) return
    
    const now = Date.now()
    if (now - lastUpdateTime >= state.config.updateInterval) {
      const elapsed = now - simStart
      const simulatedTime = baseTime + elapsed * state.config.timeSpeed
      updateSimulation(simulatedTime)
      lastUpdateTime = now
    }
    
    animationFrameId = requestAnimationFrame(loop)
  }
  
  animationFrameId = requestAnimationFrame(loop)
}

function stopSimulation(): void {
  state.isRunning = false
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (simulationStartTime !== null) {
    const now = Date.now()
    const elapsed = now - simulationStartTime
    baseTime = baseTime + elapsed * state.config.timeSpeed
    simulationStartTime = null
  }
}

function updateConfig(config: Partial<SimulationConfig>): void {
  if (config.timeSpeed !== undefined && state.isRunning) {
    const simStart = simulationStartTime
    if (simStart !== null) {
      const now = Date.now()
      const elapsed = now - simStart
      baseTime = baseTime + elapsed * state.config.timeSpeed
      simulationStartTime = now
    }
  }
  state.config = { ...state.config, ...config }
}

self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data
  
  try {
    switch (type) {
      case 'initialize':
        initialize(payload as {
          satellites: Satellite[]
          stations: GroundStation[]
          config: Partial<SimulationConfig>
        })
        break
        
      case 'start':
        startSimulation()
        break
        
      case 'stop':
        stopSimulation()
        break
        
      case 'update':
        updateSimulation(payload as number)
        break
        
      case 'updateConfig':
        updateConfig(payload as Partial<SimulationConfig>)
        break
        
      case 'predictVisibility':
        const result = predictVisibility(payload as {
          startTime: number
          endTime: number
          satelliteIds?: string[]
          stationIds?: string[]
        })
        self.postMessage({
          type: 'visibility',
          payload: result
        })
        break
        
      case 'dispose':
        stopSimulation()
        stopIdleUpdates()
        state.satellites.clear()
        state.stations = []
        break
        
      default:
        console.warn('Unknown message type:', type)
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type
      }
    })
  }
})

self.addEventListener('error', (event) => {
  console.error('Orbit worker error:', event.error)
})
