'use client';

import { useEffect, useState } from 'react';

interface IntensityIndicatorProps {
  intensity: number;
  maxIntensity?: number;
  label?: string;
}

export default function IntensityIndicator({
  intensity,
  maxIntensity = 12,
  label = '震动烈度'
}: IntensityIndicatorProps) {
  const [displayIntensity, setDisplayIntensity] = useState(0);

  useEffect(() => {
    setDisplayIntensity(intensity);
  }, [intensity]);

  const getIntensityColor = (val: number) => {
    if (val < 3) return 'text-green-500';
    if (val < 5) return 'text-yellow-500';
    if (val < 7) return 'text-orange-500';
    if (val < 9) return 'text-red-500';
    return 'text-red-600';
  };

  const getBgColor = (val: number) => {
    if (val < 3) return 'bg-green-500';
    if (val < 5) return 'bg-yellow-500';
    if (val < 7) return 'bg-orange-500';
    if (val < 9) return 'bg-red-500';
    return 'bg-red-600';
  };

  const getGlowColor = (val: number) => {
    if (val < 3) return 'rgba(34, 197, 94, 0.5)';
    if (val < 5) return 'rgba(234, 179, 8, 0.5)';
    if (val < 7) return 'rgba(249, 115, 22, 0.5)';
    if (val < 9) return 'rgba(239, 68, 68, 0.5)';
    return 'rgba(220, 38, 38, 0.7)';
  };

  const intensityLevel = Math.min(Math.floor(displayIntensity), maxIntensity);
  const percentage = (displayIntensity / maxIntensity) * 100;
  const glowColor = getGlowColor(displayIntensity);

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
      <div className="text-center mb-4">
        <h3 className="text-gray-400 text-sm font-medium">{label}</h3>
        <div 
          className={`text-6xl font-bold mt-2 ${getIntensityColor(displayIntensity)}`}
          style={{ textShadow: `0 0 30px ${glowColor}` }}
        >
          {displayIntensity.toFixed(1)}
        </div>
        <div className="text-gray-500 text-xs mt-1">麦加利烈度等级</div>
      </div>

      <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full ${getBgColor(displayIntensity)} transition-all duration-300`}
          style={{ width: `${percentage}%`, boxShadow: `0 0 20px ${glowColor}` }}
        />
        <div
          className="absolute top-0 h-full bg-white opacity-30"
          style={{
            width: '2px',
            left: `${percentage}%`,
            transform: 'translateX(-50%)',
            boxShadow: `0 0 10px ${glowColor}`
          }}
        />
      </div>

      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>0</span>
        <span>VI</span>
        <span>XII</span>
      </div>

      <div className="grid grid-cols-6 gap-1 mt-4">
        {Array.from({ length: maxIntensity }, (_, i) => (
          <div
            key={i}
            className={`h-6 rounded-sm transition-all duration-200 ${
              i < intensityLevel
                ? `${getBgColor(i + 1)} opacity-80`
                : 'bg-gray-700 opacity-50'
            }`}
            style={{
              boxShadow: i < intensityLevel ? `0 0 10px ${glowColor}` : 'none'
            }}
          />
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-800 rounded-lg">
        <div className="text-xs text-gray-400 mb-2">当前状态</div>
        <div className={`text-sm font-medium ${getIntensityColor(displayIntensity)}`}>
          {displayIntensity < 3 && '无感 - 仪器检测到微小震动'}
          {displayIntensity >= 3 && displayIntensity < 5 && '轻微 - 室内大多数人有感觉'}
          {displayIntensity >= 5 && displayIntensity < 7 && '中等 - 所有人有感觉，物体摇晃'}
          {displayIntensity >= 7 && displayIntensity < 9 && '强烈 - 站立困难，建筑物损坏'}
          {displayIntensity >= 9 && '毁坏 - 灾难性破坏，地面变形'}
        </div>
      </div>
    </div>
  );
}
