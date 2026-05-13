import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  unit,
  icon,
  gradient,
  trend
}) => {
  return (
    <div className={`stat-card ${gradient}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend.isUp ? 'text-green-200' : 'text-red-200'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={trend.isUp ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'}
              />
            </svg>
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
      <div className="stat-value">
        {value}
        {unit && <span className="text-lg ml-1 opacity-80">{unit}</span>}
      </div>
      <div className="stat-label mt-1">{title}</div>
    </div>
  );
};
