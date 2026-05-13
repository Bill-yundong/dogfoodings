import type { Component, JSX } from 'solid-js';

interface StatsCardProps {
  icon: string;
  label: string;
  value: number | string;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  children?: JSX.Element;
}

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-900 text-blue-300',
  green: 'bg-green-900 text-green-300',
  yellow: 'bg-yellow-900 text-yellow-300',
  red: 'bg-red-900 text-red-300',
  purple: 'bg-purple-900 text-purple-300',
};

export const StatsCard: Component<StatsCardProps> = (props) => {
  const color = props.color || 'blue';

  return (
    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-gray-400 text-sm">{props.label}</p>
          <p class="text-2xl font-bold text-white mt-1">{props.value}</p>
          {props.trend && (
            <p class={`text-xs mt-2 ${props.trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {props.trend.value >= 0 ? '↑' : '↓'} {Math.abs(props.trend.value)}% {props.trend.label}
            </p>
          )}
        </div>
        <div class={`w-12 h-12 ${colorClasses[color]} rounded-full flex items-center justify-center`}>
          <span class="text-2xl">{props.icon}</span>
        </div>
      </div>
      {props.children && <div class="mt-4">{props.children}</div>}
    </div>
  );
};
