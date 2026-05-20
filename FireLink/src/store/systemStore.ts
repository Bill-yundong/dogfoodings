import { createSignal, onCleanup } from 'solid-js'
import type { SystemState, SmokeField, EvacuationPath, Device, EvacuationStatus } from '@/types'
import { SmokeSimulator, FireSource } from '@/services/smokeSimulation'
import { PathOptimizer } from '@/services/pathOptimizer'
import { smokeFieldDB, pathDB, deviceDB, syncQueueDB, offlineLogDB, initializeOfflineData, isDataAvailable } from '@/db/indexedDB'
import { buildingFloors } from '@/data/buildingData'

export interface SystemStore {
  systemState: SystemState
  smokeFields: Map<number, SmokeField>
  evacuationPaths: EvacuationPath[]
  devices: Device[]
  evacuationStatus: EvacuationStatus
  selectedFloor: number
  selectedPath: EvacuationPath | null
  userMode: 'monitor' | 'terminal'
  isLoading: boolean
  error: string | null
}

const initialSystemState: SystemState = {
  isEmergency: false,
  isOfflineMode: false,
  powerStatus: 'normal',
  activeFloor: 1,
  syncStatus: 'synced'
}

const initialEvacuationStatus: EvacuationStatus = {
  totalPopulation: 500,
  evacuatedCount: 0,
  trappedCount: 0,
  safeZones: [],
  activePaths: [],
  lastUpdate: Date.now()
}

export function createSystemStore() {
  const [systemState, setSystemState] = createSignal<SystemState>(initialSystemState)
  const [smokeFields, setSmokeFields] = createSignal<Map<number, SmokeField>>(new Map())
  const [evacuationPaths, setEvacuationPaths] = createSignal<EvacuationPath[]>([])
  const [devices, setDevices] = createSignal<Device[]>([])
  const [evacuationStatus, setEvacuationStatus] = createSignal<EvacuationStatus>(initialEvacuationStatus)
  const [selectedFloor, setSelectedFloor] = createSignal(1)
  const [selectedPath, setSelectedPath] = createSignal<EvacuationPath | null>(null)
  const [userMode, setUserMode] = createSignal<'monitor' | 'terminal'>('monitor')
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  let smokeSimulator: SmokeSimulator | null = null
  let pathOptimizer: PathOptimizer | null = null
  let simulationFrameId: number | null = null
  let syncIntervalId: number | null = null

  async function initializeSystem(): Promise<void> {
    setIsLoading(true)
    try {
      smokeSimulator = new SmokeSimulator()
      pathOptimizer = new PathOptimizer()
      pathOptimizer.setSmokeSimulator(smokeSimulator)

      const dataExists = await isDataAvailable()
      if (!dataExists) {
        await initializeOfflineData(buildingFloors)
        await offlineLogDB.log('system_init', { message: '初始数据已缓存' }, true)
      }

      const cachedDevices = await deviceDB.getAll()
      setDevices(cachedDevices)

      setIsLoading(false)
      startSimulation()
      startSyncService()
    } catch (err) {
      setError(err instanceof Error ? err.message : '系统初始化失败')
      setIsLoading(false)
    }
  }

  function startSimulation(): void {
    if (!smokeSimulator) return

    let lastTime = performance.now()

    function simulate() {
      if (!smokeSimulator) return

      const currentTime = Date.now()
      const deltaTime = currentTime - lastTime

      if (deltaTime >= 1000) {
        const fields = smokeSimulator.update(currentTime)
        setSmokeFields(new Map(fields))

        if (systemState().isEmergency) {
          cacheSmokeData(fields)
        }

        lastTime = currentTime
      }

      simulationFrameId = requestAnimationFrame(simulate)
    }

    simulationFrameId = requestAnimationFrame(simulate)
  }

  async function cacheSmokeData(fields: Map<number, SmokeField>): Promise<void> {
    try {
      for (const [floor, field] of fields) {
        await smokeFieldDB.save({ ...field, id: `smoke-${floor}-${field.timestamp}` })
      }
    } catch (err) {
      await offlineLogDB.log('smoke_cache_error', err, false)
    }
  }

  function startSyncService(): void {
    syncIntervalId = window.setInterval(async () => {
      if (!navigator.onLine) {
        setSystemState(prev => ({ ...prev, isOfflineMode: true, syncStatus: 'synced' }))
        return
      }

      const pendingCount = await syncQueueDB.getCount()
      if (pendingCount > 0) {
        setSystemState(prev => ({ ...prev, syncStatus: 'syncing' }))
        await processSyncQueue()
      } else {
        setSystemState(prev => ({ ...prev, syncStatus: 'synced' }))
      }
    }, 5000)
  }

  async function processSyncQueue(): Promise<void> {
    try {
      const items = await syncQueueDB.dequeue(10)

      for (const item of items) {
        try {
          await offlineLogDB.log('sync_process', item, true)
          await syncQueueDB.delete(item.id)
        } catch (err) {
          await syncQueueDB.updateRetry(item.id)
          await offlineLogDB.log('sync_failed', { item, error: err }, false)
        }
      }
    } catch (err) {
      await offlineLogDB.log('sync_queue_error', err, false)
    }
  }

  function triggerEmergency(): void {
    setSystemState(prev => ({ ...prev, isEmergency: true }))

    if (smokeSimulator) {
      smokeSimulator.addFireSource('fire-1', {
        position: { x: 250, y: 200 },
        floor: 1,
        intensity: 0.8,
        startTime: Date.now()
      })
      smokeSimulator.addFireSource('fire-2', {
        position: { x: 150, y: 300 },
        floor: 2,
        intensity: 0.5,
        startTime: Date.now() + 5000
      })
    }

    offlineLogDB.log('emergency_triggered', { time: Date.now() }, true)
  }

  function clearEmergency(): void {
    setSystemState(prev => ({ ...prev, isEmergency: false }))
    if (smokeSimulator) {
      smokeSimulator.clearFireSources()
    }
    setEvacuationPaths([])
    setSelectedPath(null)
  }

  async function calculateEvacuationPath(startNodeId: string): Promise<EvacuationPath | null> {
    if (!pathOptimizer) return null

    try {
      const path = await pathOptimizer.findPathToNearestExit(startNodeId)
      if (path) {
        setEvacuationPaths(prev => [...prev, path])
        await pathDB.save(path)
        await syncQueueDB.enqueue({ type: 'create', store: 'paths', data: path })
      }
      return path
    } catch (err) {
      setError(err instanceof Error ? err.message : '路径计算失败')
      return null
    }
  }

  async function calculateMultiplePaths(startNodeId: string, endNodeId: string): Promise<EvacuationPath[]> {
    if (!pathOptimizer) return []

    try {
      const paths = await pathOptimizer.findMultiplePaths(startNodeId, endNodeId, 3)
      setEvacuationPaths(paths)
      return paths
    } catch (err) {
      setError(err instanceof Error ? err.message : '多路径计算失败')
      return []
    }
  }

  function togglePowerStatus(): void {
    setSystemState(prev => {
      const states: SystemState['powerStatus'][] = ['normal', 'backup', 'critical']
      const currentIndex = states.indexOf(prev.powerStatus)
      const nextIndex = (currentIndex + 1) % states.length
      const nextStatus = states[nextIndex]

      if (nextStatus === 'critical') {
        offlineLogDB.log('power_critical', { message: '进入断电模式' }, true)
      }

      return { ...prev, powerStatus: nextStatus }
    })
  }

  function toggleOfflineMode(): void {
    setSystemState(prev => ({ ...prev, isOfflineMode: !prev.isOfflineMode }))
    offlineLogDB.log('offline_mode_toggled', { isOffline: !systemState().isOfflineMode }, true)
  }

  function addFireSource(id: string, source: FireSource): void {
    if (smokeSimulator) {
      smokeSimulator.addFireSource(id, source)
    }
  }

  function removeFireSource(id: string): void {
    if (smokeSimulator) {
      smokeSimulator.removeFireSource(id)
    }
  }

  function getSmokeSimulator(): SmokeSimulator | null {
    return smokeSimulator
  }

  function getPathOptimizer(): PathOptimizer | null {
    return pathOptimizer
  }

  function cleanup(): void {
    if (simulationFrameId) {
      cancelAnimationFrame(simulationFrameId)
    }
    if (syncIntervalId) {
      clearInterval(syncIntervalId)
    }
  }

  onCleanup(cleanup)

  return {
    systemState,
    smokeFields,
    evacuationPaths,
    devices,
    evacuationStatus,
    selectedFloor,
    selectedPath,
    userMode,
    isLoading,
    error,
    setSelectedFloor,
    setSelectedPath,
    setUserMode,
    setEvacuationStatus,
    initializeSystem,
    triggerEmergency,
    clearEmergency,
    calculateEvacuationPath,
    calculateMultiplePaths,
    togglePowerStatus,
    toggleOfflineMode,
    addFireSource,
    removeFireSource,
    getSmokeSimulator,
    getPathOptimizer
  }
}

export type SystemStoreType = ReturnType<typeof createSystemStore>
