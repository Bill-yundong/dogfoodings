'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDataSync } from '@/hooks/useDataSync'
import { useIndexedDB } from '@/hooks/useIndexedDB'
import { StationCard } from '@/components/StationCard'
import { SecurityModule } from '@/components/SecurityModule'
import { DispatchModule } from '@/components/DispatchModule'
import { SnapshotViewer } from '@/components/SnapshotViewer'
import { formatTimestamp } from '@/lib/utils'
import type { FlowSnapshot, SecurityAction, DispatchAction } from '@/types'

export default function HomePage() {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeModule, setActiveModule] = useState<'security' | 'dispatch' | 'snapshots'>('security')

  const {
    data,
    error,
    isLoading,
    createSnapshot,
    updateSecurityActionStatus,
    updateDispatchActionStatus,
    getFlowData,
    getPredictions,
    getStation,
    getSecurityActions,
    getDispatchActions
  } = useDataSync()

  const { saveSnapshot, isInitialized: dbInitialized } = useIndexedDB()

  const selectedStation = selectedStationId ? getStation(selectedStationId) : null
  const selectedFlow = selectedStationId ? getFlowData(selectedStationId) : undefined
  const selectedPredictions = selectedStationId ? getPredictions(selectedStationId) : undefined
  const securityActions = selectedStationId ? getSecurityActions(selectedStationId) : []
  const dispatchActions = selectedStationId ? getDispatchActions(selectedStationId) : []

  const handleSelectStation = useCallback((stationId: string) => {
    setSelectedStationId(stationId)
  }, [])

  const handleCreateSnapshot = useCallback(async () => {
    if (!selectedStationId) return

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const snapshot = await createSnapshot(selectedStationId)
      
      if (snapshot && dbInitialized) {
        const saved = await saveSnapshot(snapshot)
        if (saved) {
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 3000)
        }
      }
    } catch (err) {
      console.error('Failed to create snapshot:', err)
    } finally {
      setIsSaving(false)
    }
  }, [selectedStationId, createSnapshot, saveSnapshot, dbInitialized])

  const handleLoadSnapshot = useCallback((snapshot: FlowSnapshot) => {
    console.log('Loading snapshot:', snapshot)
  }, [])

  const handleUpdateSecurityAction = useCallback(async (
    actionId: string,
    status: SecurityAction['status']
  ) => {
    if (!selectedStationId) return
    await updateSecurityActionStatus(selectedStationId, actionId, status)
  }, [selectedStationId, updateSecurityActionStatus])

  const handleUpdateDispatchAction = useCallback(async (
    actionId: string,
    status: DispatchAction['status']
  ) => {
    if (!selectedStationId) return
    await updateDispatchActionStatus(selectedStationId, actionId, status)
  }, [selectedStationId, updateDispatchActionStatus])

  const criticalStations = data.stations.filter(s => {
    const flow = data.flowData.get(s.id)
    return flow && (flow.congestionLevel === 'critical' || flow.congestionLevel === 'high')
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">NewSubwayPulse</h1>
              <p className="text-slate-300 text-sm mt-1">轨道交通客流涌浪优化系统</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${data.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm text-slate-300">
                  {data.isConnected ? '已连接' : '未连接'}
                </span>
              </div>
              
              {data.lastUpdate && (
                <div className="text-xs text-slate-400">
                  最后更新: {formatTimestamp(data.lastUpdate)}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-slate-300 text-xs">监控车站</p>
              <p className="text-2xl font-bold text-white mt-1">{data.stations.length}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-slate-300 text-xs">高/危险车站</p>
              <p className="text-2xl font-bold text-orange-400 mt-1">{criticalStations.length}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-slate-300 text-xs">安防待处理</p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                {Array.from(data.securityActions.values()).flat().filter(a => a.status === 'pending').length}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-slate-300 text-xs">调度待处理</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {Array.from(data.dispatchActions.values()).flat().filter(a => a.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">车站监控</h2>
              
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto pr-1">
                  {data.stations.map(station => (
                    <StationCard
                      key={station.id}
                      station={station}
                      flow={data.flowData.get(station.id)}
                      predictions={data.predictions.get(station.id)}
                      onSelect={handleSelectStation}
                      isSelected={selectedStationId === station.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-8">
            {!selectedStation ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">选择车站查看详情</h3>
                  <p className="text-sm text-gray-400">从左侧列表选择一个车站以查看安防和调度模块</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{selectedStation.name}</h2>
                      <p className="text-sm text-gray-500">
                        站点 {selectedStation.id} | 线路 {selectedStation.lineId}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {saveSuccess && (
                        <span className="text-sm text-green-600 font-medium animate-pulse">
                          快照已保存 ✓
                        </span>
                      )}
                      <button
                        onClick={handleCreateSnapshot}
                        disabled={isSaving || !dbInitialized}
                        className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        {isSaving ? '保存中...' : '保存快照'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-b border-gray-200">
                    <button
                      onClick={() => setActiveModule('security')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeModule === 'security'
                          ? 'border-red-500 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      安防模块
                    </button>
                    <button
                      onClick={() => setActiveModule('dispatch')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeModule === 'dispatch'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      调度模块
                    </button>
                    <button
                      onClick={() => setActiveModule('snapshots')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeModule === 'snapshots'
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      历史快照
                    </button>
                  </div>
                </div>

                {activeModule === 'security' && (
                  <SecurityModule
                    station={selectedStation}
                    flow={selectedFlow}
                    actions={securityActions}
                    onUpdateAction={handleUpdateSecurityAction}
                  />
                )}

                {activeModule === 'dispatch' && (
                  <DispatchModule
                    station={selectedStation}
                    flow={selectedFlow}
                    predictions={selectedPredictions}
                    actions={dispatchActions}
                    onUpdateAction={handleUpdateDispatchAction}
                  />
                )}

                {activeModule === 'snapshots' && (
                  <SnapshotViewer
                    selectedStationId={selectedStationId}
                    onLoadSnapshot={handleLoadSnapshot}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-8 py-4 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>NewSubwayPulse v0.1.0 | 基于排队论的轨道交通客流涌浪优化系统</p>
          <p className="mt-1 text-xs text-gray-400">
            实时数据同步 · 异步排队论预测 · IndexedDB 本地存储
          </p>
        </div>
      </footer>
    </main>
  )
}
