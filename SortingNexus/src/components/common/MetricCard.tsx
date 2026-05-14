import React from 'react';

interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'cyan' | 'red' | 'gray';
}

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
};

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  color = 'blue'
}) => {
  return (
    <div className={`rounded-xl p-4 border transition-all hover:scale-[1.02] ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-gray-500 text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
};

export default MetricCard;
