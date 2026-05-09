'use client'

import { useEffect, useState, useCallback } from 'react'
import { IndexedDBStore } from '@/lib/indexeddb-store'
import type { FlowSnapshot, Station, SecurityAction, DispatchAction, CapacityPrediction } from '@/types'

interface UseIndexedDBState {
  isInitialized: boolean
  isLoading: boolean
  error: string | null
}

export function useIndexedDB() {
  const [state, setState] = useState<UseIndexedDBState>({
    isInitialized: false,
    isLoading: false,
    error: null
  })
  const [store, setStore] = useState<IndexedDBStore | null>(null)

  useEffect(() => {
    let isMounted = true

    async function init() {
      setState(prev => ({ ...prev, isLoading: true }))
      try {
        const dbStore = new IndexedDBStore()
        await dbStore.init()
        
        if (isMounted) {
          setStore(dbStore)
          setState({
            isInitialized: true,
            isLoading: false,
            error: null
          })
        }
      } catch (err) {
        if (isMounted) {
          setState({
            isInitialized: false,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to initialize IndexedDB'
          })
        }
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [])

  const saveSnapshot = useCallback(async (snapshot: FlowSnapshot): Promise<boolean> => {
    if (!store) return false
    try {
      await store.saveSnapshot(snapshot)
      return true
    } catch (err) {
      console.error('Failed to save snapshot:', err)
      return false
    }
  }, [store])

  const getRecentSnapshots = useCallback(async (limit: number = 100): Promise<FlowSnapshot[]> => {
    if (!store) return []
    try {
      return await store.getRecentSnapshots(limit)
    } catch (err) {
      console.error('Failed to get snapshots:', err)
      return []
    }
  }, [store])

  const getSnapshotsByStation = useCallback(async (
    stationId: string,
    startTime?: number,
    endTime?: number
  ): Promise<FlowSnapshot[]> => {
    if (!store) return []
    try {
      return await store.getSnapshotsByStation(stationId, startTime, endTime)
    } catch (err) {
      console.error('Failed to get station snapshots:', err)
      return []
    }
  }, [store])

  const saveStation = useCallback(async (station: Station): Promise<boolean> => {
    if (!store) return false
    try {
      await store.saveStation(station)
      return true
    } catch (err) {
      console.error('Failed to save station:', err)
      return false
    }
  }, [store])

  const getAllStations = useCallback(async (): Promise<Station[]> => {
    if (!store) return []
    try {
      return await store.getAllStations()
    } catch (err) {
      console.error('Failed to get stations:', err)
      return []
    }
  }, [store])

  const saveSecurityAction = useCallback(async (action: SecurityAction): Promise<boolean> => {
    if (!store) return false
    try {
      await store.saveSecurityAction(action)
      return true
    } catch (err) {
      console.error('Failed to save security action:', err)
      return false
    }
  }, [store])

  const getSecurityActions = useCallback(async (stationId: string, limit: number = 50): Promise<SecurityAction[]> => {
    if (!store) return []
    try {
      return await store.getSecurityActions(stationId, limit)
    } catch (err) {
      console.error('Failed to get security actions:', err)
      return []
    }
  }, [store])

  const saveDispatchAction = useCallback(async (action: DispatchAction): Promise<boolean> => {
    if (!store) return false
    try {
      await store.saveDispatchAction(action)
      return true
    } catch (err) {
      console.error('Failed to save dispatch action:', err)
      return false
    }
  }, [store])

  const getDispatchActions = useCallback(async (stationId: string, limit: number = 50): Promise<DispatchAction[]> => {
    if (!store) return []
    try {
      return await store.getDispatchActions(stationId, limit)
    } catch (err) {
      console.error('Failed to get dispatch actions:', err)
      return []
    }
  }, [store])

  const savePrediction = useCallback(async (prediction: CapacityPrediction & { id?: number }): Promise<boolean> => {
    if (!store) return false
    try {
      await store.savePrediction(prediction)
      return true
    } catch (err) {
      console.error('Failed to save prediction:', err)
      return false
    }
  }, [store])

  const getPredictions = useCallback(async (stationId: string, limit: number = 20): Promise<CapacityPrediction[]> => {
    if (!store) return []
    try {
      return await store.getPredictions(stationId, limit)
    } catch (err) {
      console.error('Failed to get predictions:', err)
      return []
    }
  }, [store])

  const clearAll = useCallback(async (): Promise<boolean> => {
    if (!store) return false
    try {
      await store.clearAll()
      return true
    } catch (err) {
      console.error('Failed to clear database:', err)
      return false
    }
  }, [store])

  return {
    ...state,
    store,
    saveSnapshot,
    getRecentSnapshots,
    getSnapshotsByStation,
    saveStation,
    getAllStations,
    saveSecurityAction,
    getSecurityActions,
    saveDispatchAction,
    getDispatchActions,
    savePrediction,
    getPredictions,
    clearAll
  }
}

export default useIndexedDB
