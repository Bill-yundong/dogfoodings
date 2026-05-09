'use client'

import { useEffect, useState, useCallback } from 'react'
import type { PassengerFlow, CapacityPrediction, SecurityAction, DispatchAction, FlowSnapshot, Station } from '@/types'

interface SyncData {
  stations: Station[]
  flowData: Map<string, PassengerFlow>
  predictions: Map<string, CapacityPrediction[]>
  securityActions: Map<string, SecurityAction[]>
  dispatchActions: Map<string, DispatchAction[]>
  snapshots: FlowSnapshot[]
  isConnected: boolean
  lastUpdate: number | null
}

interface UseDataSyncOptions {
  autoStart?: boolean
  pollInterval?: number
  storeToIndexedDB?: boolean
}

const INITIAL_STATE: SyncData = {
  stations: [],
  flowData: new Map(),
  predictions: new Map(),
  securityActions: new Map(),
  dispatchActions: new Map(),
  snapshots: [],
  isConnected: false,
  lastUpdate: null
}

export function useDataSync(options: UseDataSyncOptions = {}) {
  const { autoStart = true, pollInterval = 3000, storeToIndexedDB = true } = options
  
  const [data, setData] = useState<SyncData>(INITIAL_STATE)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchAllData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [stationsRes, flowRes] = await Promise.all([
        fetch('/api/stations'),
        fetch('/api/flow')
      ])

      if (!stationsRes.ok || !flowRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const stationsData = await stationsRes.json()
      const flowData = await flowRes.json()

      if (!stationsData.success || !flowData.success) {
        throw new Error('API returned error')
      }

      const stations: Station[] = stationsData.data
      const flowMap = new Map<string, PassengerFlow>()
      const predictionsMap = new Map<string, CapacityPrediction[]>()

      for (const item of flowData.data) {
        if (item.flow) {
          flowMap.set(item.station.id, item.flow)
        }
        if (item.predictions) {
          predictionsMap.set(item.station.id, item.predictions)
        }
      }

      setData(prev => ({
        ...prev,
        stations,
        flowData: flowMap,
        predictions: predictionsMap,
        lastUpdate: Date.now()
      }))

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchSecurityActions = useCallback(async (stationId: string) => {
    try {
      const res = await fetch(`/api/actions/security/${stationId}`)
      const data = await res.json()
      
      if (data.success) {
        setData(prev => {
          const newActions = new Map(prev.securityActions)
          newActions.set(stationId, data.data)
          return { ...prev, securityActions: newActions }
        })
      }
    } catch (err) {
      console.error('Failed to fetch security actions:', err)
    }
  }, [])

  const fetchDispatchActions = useCallback(async (stationId: string) => {
    try {
      const res = await fetch(`/api/actions/dispatch/${stationId}`)
      const data = await res.json()
      
      if (data.success) {
        setData(prev => {
          const newActions = new Map(prev.dispatchActions)
          newActions.set(stationId, data.data)
          return { ...prev, dispatchActions: newActions }
        })
      }
    } catch (err) {
      console.error('Failed to fetch dispatch actions:', err)
    }
  }, [])

  const createSnapshot = useCallback(async (stationId: string): Promise<FlowSnapshot | null> => {
    try {
      const res = await fetch(`/api/snapshot/${stationId}`, { method: 'POST' })
      const data = await res.json()
      
      if (data.success) {
        setData(prev => ({
          ...prev,
          snapshots: [data.data, ...prev.snapshots].slice(0, 100)
        }))
        return data.data
      }
      return null
    } catch (err) {
      console.error('Failed to create snapshot:', err)
      return null
    }
  }, [])

  const updateSecurityActionStatus = useCallback(async (
    stationId: string,
    actionId: string,
    status: SecurityAction['status']
  ) => {
    try {
      const res = await fetch(`/api/actions/security/${stationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, status })
      })
      
      if (res.ok) {
        await fetchSecurityActions(stationId)
      }
    } catch (err) {
      console.error('Failed to update security action:', err)
    }
  }, [fetchSecurityActions])

  const updateDispatchActionStatus = useCallback(async (
    stationId: string,
    actionId: string,
    status: DispatchAction['status']
  ) => {
    try {
      const res = await fetch(`/api/actions/dispatch/${stationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, status })
      })
      
      if (res.ok) {
        await fetchDispatchActions(stationId)
      }
    } catch (err) {
      console.error('Failed to update dispatch action:', err)
    }
  }, [fetchDispatchActions])

  useEffect(() => {
    if (!autoStart) return

    fetchAllData()
    const interval = setInterval(fetchAllData, pollInterval)

    setData(prev => ({ ...prev, isConnected: true }))

    return () => {
      clearInterval(interval)
      setData(prev => ({ ...prev, isConnected: false }))
    }
  }, [autoStart, pollInterval, fetchAllData])

  const getFlowData = useCallback((stationId: string) => {
    return data.flowData.get(stationId)
  }, [data.flowData])

  const getPredictions = useCallback((stationId: string) => {
    return data.predictions.get(stationId)
  }, [data.predictions])

  const getStation = useCallback((stationId: string) => {
    return data.stations.find(s => s.id === stationId)
  }, [data.stations])

  const getSecurityActions = useCallback((stationId: string) => {
    return data.securityActions.get(stationId) || []
  }, [data.securityActions])

  const getDispatchActions = useCallback((stationId: string) => {
    return data.dispatchActions.get(stationId) || []
  }, [data.dispatchActions])

  return {
    data,
    error,
    isLoading,
    fetchAllData,
    fetchSecurityActions,
    fetchDispatchActions,
    createSnapshot,
    updateSecurityActionStatus,
    updateDispatchActionStatus,
    getFlowData,
    getPredictions,
    getStation,
    getSecurityActions,
    getDispatchActions
  }
}

export default useDataSync
