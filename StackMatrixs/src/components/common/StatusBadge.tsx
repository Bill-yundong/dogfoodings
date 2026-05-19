import React from 'react';
import { classNames, getStatusBgColor, getStatusText } from '@/utils/formatters';

interface StatusBadgeProps {
  status: string;
  showText?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showText = true,
  className = '',
}) => {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        getStatusBgColor(status),
        className
      )}
    >
      <span
        className={classNames(
          'w-1.5 h-1.5 rounded-full',
          status === 'running' || status === 'executing' ? 'animate-pulse' : ''
        )}
        style={{
          backgroundColor:
            status === 'running' || status === 'executing' || status === 'completed'
              ? '#10B981'
              : status === 'fault' || status === 'failed'
              ? '#F43F5E'
              : status === 'paused' || status === 'pending'
              ? '#F59E0B'
              : '#94A3B8',
        }}
      />
      {showText && <span>{getStatusText(status)}</span>}
    </span>
  );
};
