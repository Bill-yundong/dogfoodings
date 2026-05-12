import React from 'react';
import type { WeatherCondition } from '../types';

interface WeatherControlProps {
  weather: WeatherCondition;
  onChange: (weather: WeatherCondition) => void;
}

export const WeatherControl: React.FC<WeatherControlProps> = ({ weather, onChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">气象海况参数</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">风速</label>
            <span className="text-sm text-gray-500">{weather.windSpeed.toFixed(1)} m/s</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="0.5"
            value={weather.windSpeed}
            onChange={(e) => onChange({ ...weather, windSpeed: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">风向</label>
            <span className="text-sm text-gray-500">{weather.windDirection.toFixed(0)}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            value={weather.windDirection}
            onChange={(e) => onChange({ ...weather, windDirection: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">浪高</label>
            <span className="text-sm text-gray-500">{weather.waveHeight.toFixed(1)} m</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={weather.waveHeight}
            onChange={(e) => onChange({ ...weather, waveHeight: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">周期</label>
            <span className="text-sm text-gray-500">{weather.wavePeriod.toFixed(1)} s</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={weather.wavePeriod}
            onChange={(e) => onChange({ ...weather, wavePeriod: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          {weather.windSpeed < 15 ? '🟢 风力较小' :
           weather.windSpeed < 25 ? '🟡 中等风力' :
           weather.windSpeed < 35 ? '🟠 大风警报' : '🔴 台风级别'}
        </p>
      </div>
    </div>
  );
};
