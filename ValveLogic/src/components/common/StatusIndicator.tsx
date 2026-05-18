import React from 'react';
import type { ValveStatus, SimulationStatus, WarningSeverity } from '../../types';

interface StatusIndicatorProps {
  status: ValveStatus | SimulationStatus | WarningSeverity;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  normal: { color: 'bg-green-500', bgColor: 'bg-green-500/10', label: '正常' },
  opening: { color: 'bg-blue-500', bgColor: 'bg-blue-500/10', label: '开启中' },
  closing: { color: 'bg-yellow-500', bgColor: 'bg-yellow-500/10', label: '关闭中' },
  closed: { color: 'bg-red-500', bgColor: 'bg-red-500/10', label: '已关闭' },
  fault: { color: 'bg-red-600', bgColor: 'bg-red-600/10', label: '故障' },
  idle: { color: 'bg-gray-500', bgColor: 'bg-gray-500/10', label: '待机' },
  running: { color: 'bg-green-500', bgColor: 'bg-green-500/10', label: '运行中' },
  paused: { color: 'bg-yellow-500', bgColor: 'bg-yellow-500/10', label: '已暂停' },
  completed: { color: 'bg-blue-500', bgColor: 'bg-blue-500/10', label: '已完成' },
  error: { color: 'bg-red-500', bgColor: 'bg-red-500/10', label: '错误' },
  low: { color: 'bg-blue-400', bgColor: 'bg-blue-400/10', label: '低' },
  medium: { color: 'bg-yellow-400', bgColor: 'bg-yellow-400/10', label: '中' },
  high: { color: 'bg-orange-500', bgColor: 'bg-orange-500/10', label: '高' },
  critical: { color: 'bg-red-500', bgColor: 'bg-red-500/10', label: '严重' },
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  showLabel = false,
}) => {
  const config = statusConfig[status] || statusConfig.normal;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} ${config.color} rounded-full animate-pulse`}
      />
      {showLabel && (
        <span className={`text-xs px-2 py-0.5 rounded ${config.bgColor} text-white/80`}>
          {config.label}
        </span>
      )}
    </div>
  );
};
