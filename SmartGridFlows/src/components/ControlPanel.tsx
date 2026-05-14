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
    <div class="space-y-6">
      <div class="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
        <h3 class="text-lg font-bold mb-6 flex items-center gap-3">
          <span class="text-2xl">🎛️</span> 系统控制中心
        </h3>

        <div class="space-y-4">
          <button
            onClick={handleOptimize}
            disabled={energyStore.isOptimizing()}
            class="w-full py-4 px-6 bg-white text-blue-700 font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {energyStore.isOptimizing() ? (
              <>
                <span class="animate-spin text-xl">⚙️</span>
                优化计算中...
              </>
            ) : (
              <>
                <span class="text-xl">🚀</span>
                执行多能源潮流优化
              </>
            )}
          </button>

          <div class="grid grid-cols-2 gap-4">
            <button
              onClick={handleAlign}
              class="py-3 px-4 bg-white/20 backdrop-blur font-semibold rounded-xl hover:bg-white/30 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>🔄</span>
              数据对齐
            </button>
            <button
              onClick={handleSaveSnapshot}
              class="py-3 px-4 bg-white/20 backdrop-blur font-semibold rounded-xl hover:bg-white/30 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>💾</span>
              保存快照
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-lg p-6">
        <h4 class="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2">
          <span class="text-xl">🌤️</span> 气象参数调节
        </h4>
        
        <div class="space-y-6">
          <div class="p-4 bg-blue-50 rounded-xl">
            <div class="flex justify-between items-center mb-3">
              <label class="text-sm font-semibold text-gray-700">🌡️ 环境温度</label>
              <span class="text-lg font-bold text-blue-600">{energyStore.weather().temperature.toFixed(1)}°C</span>
            </div>
            <input
              type="range"
              min="-10"
              max="40"
              step="0.5"
              value={energyStore.weather().temperature}
              onInput={(e) => handleWeatherChange('temperature', Number(e.currentTarget.value))}
              class="w-full h-3 bg-blue-200 rounded-full appearance-none cursor-pointer accent-blue-600"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-2">
              <span>-10°C</span>
              <span>40°C</span>
            </div>
          </div>

          <div class="p-4 bg-cyan-50 rounded-xl">
            <div class="flex justify-between items-center mb-3">
              <label class="text-sm font-semibold text-gray-700">💧 相对湿度</label>
              <span class="text-lg font-bold text-cyan-600">{energyStore.weather().humidity.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={energyStore.weather().humidity}
              onInput={(e) => handleWeatherChange('humidity', Number(e.currentTarget.value))}
              class="w-full h-3 bg-cyan-200 rounded-full appearance-none cursor-pointer accent-cyan-600"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-2">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          <div class="p-4 bg-yellow-50 rounded-xl">
            <div class="flex justify-between items-center mb-3">
              <label class="text-sm font-semibold text-gray-700">☀️ 太阳辐射</label>
              <span class="text-lg font-bold text-yellow-600">{energyStore.weather().solarRadiation.toFixed(0)} W/m²</span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              step="10"
              value={energyStore.weather().solarRadiation}
              onInput={(e) => handleWeatherChange('solarRadiation', Number(e.currentTarget.value))}
              class="w-full h-3 bg-yellow-200 rounded-full appearance-none cursor-pointer accent-yellow-600"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-2">
              <span>0 W/m²</span>
              <span>1000 W/m²</span>
            </div>
          </div>

          <div class="p-4 bg-teal-50 rounded-xl">
            <div class="flex justify-between items-center mb-3">
              <label class="text-sm font-semibold text-gray-700">🌬️ 风速</label>
              <span class="text-lg font-bold text-teal-600">{energyStore.weather().windSpeed.toFixed(1)} m/s</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={energyStore.weather().windSpeed}
              onInput={(e) => handleWeatherChange('windSpeed', Number(e.currentTarget.value))}
              class="w-full h-3 bg-teal-200 rounded-full appearance-none cursor-pointer accent-teal-600"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-2">
              <span>0 m/s</span>
              <span>20 m/s</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-lg p-6">
        <h4 class="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2">
          <span class="text-xl">⚙️</span> 系统运行状态
        </h4>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
            <span class="text-sm font-semibold text-gray-700">实时数据对齐</span>
            <span class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
              <span class="text-sm font-bold text-green-700">运行中</span>
            </span>
          </div>
          <div class="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
            <span class="text-sm font-semibold text-gray-700">数据波动模拟</span>
            <span class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
              <span class="text-sm font-bold text-green-700">运行中</span>
            </span>
          </div>
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
            <span class="text-sm font-semibold text-gray-700">上次优化时间</span>
            <span class="text-sm font-bold text-gray-800">
              {energyStore.lastOptimization() 
                ? new Date(energyStore.lastOptimization()!).toLocaleTimeString('zh-CN')
                : '未执行'}
            </span>
          </div>
        </div>
      </div>

      <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
        <h4 class="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span class="text-xl">💡</span> 功能使用说明
        </h4>
        <ul class="space-y-3">
          <li class="flex items-start gap-3">
            <span class="text-blue-500 font-bold">•</span>
            <div>
              <span class="text-sm font-semibold text-gray-800">多能源潮流优化</span>
              <p class="text-xs text-gray-600 mt-1">基于梯度下降算法优化冷热电三联供负荷分配，实现能效最大化</p>
            </div>
          </li>
          <li class="flex items-start gap-3">
            <span class="text-blue-500 font-bold">•</span>
            <div>
              <span class="text-sm font-semibold text-gray-800">实时数据对齐</span>
              <p class="text-xs text-gray-600 mt-1">同步各能源站与指挥中心数据，确保系统状态实时一致性</p>
            </div>
          </li>
          <li class="flex items-start gap-3">
            <span class="text-blue-500 font-bold">•</span>
            <div>
              <span class="text-sm font-semibold text-gray-800">运行快照保存</span>
              <p class="text-xs text-gray-600 mt-1">将当前运行状态保存到 IndexedDB 本地存储，支持典型气象日数据留存</p>
            </div>
          </li>
          <li class="flex items-start gap-3">
            <span class="text-blue-500 font-bold">•</span>
            <div>
              <span class="text-sm font-semibold text-gray-800">气象参数模拟</span>
              <p class="text-xs text-gray-600 mt-1">调节温度、湿度、太阳辐射、风速观察对多能互补系统的影响</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ControlPanel;
