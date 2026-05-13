import { Component } from 'solid-js';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'blue' | 'green' | 'red' | 'yellow';
  showLabel?: boolean;
  height?: string;
}

export const ProgressBar: Component<ProgressBarProps> = (props) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
  };

  const percentage = () => Math.min(100, (props.value / (props.max || 1)) * 100);

  return (
    <div class="w-full">
      <div
        class={`w-full bg-gray-200 rounded-full overflow-hidden`}
        style={{ height: props.height || '8px' }}
      >
        <div
          class={`h-full ${colorClasses[props.color || 'blue']} transition-all duration-500`}
          style={{ width: `${percentage()}%` }}
        />
      </div>
      {props.showLabel && (
        <div class="text-right text-sm text-gray-600 mt-1">{percentage().toFixed(1)}%</div>
      )}
    </div>
  );
};
