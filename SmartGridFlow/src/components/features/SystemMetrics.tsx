import { Component } from 'solid-js';
import { Card } from '../shared/Card';
import { ProgressBar } from '../shared/ProgressBar';
import { useEnergyStore } from '../../store/useEnergyStore';
import { WEATHER_TYPE_LABELS } from '../../domain/constants/energy';

export const SystemMetrics: Component = () => {
  const {
    weatherData,
    optimizationScore,
    carbonEmission,
    isOptimizing,
    currentWeatherType,
    setCurrentWeatherType,
  } = useEnergyStore();

  const weatherTypes: Array<{ key: 'typical_summer' | 'typical_winter' | 'typical_transition'; label: string }> = [
    { key: 'typical_summer', label: '典型夏季' },
    { key: 'typical_winter', label: '典型冬季' },
    { key: 'typical_transition', label: '过渡季节' },
  ];

  return (
    <Card title="系统指标">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">气象场景</label>
          <div class="flex flex-wrap gap-2">
            {weatherTypes.map(({ key, label }) => (
              <button
                onClick={() => setCurrentWeatherType(key)}
                class={`px-3 py-1 text-sm rounded transition-colors ${
                  currentWeatherType() === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="bg-blue-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-blue-600">{weatherData().temperature.toFixed(1)}°C</div>
            <div class="text-sm text-gray-600">温度</div>
          </div>
          <div class="bg-cyan-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-cyan-600">{weatherData().humidity.toFixed(1)}%</div>
            <div class="text-sm text-gray-600">湿度</div>
          </div>
          <div class="bg-yellow-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-yellow-600">
              {weatherData().solarRadiation.toFixed(0)} W/m²
            </div>
            <div class="text-sm text-gray-600">太阳辐射</div>
          </div>
          <div class="bg-teal-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-teal-600">{weatherData().windSpeed.toFixed(1)} m/s</div>
            <div class="text-sm text-gray-600">风速</div>
          </div>
        </div>

        <div class="border-t pt-4">
          <div class="flex justify-between items-center mb-3">
            <span class="text-sm font-medium text-gray-700">优化效率</span>
            <span
              class={`text-sm font-medium ${isOptimizing() ? 'text-yellow-600 animate-pulse' : 'text-green-600'}`}
            >
              {isOptimizing() ? '优化中...' : '已优化'}
            </span>
          </div>
          <ProgressBar value={optimizationScore()} color="green" showLabel />
        </div>

        <div class="bg-green-50 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-2xl font-bold text-green-600">{carbonEmission().toFixed(1)} kg/h</div>
              <div class="text-sm text-gray-600">碳排放强度</div>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
