import type { Component } from 'solid-js';
import { For } from 'solid-js';
import type { CommandCenterData, WeatherCondition } from '../types/energy';
import EnergyStationCard from './EnergyStationCard';

interface CommandCenterProps {
  data: CommandCenterData;
  weather: WeatherCondition;
}

const CommandCenter: Component<CommandCenterProps> = (props) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  };

  const weatherTypeText = {
    typical_summer: '夏季典型日',
    typical_winter: '冬季典型日',
    typical_spring: '春季典型日',
    typical_autumn: '秋季典型日',
  };

  return (
    <div class="min-h-screen bg-gray-50">
      <header class="bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold flex items-center gap-2">
                <span class="text-3xl">🏙️</span>
                智慧城区能源指挥中心
              </h1>
              <p class="text-blue-100 mt-1 text-sm">
                冷热电三联供 | 多能互补 | 低碳运行
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm text-blue-100">数据对齐时间</div>
              <div class="text-lg font-semibold">{formatTime(props.data.lastAlignment)}</div>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">总制冷负荷</p>
                <p class="text-3xl font-bold text-blue-600 mt-1">
                  {props.data.totalBalance.cooling.current.toFixed(0)}
                  <span class="text-lg font-normal text-gray-400"> kW</span>
                </p>
              </div>
              <div class="text-4xl">❄️</div>
            </div>
            <div class="mt-4 flex justify-between text-sm">
              <span class="text-gray-500">目标: {props.data.totalBalance.cooling.target.toFixed(0)} kW</span>
              <span class="text-green-600">效率: {(props.data.totalBalance.cooling.efficiency * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">总供热负荷</p>
                <p class="text-3xl font-bold text-orange-600 mt-1">
                  {props.data.totalBalance.heating.current.toFixed(0)}
                  <span class="text-lg font-normal text-gray-400"> kW</span>
                </p>
              </div>
              <div class="text-4xl">🔥</div>
            </div>
            <div class="mt-4 flex justify-between text-sm">
              <span class="text-gray-500">目标: {props.data.totalBalance.heating.target.toFixed(0)} kW</span>
              <span class="text-green-600">效率: {(props.data.totalBalance.heating.efficiency * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">总电力负荷</p>
                <p class="text-3xl font-bold text-yellow-600 mt-1">
                  {props.data.totalBalance.electricity.current.toFixed(0)}
                  <span class="text-lg font-normal text-gray-400"> kW</span>
                </p>
              </div>
              <div class="text-4xl">⚡</div>
            </div>
            <div class="mt-4 flex justify-between text-sm">
              <span class="text-gray-500">目标: {props.data.totalBalance.electricity.target.toFixed(0)} kW</span>
              <span class="text-green-600">可再生: {(props.data.totalBalance.electricity.renewableRatio * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">系统综合效率</p>
                <p class="text-3xl font-bold text-green-600 mt-1">
                  {props.data.efficiencyScore.toFixed(1)}
                  <span class="text-lg font-normal text-gray-400"> 分</span>
                </p>
              </div>
              <div class="text-4xl">📊</div>
            </div>
            <div class="mt-4">
              <div class="bg-gray-200 rounded-full h-3">
                <div
                  class="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={`width: ${Math.min(props.data.efficiencyScore, 100)}%`}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>🌍</span> 碳排放监控
            </h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <p class="text-sm text-gray-500">当前碳排放</p>
                  <p class="text-2xl font-bold text-red-600">{props.data.carbonEmission.toFixed(1)} kgCO₂/h</p>
                </div>
                <div class="text-3xl">💨</div>
              </div>
              <div class="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p class="text-sm text-gray-500">碳减排量</p>
                  <p class="text-2xl font-bold text-green-600">{props.data.carbonReduction.toFixed(1)} kgCO₂/h</p>
                </div>
                <div class="text-3xl">🌱</div>
              </div>
              <div class="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p class="text-sm text-gray-500">减排率</p>
                  <p class="text-2xl font-bold text-blue-600">
                    {((props.data.carbonReduction / (props.data.carbonEmission + props.data.carbonReduction)) * 100).toFixed(1)}%
                  </p>
                </div>
                <div class="text-3xl">📈</div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>🌤️</span> 气象条件
            </h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-gray-600">🌡️ 温度</span>
                <span class="font-semibold text-gray-800">{props.weather.temperature.toFixed(1)}°C</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">💧 湿度</span>
                <span class="font-semibold text-gray-800">{props.weather.humidity.toFixed(1)}%</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">☀️ 太阳辐射</span>
                <span class="font-semibold text-gray-800">{props.weather.solarRadiation.toFixed(0)} W/m²</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">🌬️ 风速</span>
                <span class="font-semibold text-gray-800">{props.weather.windSpeed.toFixed(1)} m/s</span>
              </div>
              <div class="mt-4 p-3 bg-gray-50 rounded-lg">
                <p class="text-sm text-gray-500">数据更新时间</p>
                <p class="font-semibold text-gray-700">{formatTime(props.weather.timestamp)}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>🔄</span> 多能互补态势
            </h3>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-600">制冷平衡</span>
                  <span class="text-blue-600">
                    {((props.data.totalBalance.cooling.current / props.data.totalBalance.cooling.target) * 100).toFixed(1)}%
                  </span>
                </div>
                <div class="bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={`width: ${Math.min((props.data.totalBalance.cooling.current / props.data.totalBalance.cooling.target) * 100, 120)}%`}
                  ></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-600">供热平衡</span>
                  <span class="text-orange-600">
                    {((props.data.totalBalance.heating.current / props.data.totalBalance.heating.target) * 100).toFixed(1)}%
                  </span>
                </div>
                <div class="bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-orange-500 h-2 rounded-full transition-all duration-500"
                    style={`width: ${Math.min((props.data.totalBalance.heating.current / props.data.totalBalance.heating.target) * 100, 120)}%`}
                  ></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-600">电力平衡</span>
                  <span class="text-yellow-600">
                    {((props.data.totalBalance.electricity.current / props.data.totalBalance.electricity.target) * 100).toFixed(1)}%
                  </span>
                </div>
                <div class="bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                    style={`width: ${Math.min((props.data.totalBalance.electricity.current / props.data.totalBalance.electricity.target) * 100, 120)}%`}
                  ></div>
                </div>
              </div>
              <div class="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                <p class="text-sm text-green-700 font-medium">✅ 系统运行正常</p>
                <p class="text-xs text-green-600 mt-1">多能源协同优化中，负荷分配合理</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-6">
          <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>🏭</span> 能源站监控
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <For each={props.data.stations}>
              {(station) => <EnergyStationCard station={station} />}
            </For>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CommandCenter;
