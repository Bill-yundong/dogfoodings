'use client'

import type { DispatchAction, Station, PassengerFlow, CapacityPrediction } from '@/types'
import { getPriorityColor, getStatusColor, getStatusLabel, formatTimestamp, formatNumber, formatPercentage } from '@/lib/utils'

interface DispatchModuleProps {
  station: Station
  flow?: PassengerFlow
  predictions?: CapacityPrediction[]
  actions: DispatchAction[]
  onUpdateAction: (actionId: string, status: DispatchAction['status']) => void
}

export function DispatchModule({ station, flow, predictions, actions, onUpdateAction }: DispatchModuleProps) {
  const actionTypeLabels: Record<string, string> = {
    train_addition: '增派列车',
    route_adjustment: '线路调整',
    speed_adjustment: '车速调整',
    platform_assignment: '站台分配'
  }

  const pendingActions = actions.filter(a => a.status === 'pending')
  const inProgressActions = actions.filter(a => a.status === 'in_progress')

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">行车调度模块</h2>
        <p className="text-blue-100 text-sm mt-1">{station.name} | {station.lineId}</p>
      </div>

      {flow && (
        <div className="p-4 border-b border-gray-100 bg-blue-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">站台数量</p>
              <p className="text-lg font-semibold text-gray-800">{station.platformCount} 个</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">进站/出口</p>
              <p className="text-lg font-semibold text-gray-800">{station.entranceCount}/{station.exitCount}</p>
            </div>
          </div>
        </div>
      )}

      {predictions && predictions.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            运力预测（排队论引擎）
          </h3>
          <div className="space-y-3">
            {predictions.map((prediction, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {prediction.forecastWindow} 分钟后
                  </span>
                  <span className="text-xs text-gray-500">
                    置信度 {formatPercentage(prediction.confidence)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">预计客流</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {formatNumber(prediction.predictedPassengers)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">容量利用率</p>
                    <p className={`text-sm font-semibold ${
                      prediction.capacityUtilization > 0.9 ? 'text-red-600' :
                      prediction.capacityUtilization > 0.7 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {formatPercentage(prediction.capacityUtilization)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">推荐增车</p>
                    <p className={`text-sm font-semibold ${
                      prediction.recommendedTrains > 0 ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {prediction.recommendedTrains} 列
                    </p>
                  </div>
                </div>
                {prediction.capacityGap > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-orange-600">
                      运力缺口: {formatNumber(Math.floor(prediction.capacityGap))} 人
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${(pendingActions.length + inProgressActions.length) > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
          调度指令
          <span className="text-xs font-normal text-gray-400">
            ({pendingActions.length} 待处理 / {inProgressActions.length} 处理中)
          </span>
        </h3>

        {actions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>暂无调度指令</p>
            <p className="text-sm mt-1">运力充足，无需调整</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {actions.map(action => (
              <div
                key={action.id}
                className={`border rounded-lg p-3 ${
                  action.priority === 'critical' ? 'border-red-300 bg-red-50' :
                  action.priority === 'high' ? 'border-orange-300 bg-orange-50' :
                    'border-gray-200 bg-white'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(action.priority)}`}>
                      {action.priority === 'critical' ? '紧急' : 
                      action.priority === 'high' ? '高' :
                      action.priority === 'medium' ? '中' : '低'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {actionTypeLabels[action.actionType] || action.actionType}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(action.status)}`}>
                    {getStatusLabel(action.status)}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-2">{action.description}</p>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">
                    {formatTimestamp(action.timestamp)}
                  </span>

                  {action.status === 'pending' && (
                    <button
                      onClick={() => onUpdateAction(action.id, 'in_progress')}
                      className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors"
                    >
                      执行
                    </button>
                  )}
                  {action.status === 'in_progress' && (
                    <button
                      onClick={() => onUpdateAction(action.id, 'completed')}
                      className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors"
                    >
                      完成
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DispatchModule
