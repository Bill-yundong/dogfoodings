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
    <div class="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div class="p-5 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-800">{props.station.name}</h3>
          <div class="flex items-center gap-2">
            <span class={`w-3 h-3 rounded-full ${statusColors[props.station.status]} animate-pulse`}></span>
            <span class={`text-xs font-semibold px-2 py-1 rounded-full ${statusBgColors[props.station.status]}`}>
              {statusText[props.station.status]}
            </span>
          </div>
        </div>
        <div class="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <span>🕐</span> 最后更新: {formatTime(props.station.lastUpdate)}
        </div>
      </div>

      <div class="p-5 space-y-4">
        <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">❄️</span>
              <span class="font-semibold text-blue-800">制冷负荷</span>
            </div>
            <span class="text-xs font-bold text-blue-600 bg-blue-200 px-2 py-1 rounded-full">
              效率 {(props.station.balance.cooling.efficiency * 100).toFixed(1)}%
            </span>
          </div>
          <div class="flex items-end justify-between mb-3">
            <div>
              <span class="text-3xl font-bold text-blue-700">
                {props.station.balance.cooling.current.toFixed(0)}
              </span>
              <span class="text-sm font-medium text-blue-600 ml-1">kW</span>
            </div>
            <div class="text-right text-xs">
              <div class="text-blue-600">目标: {props.station.balance.cooling.target.toFixed(0)} kW</div>
              <div class="text-blue-500">容量: {props.station.balance.cooling.capacity.toFixed(0)} kW</div>
            </div>
          </div>
          <div class="bg-blue-200 rounded-full h-3">
            <div
              class="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500"
              style={`width: ${getPercentage(props.station.balance.cooling.current, props.station.balance.cooling.capacity)}%`}
            ></div>
          </div>
          <div class="text-xs text-blue-600 mt-2 font-medium">
            使用率: {getPercentage(props.station.balance.cooling.current, props.station.balance.cooling.capacity)}%
          </div>
        </div>

        <div class="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">🔥</span>
              <span class="font-semibold text-orange-800">供热负荷</span>
            </div>
            <span class="text-xs font-bold text-orange-600 bg-orange-200 px-2 py-1 rounded-full">
              效率 {(props.station.balance.heating.efficiency * 100).toFixed(1)}%
            </span>
          </div>
          <div class="flex items-end justify-between mb-3">
            <div>
              <span class="text-3xl font-bold text-orange-700">
                {props.station.balance.heating.current.toFixed(0)}
              </span>
              <span class="text-sm font-medium text-orange-600 ml-1">kW</span>
            </div>
            <div class="text-right text-xs">
              <div class="text-orange-600">目标: {props.station.balance.heating.target.toFixed(0)} kW</div>
              <div class="text-orange-500">容量: {props.station.balance.heating.capacity.toFixed(0)} kW</div>
            </div>
          </div>
          <div class="bg-orange-200 rounded-full h-3">
            <div
              class="bg-gradient-to-r from-orange-400 to-orange-600 h-3 rounded-full transition-all duration-500"
              style={`width: ${getPercentage(props.station.balance.heating.current, props.station.balance.heating.capacity)}%`}
            ></div>
          </div>
          <div class="text-xs text-orange-600 mt-2 font-medium">
            使用率: {getPercentage(props.station.balance.heating.current, props.station.balance.heating.capacity)}%
          </div>
        </div>

        <div class="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">⚡</span>
              <span class="font-semibold text-yellow-800">电力负荷</span>
            </div>
            <span class="text-xs font-bold text-yellow-600 bg-yellow-200 px-2 py-1 rounded-full">
              效率 {(props.station.balance.electricity.efficiency * 100).toFixed(1)}%
            </span>
          </div>
          <div class="flex items-end justify-between mb-3">
            <div>
              <span class="text-3xl font-bold text-yellow-700">
                {props.station.balance.electricity.current.toFixed(0)}
              </span>
              <span class="text-sm font-medium text-yellow-600 ml-1">kW</span>
            </div>
            <div class="text-right text-xs">
              <div class="text-yellow-600">目标: {props.station.balance.electricity.target.toFixed(0)} kW</div>
              <div class="text-yellow-500">容量: {props.station.balance.electricity.capacity.toFixed(0)} kW</div>
              <div class="text-green-600 font-semibold mt-1">
                🌱 可再生: {(props.station.balance.electricity.renewableRatio * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div class="bg-yellow-200 rounded-full h-3">
            <div
              class="bg-gradient-to-r from-yellow-400 to-yellow-600 h-3 rounded-full transition-all duration-500"
              style={`width: ${getPercentage(props.station.balance.electricity.current, props.station.balance.electricity.capacity)}%`}
            ></div>
          </div>
          <div class="text-xs text-yellow-600 mt-2 font-medium">
            使用率: {getPercentage(props.station.balance.electricity.current, props.station.balance.electricity.capacity)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnergyStationCard;
