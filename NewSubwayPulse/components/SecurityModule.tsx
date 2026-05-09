'use client'

import type { SecurityAction, Station, PassengerFlow } from '@/types'
import { getPriorityColor, getStatusColor, getStatusLabel, formatTimestamp, getCongestionColor, getCongestionLabel } from '@/lib/utils'

interface SecurityModuleProps {
  station: Station
  flow?: PassengerFlow
  actions: SecurityAction[]
  onUpdateAction: (actionId: string, status: SecurityAction['status']) => void
}

export function SecurityModule({ station, flow, actions, onUpdateAction }: SecurityModuleProps) {
  const actionTypeLabels: Record<string, string> = {
    entrance_control: '入口控制',
    platform_management: '站台管理',
    emergency_response: '紧急响应',
    staff_deployment: '人员调配'
  }

  const pendingActions = actions.filter(a => a.status === 'pending')
  const inProgressActions = actions.filter(a => a.status === 'in_progress')
  const completedActions = actions.filter(a => a.status === 'completed')

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">车站安防模块</h2>
        <p className="text-red-100 text-sm mt-1">{station.name}</p>
      </div>

      {flow && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-gray-600">实时客流状态：</span>
            <span className={`font-medium ${flow.congestionLevel === 'critical' ? 'text-red-600' : 
                                        flow.congestionLevel === 'high' ? 'text-orange-600' : 'text-green-600'}`}>
              {flow.currentCount.toLocaleString()} 人
            </span>
            <span className={`px-2 py-0.5 rounded text-xs text-white ${getCongestionColor(flow.congestionLevel)}`}>
              {getCongestionLabel(flow.congestionLevel)}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{pendingActions.length}</p>
            <p className="text-xs text-red-500 mt-1">待处理</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{inProgressActions.length}</p>
            <p className="text-xs text-yellow-600 mt-1">处理中</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{completedActions.length}</p>
            <p className="text-xs text-green-500 mt-1">已完成</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">安防措施</h3>
          
          {actions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>暂无安防措施</p>
              <p className="text-sm mt-1">客流正常，无需干预</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
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
                        开始处理
                      </button>
                    )}
                    {action.status === 'in_progress' && (
                      <button
                        onClick={() => onUpdateAction(action.id, 'completed')}
                        className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors"
                      >
                        标记完成
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SecurityModule
