import type { Component } from 'solid-js';
import { energyStore } from '../store/energyStore';

const ControlPanel: Component = () => {
  const handleOptimize = async () => {
    await energyStore.runOptimization();
  };

  const handleAlign = () => {
    energyStore.alignData();
  };

  const handleSaveSnapshot = () => {
    const weather = energyStore.weather();
    let weatherType: 'typical_summer' | 'typical_winter' | 'typical_spring' | 'typical_autumn';
    
    if (weather.temperature > 25) {
      weatherType = 'typical_summer';
    } else if (weather.temperature < 10) {
      weatherType = 'typical_winter';
    } else if (weather.temperature < 18) {
      weatherType = 'typical_autumn';
    } else {
      weatherType = 'typical_spring';
    }
    
    energyStore.saveCurrentSnapshot(weatherType);
    alert('快照已保存到本地存储!');
  };

  const handleWeatherChange = (type: string, value: number) => {
    energyStore.updateWeather({ [type]: value });
  };

  return (
    <div class="bg-white rounded-xl shadow-lg p-6">
      <h3 class="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span>🎛️</span> 系统控制
      </h3>

      <div class="space-y-6">
        <div class="grid grid-cols-1 gap-4">
          <button
            onClick={handleOptimize}
            disabled={energyStore.isOptimizing()}
            class="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {energyStore.isOptimizing() ? (
              <>
                <span class="animate-spin">⚙️</span>
                优化计算中...
              </>
            ) : (
              <>
                <span>🚀</span>
                执行多能源潮流优化
              </>
            )}
          </button>

          <div class="grid grid-cols-2 gap-4">
            <button
              onClick={handleAlign}
              class="py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>🔄</span>
              数据对齐
            </button>
            <button
              onClick={handleSaveSnapshot}
              class="py-3 px-4 bg-green-100 text-green-700 font-medium rounded-lg hover:bg-green-200 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>💾</span>
              保存快照
            </button>
          </div>
        </div>

        <div class="border-t border-gray-200 pt-6">
          <h4 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🌤️</span> 气象参数调节
          </h4>
          
          <div class="space-y-4">
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-sm text-gray-600">🌡️ 温度</label>
                <span class="text-sm font-medium text-blue-600">{energyStore.weather().temperature.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="-10"
                max="40"
                step="0.5"
                value={energyStore.weather().temperature}
                onInput={(e) => handleWeatherChange('temperature', Number(e.currentTarget.value))}
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div class="flex justify-between text-xs text-gray-400 mt-1">
                <span>-10°C</span>
                <span>40°C</span>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-sm text-gray-600">💧 湿度</label>
                <span class="text-sm font-medium text-blue-600">{energyStore.weather().humidity.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={energyStore.weather().humidity}
                onInput={(e) => handleWeatherChange('humidity', Number(e.currentTarget.value))}
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div class="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-sm text-gray-600">☀️ 太阳辐射</label>
                <span class="text-sm font-medium text-yellow-600">{energyStore.weather().solarRadiation.toFixed(0)} W/m²</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="10"
                value={energyStore.weather().solarRadiation}
                onInput={(e) => handleWeatherChange('solarRadiation', Number(e.currentTarget.value))}
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <div class="flex justify-between text-xs text-gray-400 mt-1">
                <span>0 W/m²</span>
                <span>1000 W/m²</span>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-sm text-gray-600">🌬️ 风速</label>
                <span class="text-sm font-medium text-cyan-600">{energyStore.weather().windSpeed.toFixed(1)} m/s</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={energyStore.weather().windSpeed}
                onInput={(e) => handleWeatherChange('windSpeed', Number(e.currentTarget.value))}
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div class="flex justify-between text-xs text-gray-400 mt-1">
                <span>0 m/s</span>
                <span>20 m/s</span>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-200 pt-6">
          <h4 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>⚙️</span> 系统状态
          </h4>
          
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-600">实时对齐</span>
              <span class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span class="text-sm font-medium text-green-600">运行中</span>
              </span>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-600">数据模拟</span>
              <span class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span class="text-sm font-medium text-green-600">运行中</span>
              </span>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-600">最后优化</span>
              <span class="text-sm font-medium text-gray-700">
                {energyStore.lastOptimization() 
                  ? new Date(energyStore.lastOptimization()!).toLocaleTimeString('zh-CN')
                  : '未执行'}
              </span>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-200 pt-6">
          <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 class="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <span>💡</span> 功能说明
            </h4>
            <ul class="text-xs text-blue-600 space-y-1">
              <li>• <strong>多能源潮流优化</strong>: 基于梯度下降算法优化冷热电负荷分配</li>
              <li>• <strong>数据对齐</strong>: 同步能源站与指挥中心数据，确保实时性</li>
              <li>• <strong>保存快照</strong>: 将当前运行状态保存到 IndexedDB 本地存储</li>
              <li>• <strong>气象参数</strong>: 调节气象条件观察对能源系统的影响</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
