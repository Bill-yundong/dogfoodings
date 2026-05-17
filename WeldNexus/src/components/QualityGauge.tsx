'use client';

interface QualityGaugeProps {
  value: number;
  title: string;
  min?: number;
  max?: number;
}

export function QualityGauge({ value, title, min = 0, max = 100 }: QualityGaugeProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const getColor = () => {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    if (percentage >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getBgColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getGlowClass = () => {
    if (percentage >= 80) return 'pulse-glow';
    if (percentage >= 60) return 'pulse-glow-warning';
    return 'pulse-glow-danger';
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg">
      <h3 className="text-gray-300 text-sm font-medium mb-3">{title}</h3>
      <div className={`relative w-28 h-28 rounded-full ${getGlowClass()}`}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r="48"
            stroke="#374151"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="56"
            cy="56"
            r="48"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${percentage * 3.01} 301`}
            strokeLinecap="round"
            className={getColor()}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${getColor()}`}>{value.toFixed(1)}</span>
        </div>
      </div>
      <div className="w-full mt-3">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${getBgColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
