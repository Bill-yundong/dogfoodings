import { Component } from 'solid-js';
import { formatNumber } from '@/utils/format';

interface StatCardProps {
  title: string;
  value: number;
  unit: string;
  icon: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  trend?: number;
  decimals?: number;
}

export const StatCard: Component<StatCardProps> = (props) => {
  const colorClasses = {
    blue: 'from-industrial-500/20 to-industrial-600/20 border-industrial-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
    red: 'from-red-500/20 to-red-600/20 border-red-500/30',
  };

  const iconColors = {
    blue: 'text-industrial-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  };

  return (
    <div
      class={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
        colorClasses[props.color || 'blue']
      }`}
    >
      <div class="absolute top-0 right-0 h-20 w-20 opacity-10">
        <svg viewBox="0 0 24 24" fill="currentColor" class={iconColors[props.color || 'blue']}>
          <path d={props.icon} />
        </svg>
      </div>
      
      <div class="relative z-10">
        <div class="text-sm text-gray-400 mb-1">{props.title}</div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold font-mono text-white">
            {formatNumber(props.value, props.decimals ?? 1)}
          </span>
          <span class="text-sm text-gray-400">{props.unit}</span>
        </div>
        {props.trend !== undefined && (
          <div class={`mt-1 text-xs ${props.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {props.trend >= 0 ? '↑' : '↓'} {Math.abs(props.trend).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
};
