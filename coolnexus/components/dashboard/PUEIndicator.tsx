'use client';

import { PUEStats } from '@/lib/types/datacenter';
import { getPUEColor, getPUEBackgroundColor } from '@/lib/utils/pueCalculator';

interface PUEIndicatorProps {
  stats: PUEStats;
}

export default function PUEIndicator({ stats }: PUEIndicatorProps) {
  const trendIcon = stats.trend === 'improving' ? '↓' : stats.trend === 'worsening' ? '↑' : '→';
  const trendColor = stats.trend === 'improving' ? 'text-green-400' : stats.trend === 'worsening' ? 'text-red-400' : 'text-gray-400';

  return (
    <div className={`p-6 rounded-xl ${getPUEBackgroundColor(stats.currentPUE)} backdrop-blur-sm border border-white/10`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white/80">PUE 能效指标</h3>
        <span className={`text-2xl ${trendColor}`}>{trendIcon}</span>
      </div>
      
      <div className="text-center mb-6">
        <div className={`text-6xl font-bold ${getPUEColor(stats.currentPUE)}`}>
          {stats.currentPUE.toFixed(2)}
        </div>
        <div className="text-sm text-white/60 mt-2">
          目标: <span className="text-green-400">{stats.targetPUE}</span>
        </div>
      </div>

      <div className="w-full bg-gray-700 rounded-full h-2 mb-6">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${
            stats.currentPUE < 1.3 ? 'bg-green-500' :
            stats.currentPUE < 1.5 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.min((stats.currentPUE / 2) * 100, 100)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xl font-semibold text-white">{stats.dailyAverage.toFixed(2)}</div>
          <div className="text-xs text-white/60">日均</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-white">{stats.weeklyAverage.toFixed(2)}</div>
          <div className="text-xs text-white/60">周均</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-white">{stats.monthlyAverage.toFixed(2)}</div>
          <div className="text-xs text-white/60">月均</div>
        </div>
      </div>
    </div>
  );
}
