'use client'

import type { Station, PassengerFlow, CapacityPrediction } from '@/types'
import { getCongestionColor, getCongestionLabel, getCongestionTextColor, formatNumber, formatPercentage } from '@/lib/utils'

interface StationCardProps {
  station: Station
  flow?: PassengerFlow
  predictions?: CapacityPrediction[]
  onSelect: (stationId: string) => void
  isSelected: boolean
}

export function StationCard({ station, flow, predictions, onSelect, isSelected }: StationCardProps) {
  if (!flow) {
    return (
      <div
        onClick={() => onSelect(station.id)}
        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
          isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 bg-white hover:border-blue-300'
        }`}
      >
        <h3 className="font-semibold text-gray-700">{station.name}</h3>
        <p className="text-sm text-gray-500 mt-1">数据加载中...</p>
      </div>
    )
  }

  const capacityUtilization = flow.currentCount / station.maxCapacity
  const latestPrediction = predictions?.[0]

  return (
    <div
      onClick={() => onSelect(station.id)}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-800 text-lg">{station.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">最大容量: {formatNumber(station.maxCapacity)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getCongestionColor(flow.congestionLevel)}`}>
          {getCongestionLabel(flow.congestionLevel)}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">当前客流</span>
            <span className="font-medium">{formatNumber(flow.currentCount)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getCongestionColor(flow.congestionLevel)}`}
              style={{ width: `${Math.min(100, capacityUtilization * 100)}%` }}
            />
          </div>
          <p className={`text-xs mt-1 ${getCongestionTextColor(flow.congestionLevel)}`}>
            容量利用: {formatPercentage(capacityUtilization)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-500">进站率</p>
            <p className="text-sm font-medium text-gray-700">{flow.entryRate.toFixed(1)}</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-500">出站率</p>
            <p className="text-sm font-medium text-gray-700">{flow.exitRate.toFixed(1)}</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-500">换乘率</p>
            <p className="text-sm font-medium text-gray-700">{flow.transferRate.toFixed(1)}</p>
          </div>
        </div>

        {latestPrediction && latestPrediction.capacityGap > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded p-3">
            <p className="text-xs font-medium text-orange-700 mb-1">运力预警</p>
            <p className="text-sm text-orange-600">
              {latestPrediction.forecastWindow}分钟后预计缺口 {formatNumber(Math.floor(latestPrediction.capacityGap))} 人
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StationCard
