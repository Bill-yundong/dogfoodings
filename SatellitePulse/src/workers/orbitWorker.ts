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
let lastUpdateTime = 0

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
  
  self.postMessage({
    type: 'initialized',
    payload: {
      satelliteCount: state.satellites.size,
      stationCount: state.stations.length
    }
  })
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
  if (!state.isRunning) return
  
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
  
  const loop = (timestamp: number) => {
    if (!state.isRunning) return
    
    if (timestamp - lastUpdateTime >= state.config.updateInterval) {
      updateSimulation(timestamp)
      lastUpdateTime = timestamp
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
}

function updateConfig(config: Partial<SimulationConfig>): void {
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
