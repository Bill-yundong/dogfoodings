import { Component } from 'solid-js';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'maintenance' | 'warning' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusColors: Record<string, string> = {
  online: 'bg-alert-green',
  offline: 'bg-metal-700',
  maintenance: 'bg-alert-orange',
  warning: 'bg-alert-orange',
  critical: 'bg-alert-red',
};

const statusLabels: Record<string, string> = {
  online: '在线',
  offline: '离线',
  maintenance: '维护',
  warning: '警告',
  critical: '严重',
};

const sizeClasses: Record<string, string> = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export const StatusIndicator: Component<StatusIndicatorProps> = (props) => {
  const size = () => props.size || 'md';

  return (
    <div class="flex items-center gap-2">
      <div
        class={`status-indicator ${sizeClasses[size()]} ${statusColors[props.status]} after:${statusColors[props.status]}`}
      />
      {props.showLabel && (
        <span class="text-sm text-metal-300">{statusLabels[props.status]}</span>
      )}
    </div>
  );
};
