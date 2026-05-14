import type { Component } from 'solid-js';
import type { EnergyStation } from '../types/energy';

interface EnergyStationCardProps {
  station: EnergyStation;
}

const statusColors = {
  normal: 'bg-green-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
};

const statusBgColors = {
  normal: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  critical: 'bg-red-100 text-red-700',
};

const statusText = {
  normal: '运行正常',
  warning: '负载警告',
  critical: '异常状态',
};

const EnergyStationCard: Component<EnergyStationCardProps> = (props) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  };

  const getPercentage = (current: number, capacity: number) => {
    return ((current / capacity) * 100).toFixed(1);
  };

  return (
    <div class="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
      <div class="p-3 sm:p-4 border-b border-gray-100">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 class="text-base sm:text-lg font-bold text-gray-800 truncate">{props.station.name}</h3>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${statusColors[props.station.status]} animate-pulse`}></span>
            <span class={`text-xs font-semibold px-2 py-0.5 sm:py-1 rounded-full ${statusBgColors[props.station.status]}`}>
              {statusText[props.station.status]}
            </span>
          </div>
        </div>
        <div class="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
          <span>🕐</span> 更新: {formatTime(props.station.lastUpdate)}
        </div>
      </div>

      <div class="p-3 sm:p-4 space-y-3">
        <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 sm:p-3.5">
          <div class="flex items-center justify-between mb-2.5">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <span class="text-lg sm:text-xl">❄️</span>
              <span class="font-semibold text-blue-800 text-xs sm:text-sm">制冷负荷</span>
            </div>
            <span class="text-xs font-bold text-blue-600 bg-blue-200 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
              效率 {(props.station.balance.cooling.efficiency * 100).toFixed(1)}%
            </span>
          </div>
          <div class="flex items-end justify-between mb-2.5">
            <div class="min-w-0">
              <span class="text-2xl sm:text-3xl font-bold text-blue-700">
                {props.station.balance.cooling.current.toFixed(0)}
              </span>
              <span class="text-xs sm:text-sm font-medium text-blue-600 ml-0.5 sm:ml-1">kW</span>
            </div>
            <div class="text-right text-xs min-w-0 ml-2">
              <div class="text-blue-600 truncate">目标: {props.station.balance.cooling.target.toFixed(0)} kW</div>
              <div class="text-blue-500 truncate">容量: {props.station.balance.cooling.capacity.toFixed(0)} kW</div>
            </div>
          </div>
          <div class="bg-blue-200 rounded-full h-2 sm:h-2.5">
            <div
              class="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-500"
              style={`width: ${getPercentage(props.station.balance.cooling.current, props.station.balance.cooling.capacity)}%`}
            ></div>
          </div>
          <div class="text-xs text-blue-600 mt-1.5 font-medium">
            使用率: {getPercentage(props.station.balance.cooling.current, props.station.balance.cooling.capacity)}%
          </div>
        </div>

        <div class="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-3 sm:p-3.5">
          <div class="flex items-center justify-between mb-2.5">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <span class="text-lg sm:text-xl">🔥</span>
              <span class="font-semibold text-orange-800 text-xs sm:text-sm">供热负荷</span>
            </div>
            <span class="text-xs font-bold text-orange-600 bg-orange-200 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
              效率 {(props.station.balance.heating.efficiency * 100).toFixed(1)}%
            </span>
          </div>
          <div class="flex items-end justify-between mb-2.5">
            <div class="min-w-0">
              <span class="text-2xl sm:text-3xl font-bold text-orange-700">
                {props.station.balance.heating.current.toFixed(0)}
              </span>
              <span class="text-xs sm:text-sm font-medium text-orange-600 ml-0.5 sm:ml-1">kW</span>
            </div>
            <div class="text-right text-xs min-w-0 ml-2">
              <div class="text-orange-600 truncate">目标: {props.station.balance.heating.target.toFixed(0)} kW</div>
              <div class="text-orange-500 truncate">容量: {props.station.balance.heating.capacity.toFixed(0)} kW</div>
            </div>
          </div>
          <div class="bg-orange-200 rounded-full h-2 sm:h-2.5">
            <div
              class="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-500"
              style={`width: ${getPercentage(props.station.balance.heating.current, props.station.balance.heating.capacity)}%`}
            ></div>
          </div>
          <div class="text-xs text-orange-600 mt-1.5 font-medium">
            使用率: {getPercentage(props.station.balance.heating.current, props.station.balance.heating.capacity)}%
          </div>
        </div>

        <div class="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-3 sm:p-3.5">
          <div class="flex items-center justify-between mb-2.5">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <span class="text-lg sm:text-xl">⚡</span>
              <span class="font-semibold text-yellow-800 text-xs sm:text-sm">电力负荷</span>
            </div>
            <span class="text-xs font-bold text-yellow-600 bg-yellow-200 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
              效率 {(props.station.balance.electricity.efficiency * 100).toFixed(1)}%
            </span>
          </div>
          <div class="flex items-end justify-between mb-2.5">
            <div class="min-w-0">
              <span class="text-2xl sm:text-3xl font-bold text-yellow-700">
                {props.station.balance.electricity.current.toFixed(0)}
              </span>
              <span class="text-xs sm:text-sm font-medium text-yellow-600 ml-0.5 sm:ml-1">kW</span>
            </div>
            <div class="text-right text-xs min-w-0 ml-2">
              <div class="text-yellow-600 truncate">目标: {props.station.balance.electricity.target.toFixed(0)} kW</div>
              <div class="text-yellow-500 truncate">容量: {props.station.balance.electricity.capacity.toFixed(0)} kW</div>
              <div class="text-green-600 font-semibold mt-0.5 truncate">
                🌱 可再生: {(props.station.balance.electricity.renewableRatio * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div class="bg-yellow-200 rounded-full h-2 sm:h-2.5">
            <div
              class="bg-gradient-to-r from-yellow-400 to-yellow-600 h-full rounded-full transition-all duration-500"
              style={`width: ${getPercentage(props.station.balance.electricity.current, props.station.balance.electricity.capacity)}%`}
            ></div>
          </div>
          <div class="text-xs text-yellow-600 mt-1.5 font-medium">
            使用率: {getPercentage(props.station.balance.electricity.current, props.station.balance.electricity.capacity)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnergyStationCard;
