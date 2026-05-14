import type { Component } from 'solid-js';
import { For } from 'solid-js';
import type { CommandCenterData, WeatherCondition } from '../types/energy';
import EnergyStationCard from './EnergyStationCard';

interface CommandCenterProps {
  data: CommandCenterData;
  weather: WeatherCondition;
}

const CommandCenter: Component<CommandCenterProps> = (props) => {
  return (
    <div class="space-y-4 sm:space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div class="bg-white rounded-xl shadow-md p-4 sm:p-5 border-l-4 border-blue-500 hover:shadow-lg transition-all duration-300">
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-xs sm:text-sm text-gray-500 font-medium truncate">总制冷负荷</p>
              <p class="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">
                {props.data.totalBalance.cooling.current.toFixed(0)}
                <span class="text-xs sm:text-sm font-normal text-gray-400 ml-1">kW</span>
              </p>
            </div>
            <div class="text-3xl sm:text-4xl flex-shrink-0">❄️</div>
          </div>
          <div class="mt-3 sm:mt-4 flex flex-wrap gap-2 text-xs sm:text-sm">
            <span class="text-gray-600 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">目标: {props.data.totalBalance.cooling.target.toFixed(0)}</span>
            <span class="text-green-600 bg-green-50 px-2 sm:px-3 py-1 rounded-full font-semibold">效率: {(props.data.totalBalance.cooling.efficiency * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-md p-4 sm:p-5 border-l-4 border-orange-500 hover:shadow-lg transition-all duration-300">
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-xs sm:text-sm text-gray-500 font-medium truncate">总供热负荷</p>
              <p class="text-2xl sm:text-3xl font-bold text-orange-600 mt-1">
                {props.data.totalBalance.heating.current.toFixed(0)}
                <span class="text-xs sm:text-sm font-normal text-gray-400 ml-1">kW</span>
              </p>
            </div>
            <div class="text-3xl sm:text-4xl flex-shrink-0">🔥</div>
          </div>
          <div class="mt-3 sm:mt-4 flex flex-wrap gap-2 text-xs sm:text-sm">
            <span class="text-gray-600 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">目标: {props.data.totalBalance.heating.target.toFixed(0)}</span>
            <span class="text-green-600 bg-green-50 px-2 sm:px-3 py-1 rounded-full font-semibold">效率: {(props.data.totalBalance.heating.efficiency * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-md p-4 sm:p-5 border-l-4 border-yellow-500 hover:shadow-lg transition-all duration-300">
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-xs sm:text-sm text-gray-500 font-medium truncate">总电力负荷</p>
              <p class="text-2xl sm:text-3xl font-bold text-yellow-600 mt-1">
                {props.data.totalBalance.electricity.current.toFixed(0)}
                <span class="text-xs sm:text-sm font-normal text-gray-400 ml-1">kW</span>
              </p>
            </div>
            <div class="text-3xl sm:text-4xl flex-shrink-0">⚡</div>
          </div>
          <div class="mt-3 sm:mt-4 flex flex-wrap gap-2 text-xs sm:text-sm">
            <span class="text-gray-600 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">目标: {props.data.totalBalance.electricity.target.toFixed(0)}</span>
            <span class="text-green-600 bg-green-50 px-2 sm:px-3 py-1 rounded-full font-semibold">可再生: {(props.data.totalBalance.electricity.renewableRatio * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-md p-4 sm:p-5 border-l-4 border-green-500 hover:shadow-lg transition-all duration-300">
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-xs sm:text-sm text-gray-500 font-medium truncate">系统综合效率</p>
              <p class="text-2xl sm:text-3xl font-bold text-green-600 mt-1">
                {props.data.efficiencyScore.toFixed(1)}
                <span class="text-xs sm:text-sm font-normal text-gray-400 ml-1">分</span>
              </p>
            </div>
            <div class="text-3xl sm:text-4xl flex-shrink-0">📊</div>
          </div>
          <div class="mt-3 sm:mt-4">
            <div class="bg-gray-200 rounded-full h-2 sm:h-3">
              <div
                class="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-500"
                style={`width: ${Math.min(props.data.efficiencyScore, 100)}%`}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <div class="bg-white rounded-xl shadow-md p-4 sm:p-5 hover:shadow-lg transition-all duration-300">
          <h3 class="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
            <span class="text-xl sm:text-2xl">🌍</span> 碳排放监控
          </h3>
          <div class="space-y-3 sm:space-y-4">
            <div class="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl">
              <div class="flex-1 min-w-0">
                <p class="text-xs sm:text-sm text-gray-600 font-medium truncate">当前碳排放</p>
                <p class="text-xl sm:text-2xl font-bold text-red-600 mt-1 truncate">{props.data.carbonEmission.toFixed(1)} <span class="text-xs font-normal">kgCO₂/h</span></p>
              </div>
              <div class="text-2xl sm:text-3xl ml-2 sm:ml-4 flex-shrink-0">💨</div>
            </div>
            <div class="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
              <div class="flex-1 min-w-0">
                <p class="text-xs sm:text-sm text-gray-600 font-medium truncate">碳减排量</p>
                <p class="text-xl sm:text-2xl font-bold text-green-600 mt-1 truncate">{props.data.carbonReduction.toFixed(1)} <span class="text-xs font-normal">kgCO₂/h</span></p>
              </div>
              <div class="text-2xl sm:text-3xl ml-2 sm:ml-4 flex-shrink-0">🌱</div>
            </div>
            <div class="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl">
              <div class="flex-1 min-w-0">
                <p class="text-xs sm:text-sm text-gray-600 font-medium truncate">减排率</p>
                <p class="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
                  {((props.data.carbonReduction / (props.data.carbonEmission + props.data.carbonReduction)) * 100).toFixed(1)}%
                </p>
              </div>
              <div class="text-2xl sm:text-3xl ml-2 sm:ml-4 flex-shrink-0">📈</div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-md p-4 sm:p-5 hover:shadow-lg transition-all duration-300">
          <h3 class="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
            <span class="text-xl sm:text-2xl">🌤️</span> 气象条件
          </h3>
          <div class="space-y-2 sm:space-y-3">
            <div class="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
              <span class="text-xs sm:text-sm text-gray-600">🌡️ 温度</span>
              <span class="font-bold text-gray-800 text-base sm:text-lg">{props.weather.temperature.toFixed(1)}°C</span>
            </div>
            <div class="flex items-center justify-between p-2 sm:p-3 bg-blue-50 rounded-lg">
              <span class="text-xs sm:text-sm text-gray-600">💧 湿度</span>
              <span class="font-bold text-gray-800 text-base sm:text-lg">{props.weather.humidity.toFixed(1)}%</span>
            </div>
            <div class="flex items-center justify-between p-2 sm:p-3 bg-yellow-50 rounded-lg">
              <span class="text-xs sm:text-sm text-gray-600">☀️ 太阳辐射</span>
              <span class="font-bold text-gray-800 text-base sm:text-lg">{props.weather.solarRadiation.toFixed(0)} W/m²</span>
            </div>
            <div class="flex items-center justify-between p-2 sm:p-3 bg-cyan-50 rounded-lg">
              <span class="text-xs sm:text-sm text-gray-600">🌬️ 风速</span>
              <span class="font-bold text-gray-800 text-base sm:text-lg">{props.weather.windSpeed.toFixed(1)} m/s</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-md p-4 sm:p-5 hover:shadow-lg transition-all duration-300">
          <h3 class="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
            <span class="text-xl sm:text-2xl">🔄</span> 多能互补态势
          </h3>
          <div class="space-y-4 sm:space-y-5">
            <div>
              <div class="flex justify-between text-xs sm:text-sm mb-1 sm:mb-2 font-semibold">
                <span class="text-gray-700">制冷平衡</span>
                <span class="text-blue-600">
                  {((props.data.totalBalance.cooling.current / props.data.totalBalance.cooling.target) * 100).toFixed(1)}%
                </span>
              </div>
              <div class="bg-gray-200 rounded-full h-2 sm:h-3">
                <div
                  class="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-500"
                  style={`width: ${Math.min((props.data.totalBalance.cooling.current / props.data.totalBalance.cooling.target) * 100, 120)}%`}
                ></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs sm:text-sm mb-1 sm:mb-2 font-semibold">
                <span class="text-gray-700">供热平衡</span>
                <span class="text-orange-600">
                  {((props.data.totalBalance.heating.current / props.data.totalBalance.heating.target) * 100).toFixed(1)}%
                </span>
              </div>
              <div class="bg-gray-200 rounded-full h-2 sm:h-3">
                <div
                  class="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-500"
                  style={`width: ${Math.min((props.data.totalBalance.heating.current / props.data.totalBalance.heating.target) * 100, 120)}%`}
                ></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs sm:text-sm mb-1 sm:mb-2 font-semibold">
                <span class="text-gray-700">电力平衡</span>
                <span class="text-yellow-600">
                  {((props.data.totalBalance.electricity.current / props.data.totalBalance.electricity.target) * 100).toFixed(1)}%
                </span>
              </div>
              <div class="bg-gray-200 rounded-full h-2 sm:h-3">
                <div
                  class="bg-gradient-to-r from-yellow-400 to-yellow-600 h-full rounded-full transition-all duration-500"
                  style={`width: ${Math.min((props.data.totalBalance.electricity.current / props.data.totalBalance.electricity.target) * 100, 120)}%`}
                ></div>
              </div>
            </div>
            <div class="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
              <p class="text-xs sm:text-sm text-green-700 font-bold">✅ 系统运行正常</p>
              <p class="text-xs text-green-600 mt-1 sm:mt-2">多能源协同优化中，负荷分配合理</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-md p-4 sm:p-5 lg:p-6">
        <h2 class="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
          <span class="text-xl sm:text-2xl">🏭</span> 能源站实时监控
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <For each={props.data.stations}>
            {(station) => <EnergyStationCard station={station} />}
          </For>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
