'use client'

import { useState, useEffect } from 'react'
import type { FlowSnapshot } from '@/types'
import { useIndexedDB } from '@/hooks/useIndexedDB'
import { formatTimestamp, formatNumber, getCongestionLabel, getCongestionColor } from '@/lib/utils'

interface SnapshotViewerProps {
  selectedStationId?: string | null
  onLoadSnapshot?: (snapshot: FlowSnapshot) => void
}

export function SnapshotViewer({ selectedStationId, onLoadSnapshot }: SnapshotViewerProps) {
  const [snapshots, setSnapshots] = useState<FlowSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { isInitialized, getRecentSnapshots, getSnapshotsByStation } = useIndexedDB()

  useEffect(() => {
    if (!isInitialized) return
    loadSnapshots()
  }, [isInitialized, selectedStationId])

  async function loadSnapshots() {
    setIsLoading(true)
    try {
      let results: FlowSnapshot[]
      if (selectedStationId) {
        results = await getSnapshotsByStation(selectedStationId)
      } else {
        results = await getRecentSnapshots(50)
      }
      setSnapshots(results)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">历史快照</h2>
            <p className="text-purple-100 text-sm mt-1">IndexedDB 本地存储</p>
          </div>
          <button
            onClick={loadSnapshots}
            disabled={isLoading}
            className="text-sm bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded transition-colors"
          >
            刷新
          </button>
        </div>
      </div>

      <div className="p-4">
        {!isInitialized ? (
          <div className="text-center py-8 text-gray-400">
            <p>正在初始化 IndexedDB...</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8 text-gray-400">
            <p>加载中...</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>暂无历史快照</p>
            <p className="text-sm mt-1">点击"保存快照"按钮创建快照</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer"
                onClick={() => onLoadSnapshot?.(snapshot)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      快照 ID: {snapshot.id.slice(0, 12)}...
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTimestamp(snapshot.timestamp)}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs text-white ${getCongestionColor(snapshot.flowData.congestionLevel)}`}>
                    {getCongestionLabel(snapshot.flowData.congestionLevel)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">客流</p>
                    <p className="text-sm font-medium text-gray-700">
                      {formatNumber(snapshot.flowData.currentCount)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">安防措施</p>
                    <p className="text-sm font-medium text-gray-700">
                      {snapshot.securityActions.length}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">调度指令</p>
                    <p className="text-sm font-medium text-gray-700">
                      {snapshot.dispatchActions.length}
                    </p>
                  </div>
                </div>

                {snapshot.predictions.length > 0 && (
                  <div className="text-xs text-purple-600">
                    预测窗口: {snapshot.predictions.map(p => `${p.forecastWindow}分钟`).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SnapshotViewer
