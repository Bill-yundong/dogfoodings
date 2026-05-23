import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DataCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  status?: 'safe' | 'warning' | 'danger';
  trend?: { value: number; isUp: boolean };
  className?: string;
  children?: React.ReactNode;
}

export const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  status = 'safe',
  trend,
  className,
  children,
}) => {
  const statusColors = {
    safe: 'border-safety-green-500/50',
    warning: 'border-alert-orange-500/50',
    danger: 'border-red-500/50',
  };

  const statusDotColors = {
    safe: 'bg-safety-green-500',
    warning: 'bg-alert-orange-500',
    danger: 'bg-red-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'industrial-card relative overflow-hidden',
        statusColors[status],
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-deep-ocean-400">{icon}</span>}
          <span className="data-label">{title}</span>
          <span className={cn('status-indicator', statusDotColors[status])} />
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-mono',
            trend.isUp ? 'text-safety-green-400' : 'text-alert-orange-400'
          )}>
            {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="data-value">{value}</div>

      {subtitle && (
        <div className="text-xs text-steel-400 mt-1 font-mono">{subtitle}</div>
      )}

      {children && <div className="mt-3">{children}</div>}
    </motion.div>
  );
};
