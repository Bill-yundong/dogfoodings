interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  icon,
  trend,
  trendLabel,
  className = "",
}: MetricCardProps) {
  const isPositiveTrend = trend !== undefined && trend >= 0;

  return (
    <div className={`data-card p-6 rounded-xl ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{value}</span>
            {unit && <span className="text-sm text-gray-400">{unit}</span>}
          </div>
        </div>
        {icon && (
          <div className="p-3 rounded-lg bg-ozone-500/20 text-ozone-400">
            {icon}
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`text-sm font-medium ${isPositiveTrend ? "text-green-400" : "text-red-400"}`}
          >
            {isPositiveTrend ? "↑" : "↓"} {Math.abs(trend).toFixed(2)}%
          </span>
          {trendLabel && <span className="text-xs text-gray-500">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
