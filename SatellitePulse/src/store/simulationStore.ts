import { createSignal, createEffect, onCleanup, createMemo } from 'solid-js'
import type {
  Satellite,
  GroundStation,
  SatellitePosition,
  VisibilityWindow,
  SimulationConfig
} from '../core/types'
import { DEFAULT_CONFIG } from '../core/constants'
import { SAMPLE_SATELLITES, SAMPLE_GROUND_STATIONS } from '../data/sampleData'

export function createSimulationStore() {
  const [satellites, setSatellites] = createSignal<Satellite[]>(SAMPLE_SATELLITES)
  const [stations, setStations] = createSignal<GroundStation[]>(SAMPLE_GROUND_STATIONS)
  const [positions, setPositions] = createSignal<SatellitePosition[]>([])
  const [visibilityWindows, setVisibilityWindows] = createSignal<VisibilityWindow[]>([])
  const [selectedSatelliteId, setSelectedSatelliteId] = createSignal<string | null>(null)
  const [selectedStationId, setSelectedStationId] = createSignal<string | null>(null)
  const [config, setConfig] = createSignal<SimulationConfig>(DEFAULT_CONFIG)
  const [isSimulating, setIsSimulating] = createSignal(false)
  const [currentTime, setCurrentTime] = createSignal(Date.now())
  const [isLoading, setIsLoading] = createSignal(false)
  const [workerReady, setWorkerReady] = createSignal(false)

  let worker: Worker | null = null
  let simulationInterval: number | null = null

  const selectedSatellite = createMemo<Satellite | undefined>(() => {
    const id = selectedSatelliteId()
    if (!id) return undefined
    return satellites().find(s => s.id === id)
  })

  const selectedStation = createMemo<GroundStation | undefined>(() => {
    const id = selectedStationId()
    if (!id) return undefined
    return stations().find(s => s.id === id)
  })

  const satelliteColorsMap = createMemo<Map<string, string>>(() => {
    const map = new Map<string, string>()
    for (const sat of satellites()) {
      map.set(sat.id, sat.color)
    }
    return map
  })

  const getSatelliteColor = (satelliteId: string): string => {
    const sat = satellites().find(s => s.id === satelliteId)
    return sat?.color || '#3b82f6'
  }

  const getSatelliteColorsMap = (): Map<string, string> => {
    return satelliteColorsMap()
  }

  const getSelectedSatellite = (): Satellite | undefined => {
    return selectedSatellite()
  }

  const getSelectedStation = (): GroundStation | undefined => {
    return selectedStation()
  }

  const toggleSatellite = (satelliteId: string): void => {
    setSatellites(prev =>
      prev.map(s =>
        s.id === satelliteId ? { ...s, active: !s.active } : s
      )
    )
  }

  const initWorker = (): void => {
    if (worker) return

    try {
      worker = new Worker(new URL('../workers/orbitWorker.ts', import.meta.url), {
        type: 'module'
      })

      worker.onmessage = (event) => {
        const { type, payload } = event.data

        switch (type) {
          case 'initialized':
            console.log('[Store] Worker initialized, payload:', payload)
            setWorkerReady(true)
            break
          case 'positions':
            console.log('[Store] Received positions, count:', payload.positions.length)
            console.log('[Store] First position:', payload.positions[0])
            setPositions(payload.positions)
            setCurrentTime(payload.timestamp)
            break
          case 'visibility':
            console.log('[Store] Received visibility windows:', payload.windows.length)
            setVisibilityWindows(payload.windows)
            setIsLoading(false)
            break
          case 'error':
            console.error('[Store] Worker error:', payload)
            setIsLoading(false)
            break
        }
      }

      worker.onerror = (error) => {
        console.error('Worker error:', error)
      }

      worker.postMessage({
        type: 'initialize',
        payload: {
          satellites: satellites(),
          stations: stations(),
          config: config()
        }
      })
    } catch (error) {
      console.error('Failed to create worker:', error)
    }
  }

  const startSimulation = (): void => {
    if (!worker) {
      initWorker()
    }

    setIsSimulating(true)
    worker?.postMessage({ type: 'start' })

    const updateTime = () => {
      setCurrentTime(prev => prev + config().timeSpeed * 1000)
    }

    simulationInterval = window.setInterval(updateTime, 1000)
  }

  const stopSimulation = (): void => {
    setIsSimulating(false)
    worker?.postMessage({ type: 'stop' })

    if (simulationInterval !== null) {
      clearInterval(simulationInterval)
      simulationInterval = null
    }
  }

  const predictVisibility = (hours: number = 24): void => {
    if (!worker) return

    setIsLoading(true)
    const now = currentTime()
    worker.postMessage({
      type: 'predictVisibility',
      payload: {
        startTime: now,
        endTime: now + hours * 3600 * 1000,
        satelliteIds: selectedSatelliteId() ? [selectedSatelliteId()!] : undefined,
        stationIds: selectedStationId() ? [selectedStationId()!] : undefined
      }
    })
  }

  const updateTimeSpeed = (speed: number): void => {
    setConfig(prev => ({ ...prev, timeSpeed: speed }))
    worker?.postMessage({
      type: 'updateConfig',
      payload: { timeSpeed: speed }
    })
  }

  const cleanup = (): void => {
    stopSimulation()
    if (worker) {
      worker.postMessage({ type: 'dispose' })
      worker.terminate()
      worker = null
    }
    setWorkerReady(false)
  }

  onCleanup(cleanup)

  createEffect(() => {
    if (worker) {
      worker.postMessage({
        type: 'initialize',
        payload: {
          satellites: satellites(),
          stations: stations(),
          config: config()
        }
      })
    }
  })

  return {
    satellites,
    stations,
    positions,
    visibilityWindows,
    selectedSatelliteId,
    setSelectedSatelliteId,
    selectedStationId,
    setSelectedStationId,
    selectedSatellite,
    selectedStation,
    satelliteColorsMap,
    config,
    setConfig,
    isSimulating,
    currentTime,
    setCurrentTime,
    isLoading,
    workerReady,
    getSatelliteColor,
    getSatelliteColorsMap,
    getSelectedSatellite,
    getSelectedStation,
    toggleSatellite,
    initWorker,
    startSimulation,
    stopSimulation,
    predictVisibility,
    updateTimeSpeed,
    cleanup
  }
}

export type SimulationStore = ReturnType<typeof createSimulationStore>
