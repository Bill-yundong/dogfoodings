'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils';

interface DataCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  status?: 'normal' | 'warning' | 'danger';
  className?: string;
}

export default function DataCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  status = 'normal',
  className,
}: DataCardProps) {
  const statusColors = {
    normal: 'border-dark-700/50',
    warning: 'border-warning-500/50 shadow-warning-500/10',
    danger: 'border-danger-500/50 shadow-danger-500/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-card p-6 border transition-all duration-300',
        statusColors[status],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-dark-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary-400">
              {value}
            </span>
            {unit && <span className="text-sm text-dark-400">{unit}</span>}
          </div>
          {trend && (
            <div
              className={cn(
                'mt-2 text-xs flex items-center gap-1',
                trend.isPositive ? 'text-success-400' : 'text-danger-400'
              )}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-dark-500">较上周期</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-12 h-12 rounded-lg bg-dark-800 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary-400" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
