import { createSignal, createEffect, onCleanup, createRoot } from 'solid-js'
import type { Facility, AlertEvent, SafetyScore, LeakEvent, CoordinationOrder, TopologyConnection } from '../utils/types'
import { generateFacilities, generateAlert, calculateSafetyScore } from '../utils/helpers'
import { saveFacilities, saveAlert, saveCoordinationOrder, saveTopologySnapshot } from '../utils/indexeddb'

const initialFacilities = generateFacilities()

const facilityConnections: TopologyConnection[] = [
  { from: 'f1', to: 'f8', type: 'pipe' },
  { from: 'f2', to: 'f9', type: 'pipe' },
  { from: 'f8', to: 'f3', type: 'pipe' },
  { from: 'f9', to: 'f4', type: 'pipe' },
  { from: 'f3', to: 'f5', type: 'pipe' },
  { from: 'f3', to: 'f6', type: 'pipe' },
  { from: 'f4', to: 'f7', type: 'pipe' },
  { from: 'f10', to: 'f3', type: 'pipe' },
  { from: 'f11', to: 'f1', type: 'signal' },
  { from: 'f12', to: 'f5', type: 'signal' },
]

const [facilities, setFacilities] = createSignal<Facility[]>(initialFacilities)
const [alerts, setAlerts] = createSignal<AlertEvent[]>([])
const [safetyScore, setSafetyScore] = createSignal<SafetyScore>(calculateSafetyScore(initialFacilities))
const [currentLeakEvent, setCurrentLeakEvent] = createSignal<LeakEvent | null>(null)
const [coordinationOrders, setCoordinationOrders] = createSignal<CoordinationOrder[]>([])
const [isOnline, setIsOnline] = createSignal(true)
const [windSpeed, setWindSpeed] = createSignal(3.5)
const [windDirection, setWindDirection] = createSignal(45)
const [stabilityClass, setStabilityClass] = createSignal<string>('D')
const [leakRate, setLeakRate] = createSignal(0.5)
const [syncStatus, setSyncStatus] = createSignal<'synced' | 'syncing' | 'delayed'>('synced')
const [expandedFacility, setExpandedFacility] = createSignal<string | null>(null)

createRoot(() => {
  createEffect(() => {
    const score = calculateSafetyScore(facilities())
    setSafetyScore(score)
  })

  createEffect(() => {
    saveFacilities(facilities())
    saveTopologySnapshot(facilities(), facilityConnections)
  })

  let alertTimer: ReturnType<typeof setInterval> | null = null
  createEffect(() => {
    alertTimer = setInterval(() => {
      const newAlert = generateAlert(facilities())
      setAlerts(prev => [newAlert, ...prev].slice(0, 100))
      saveAlert(newAlert)

      if (Math.random() < 0.3) {
        setFacilities(prev => {
          const idx = Math.floor(Math.random() * prev.length)
          const statuses: Facility['status'][] = ['normal', 'warning', 'alarm', 'normal', 'normal']
          const updated = [...prev]
          updated[idx] = { ...updated[idx], status: statuses[Math.floor(Math.random() * statuses.length)] }
          return updated
        })
      }
    }, 4000)

    onCleanup(() => {
      if (alertTimer) clearInterval(alertTimer)
    })
  })

  let syncTimer: ReturnType<typeof setInterval> | null = null
  createEffect(() => {
    syncTimer = setInterval(() => {
      const r = Math.random()
      if (r < 0.7) setSyncStatus('synced')
      else if (r < 0.9) setSyncStatus('syncing')
      else setSyncStatus('delayed')
    }, 3000)
    onCleanup(() => { if (syncTimer) clearInterval(syncTimer) })
  })
})

export function useStore() {
  return {
    facilities,
    setFacilities,
    alerts,
    setAlerts,
    safetyScore,
    currentLeakEvent,
    setCurrentLeakEvent,
    coordinationOrders,
    setCoordinationOrders,
    isOnline,
    setIsOnline,
    windSpeed,
    setWindSpeed,
    windDirection,
    setWindDirection,
    stabilityClass,
    setStabilityClass,
    leakRate,
    setLeakRate,
    syncStatus,
    setSyncStatus,
    expandedFacility,
    setExpandedFacility,
    facilityConnections,
    triggerLeakEvent: (facilityId: string) => {
      const facility = facilities().find(f => f.id === facilityId)
      if (!facility) return
      const event: LeakEvent = {
        id: `leak-${Date.now()}`,
        facilityId,
        severity: 'high',
        leakRate: leakRate(),
        windSpeed: windSpeed(),
        windDirection: windDirection(),
        stabilityClass: stabilityClass() as LeakEvent['stabilityClass'],
        timestamp: Date.now(),
      }
      setCurrentLeakEvent(event)
      setFacilities(prev => prev.map(f => f.id === facilityId ? { ...f, status: 'alarm' as const } : f))
    },
    sendCoordinationOrder: (order: Omit<CoordinationOrder, 'id' | 'timestamp'>) => {
      const full: CoordinationOrder = { ...order, id: `order-${Date.now()}`, timestamp: Date.now() }
      setCoordinationOrders(prev => [full, ...prev])
      saveCoordinationOrder(full)
    },
    updateOrderStatus: (orderId: string, status: CoordinationOrder['status']) => {
      setCoordinationOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    },
  }
}
