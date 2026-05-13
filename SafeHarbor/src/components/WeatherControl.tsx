import React from 'react';
import type { WeatherCondition } from '../types';
import { getWindSeverity, formatNumber } from '../utils/format';

interface WeatherControlProps {
  weather: WeatherCondition;
  onChange: (weather: WeatherCondition) => void;
}

export const WeatherControl: React.FC<WeatherControlProps> = ({ weather, onChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">气象海况参数</h3>
      
      <div className="space-y-4">
        <WeatherSlider
          label="风速"
          value={weather.windSpeed}
          unit="m/s"
          min={0}
          max={50}
          step={0.5}
          onChange={(value) => onChange({ ...weather, windSpeed: value })}
        />

        <WeatherSlider
          label="风向"
          value={weather.windDirection}
          unit="°"
          min={0}
          max={360}
          step={5}
          onChange={(value) => onChange({ ...weather, windDirection: value })}
        />

        <WeatherSlider
          label="浪高"
          value={weather.waveHeight}
          unit="m"
          min={0}
          max={10}
          step={0.1}
          onChange={(value) => onChange({ ...weather, waveHeight: value })}
        />

        <WeatherSlider
          label="周期"
          value={weather.wavePeriod}
          unit="s"
          min={1}
          max={20}
          step={0.5}
          onChange={(value) => onChange({ ...weather, wavePeriod: value })}
        />
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          {getWindSeverity(weather.windSpeed)}
        </p>
      </div>
    </div>
  );
};

interface WeatherSliderProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const WeatherSlider: React.FC<WeatherSliderProps> = ({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange
}) => (
  <div>
    <div className="flex justify-between mb-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <span className="text-sm text-gray-500">{formatNumber(value, 1)} {unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);
