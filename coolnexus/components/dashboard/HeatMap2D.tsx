'use client';

import { Rack } from '@/lib/types/datacenter';

interface HeatMap2DProps {
  racks: Rack[];
}

export default function HeatMap2D({ racks }: HeatMap2DProps) {
  const getTemperatureColor = (temp: number) => {
    if (temp < 30) return 'bg-cyan-500';
    if (temp < 35) return 'bg-emerald-500';
    if (temp < 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getTemperatureOpacity = (temp: number) => {
    return Math.min(0.4 + (temp - 25) * 0.03, 1);
  };

  return (
    <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
      <h3 className="text-lg font-semibold text-white/80 mb-4">机柜热负荷分布图</h3>
      
      <div className="gradient-mesh p-4 rounded-lg bg-black/30">
        <div className="grid grid-cols-8 gap-2">
          {racks.map((rack) => (
            <div
              key={rack.id}
              className={`aspect-square rounded-lg flex items-center justify-center cursor-pointer
                transition-all duration-300 hover:scale-105 hover:shadow-lg
                ${getTemperatureColor(rack.outletTemperature)}`}
              style={{ opacity: getTemperatureOpacity(rack.outletTemperature) }}
              title={`${rack.name}: ${rack.outletTemperature.toFixed(1)}°C\n功率: ${(rack.currentPower / 1000).toFixed(1)}kW`}
            >
              <div className="text-center">
                <div className="text-xs font-bold text-white">{rack.name}</div>
                <div className="text-[10px] text-white/80">{rack.outletTemperature.toFixed(1)}°</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-cyan-500" />
          <span className="text-xs text-white/60">&lt;30°C</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span className="text-xs text-white/60">30-35°C</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500" />
          <span className="text-xs text-white/60">35-40°C</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-xs text-white/60">&gt;40°C</span>
        </div>
      </div>
    </div>
  );
}
