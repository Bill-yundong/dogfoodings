import { cn } from '@/utils/format';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  status?: 'normal' | 'warning' | 'error';
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, unit, trend, status = 'normal', icon, className }: StatCardProps) {
  const statusColors = {
    normal: 'text-status-green',
    warning: 'text-alert-orange',
    error: 'text-red-500'
  };

  return (
    <div className={cn(
      'glass-card p-4 relative overflow-hidden',
      className
    )}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-electric-blue/0 via-electric-blue to-electric-blue/0"></div>
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-metal-gray mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'text-2xl font-bold font-display',
              statusColors[status]
            )}>
              {value}
            </span>
            {unit && <span className="text-xs text-metal-gray">{unit}</span>}
          </div>
          {trend !== undefined && (
            <div className={cn(
              'text-xs mt-1 flex items-center gap-1',
              trend >= 0 ? 'text-status-green' : 'text-alert-orange'
            )}>
              <span>{trend >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-electric-blue/10 text-electric-blue">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
