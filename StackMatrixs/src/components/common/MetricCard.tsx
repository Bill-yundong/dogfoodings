import React from 'react';
import { classNames } from '@/utils/formatters';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; isPositive: boolean };
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  trend,
  icon,
  color = 'primary',
  className = '',
}) => {
  const colorClasses = {
    primary: 'from-wms-primary/20 to-wms-primary/5 border-wms-primary/30',
    success: 'from-wms-success/20 to-wms-success/5 border-wms-success/30',
    warning: 'from-wms-warning/20 to-wms-warning/5 border-wms-warning/30',
    danger: 'from-wms-danger/20 to-wms-danger/5 border-wms-danger/30',
    accent: 'from-wms-accent/20 to-wms-accent/5 border-wms-accent/30',
  };

  const textColors = {
    primary: 'text-wms-primary',
    success: 'text-wms-success',
    warning: 'text-wms-warning',
    danger: 'text-wms-danger',
    accent: 'text-wms-accent',
  };

  return (
    <div
      className={classNames(
        'bg-gradient-to-br border rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
        colorClasses[color],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-wms-subtext text-sm font-medium mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className={classNames('text-3xl font-bold font-display', textColors[color])}>
              {value}
            </span>
            {unit && <span className="text-wms-subtext text-sm">{unit}</span>}
          </div>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={classNames(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-wms-success' : 'text-wms-danger'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-wms-subtext text-xs">较昨日</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={classNames(
              'p-3 rounded-lg bg-opacity-20',
              textColors[color],
              `bg-${color}/10`
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
