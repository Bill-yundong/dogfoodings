import React from 'react';
import { classNames } from '@/utils/formatters';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = false,
  color = 'primary',
  size = 'md',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorClasses = {
    primary: 'bg-wms-primary',
    success: 'bg-wms-success',
    warning: 'bg-wms-warning',
    danger: 'bg-wms-danger',
  };

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={classNames('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-wms-subtext">{label}</span>}
          {showPercentage && (
            <span className="text-xs font-medium text-wms-text">{percentage.toFixed(1)}%</span>
          )}
        </div>
      )}
      <div
        className={classNames(
          'w-full bg-wms-bg rounded-full overflow-hidden',
          sizeClasses[size]
        )}
      >
        <div
          className={classNames(
            'h-full rounded-full transition-all duration-500 ease-out',
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
