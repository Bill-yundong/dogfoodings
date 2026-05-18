'use client';

import { motion } from 'framer-motion';
import type { DeviceStatus, DefectRisk } from '@/types';

interface StatusIndicatorProps {
  status: DeviceStatus | DefectRisk;
  label?: string;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  normal: { color: 'text-tech-green', bgColor: 'bg-tech-green', label: '正常' },
  warning: { color: 'text-tech-yellow', bgColor: 'bg-tech-yellow', label: '警告' },
  error: { color: 'text-tech-red', bgColor: 'bg-tech-red', label: '异常' },
  offline: { color: 'text-gray-500', bgColor: 'bg-gray-500', label: '离线' },
  low: { color: 'text-tech-green', bgColor: 'bg-tech-green', label: '低风险' },
  medium: { color: 'text-tech-yellow', bgColor: 'bg-tech-yellow', label: '中风险' },
  high: { color: 'text-tech-red', bgColor: 'bg-tech-red', label: '高风险' },
};

export default function StatusIndicator({
  status,
  label,
  showDot = true,
  size = 'md',
}: StatusIndicatorProps) {
  const config = statusConfig[status] || statusConfig.offline;
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className="flex items-center gap-2">
      {showDot && (
        <motion.div
          animate={status === 'error' || status === 'high' ? { opacity: [1, 0.3, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={`${sizeClasses[size]} rounded-full ${config.bgColor} ${status === 'normal' || status === 'low' ? '' : 'animate-pulse'}`}
        />
      )}
      {label && (
        <span className={`text-sm font-medium ${config.color}`}>
          {label}
        </span>
      )}
    </div>
  );
}
