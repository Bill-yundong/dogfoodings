import type { Component } from 'solid-js';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export const ProgressBar: Component<ProgressBarProps> = (props) => {
  const max = props.max || 100;
  const percentage = Math.min(100, Math.max(0, (props.value / max) * 100));
  const color = props.color || 'blue';
  const size = props.size || 'md';

  return (
    <div>
      {(props.label || props.showValue) && (
        <div class="flex justify-between text-sm text-gray-400 mb-1">
          {props.label && <span>{props.label}</span>}
          {props.showValue && <span>{props.value}/{max}</span>}
        </div>
      )}
      <div class={`w-full bg-gray-700 rounded-full ${sizeClasses[size]}`}>
        <div
          class={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
