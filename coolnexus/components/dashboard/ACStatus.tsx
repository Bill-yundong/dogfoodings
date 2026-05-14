'use client';

import { PrecisionAC } from '@/lib/types/datacenter';

interface ACStatusProps {
  acs: PrecisionAC[];
}

export default function ACStatus({ acs }: ACStatusProps) {
  const getStatusColor = (status: PrecisionAC['status']) => {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'standby': return 'text-yellow-400';
      case 'fault': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: PrecisionAC['status']) => {
    switch (status) {
      case 'running': return '运行中';
      case 'standby': return '待机';
      case 'fault': return '故障';
      default: return '未知';
    }
  };

  return (
    <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
      <h3 className="text-lg font-semibold text-white/80 mb-4">精密空调状态</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {acs.map((ac) => (
          <div
            key={ac.id}
            className="p-3 rounded-lg bg-black/20 border border-white/5 hover:border-blue-500/30 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">{ac.name}</span>
              <span className={`text-xs ${getStatusColor(ac.status)}`}>
                {getStatusText(ac.status)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-white/50">送风温度</div>
                <div className="text-cyan-400 font-medium">{ac.supplyTemperature.toFixed(1)}°C</div>
              </div>
              <div>
                <div className="text-white/50">回风温度</div>
                <div className="text-orange-400 font-medium">{ac.returnTemperature.toFixed(1)}°C</div>
              </div>
              <div>
                <div className="text-white/50">制冷功率</div>
                <div className="text-blue-400 font-medium">{(ac.currentCooling / 1000).toFixed(1)}kW</div>
              </div>
              <div>
                <div className="text-white/50">风扇转速</div>
                <div className="text-emerald-400 font-medium">{ac.fanSpeed.toFixed(0)}%</div>
              </div>
            </div>

            <div className="mt-2">
              <div className="text-xs text-white/50 mb-1">负载率</div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(ac.currentCooling / ac.coolingCapacity) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
