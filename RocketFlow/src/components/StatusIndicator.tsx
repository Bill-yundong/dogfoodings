import { Component } from 'solid-js'

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'error' | 'active' | 'standby'
  label?: string
  pulse?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const statusColors: Record<string, string> = {
  online: '#00ff88',
  offline: '#666',
  warning: '#ffd700',
  error: '#ff2d55',
  active: '#00d4ff',
  standby: '#ff6b35'
}

const statusLabels: Record<string, string> = {
  online: '在线',
  offline: '离线',
  warning: '警告',
  error: '故障',
  active: '运行',
  standby: '待机'
}

export const StatusIndicator: Component<StatusIndicatorProps> = (props) => {
  const sizeClass = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }[props.size || 'md']
  
  const color = statusColors[props.status]
  const label = props.label || statusLabels[props.status]
  
  return (
    <div class="flex items-center gap-2">
      <div class="relative">
        <div 
          class={`${sizeClass} rounded-full`}
          style={{ 'background-color': color }}
        />
        {props.pulse && (
          <div 
            class={`${sizeClass} rounded-full absolute inset-0 animate-ping opacity-75`}
            style={{ 'background-color': color }}
          />
        )}
      </div>
      {label && (
        <span class="text-xs font-jetbrains" style={{ color }}>
          {label}
        </span>
      )}
    </div>
  )
}
