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

const statusText = {
  normal: '正常',
  warning: '警告',
  critical: '异常',
};

const EnergyStationCard: Component<EnergyStationCardProps> = (props) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  };

  const getPercentage = (current: number, capacity: number) => {
    return ((current / capacity) * 100).toFixed(1);
  };

  return (
    <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-gray-800">{props.station.name}</h3>
        <div class="flex items-center gap-2">
          <span class={`w-3 h-3 rounded-full ${statusColors[props.station.status]} animate-pulse`}></span>
          <span class="text-sm text-gray-600">{statusText[props.station.status]}</span>
        </div>
      </div>

      <div class="text-xs text-gray-400 mb-4">
        最后更新: {formatTime(props.station.lastUpdate)}
      </div>

      <div class="space-y-4">
        <div class="bg-blue-50 rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-blue-700">❄️ 制冷负荷</span>
            <span class="text-xs text-blue-600">效率: {(props.station.balance.cooling.efficiency * 100).toFixed(1)}%</span>
          </div>
          <div class="flex items-center justify-between">
            <div class="text-2xl font-bold text-blue-800">
              {props.station.balance.cooling.current.toFixed(0)}
              <span class="text-sm font-normal text-blue-600"> kW</span>
            </div>
            <div class="text-right">
              <div class="text-xs text-blue-500">目标: {props.station.balance.cooling.target.toFixed(0)} kW</div>
              <div class="text-xs text-blue-500">容量: {props.station.balance.cooling.capacity.toFixed(0)} kW</div>
            </div>
          </div>
          <div class="mt-2 bg-blue-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={`width: ${getPercentage(props.station.balance.cooling.current, props.station.balance.cooling.capacity)}%`}
            ></div>
          </div>
          <div class="text-xs text-blue-500 mt-1">
            使用率: {getPercentage(props.station.balance.cooling.current, props.station.balance.cooling.capacity)}%
          </div>
        </div>

        <div class="bg-orange-50 rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-orange-700">🔥 供热负荷</span>
            <span class="text-xs text-orange-600">效率: {(props.station.balance.heating.efficiency * 100).toFixed(1)}%</span>
          </div>
          <div class="flex items-center justify-between">
            <div class="text-2xl font-bold text-orange-800">
              {props.station.balance.heating.current.toFixed(0)}
              <span class="text-sm font-normal text-orange-600"> kW</span>
            </div>
            <div class="text-right">
              <div class="text-xs text-orange-500">目标: {props.station.balance.heating.target.toFixed(0)} kW</div>
              <div class="text-xs text-orange-500">容量: {props.station.balance.heating.capacity.toFixed(0)} kW</div>
            </div>
          </div>
          <div class="mt-2 bg-orange-200 rounded-full h-2">
            <div
              class="bg-orange-600 h-2 rounded-full transition-all duration-500"
              style={`width: ${getPercentage(props.station.balance.heating.current, props.station.balance.heating.capacity)}%`}
            ></div>
          </div>
          <div class="text-xs text-orange-500 mt-1">
            使用率: {getPercentage(props.station.balance.heating.current, props.station.balance.heating.capacity)}%
          </div>
        </div>

        <div class="bg-yellow-50 rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-yellow-700">⚡ 电力负荷</span>
            <span class="text-xs text-yellow-600">效率: {(props.station.balance.electricity.efficiency * 100).toFixed(1)}%</span>
          </div>
          <div class="flex items-center justify-between">
            <div class="text-2xl font-bold text-yellow-800">
              {props.station.balance.electricity.current.toFixed(0)}
              <span class="text-sm font-normal text-yellow-600"> kW</span>
            </div>
            <div class="text-right">
              <div class="text-xs text-yellow-500">目标: {props.station.balance.electricity.target.toFixed(0)} kW</div>
              <div class="text-xs text-yellow-500">容量: {props.station.balance.electricity.capacity.toFixed(0)} kW</div>
              <div class="text-xs text-green-600">可再生: {(props.station.balance.electricity.renewableRatio * 100).toFixed(1)}%</div>
            </div>
          </div>
          <div class="mt-2 bg-yellow-200 rounded-full h-2">
            <div
              class="bg-yellow-600 h-2 rounded-full transition-all duration-500"
              style={`width: ${getPercentage(props.station.balance.electricity.current, props.station.balance.electricity.capacity)}%`}
            ></div>
          </div>
          <div class="text-xs text-yellow-500 mt-1">
            使用率: {getPercentage(props.station.balance.electricity.current, props.station.balance.electricity.capacity)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnergyStationCard;
