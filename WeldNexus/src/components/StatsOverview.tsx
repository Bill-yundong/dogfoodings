'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsOverviewProps {
  totalWelds: number;
  avgQuality: number;
  defectRate: number;
  avgStability: number;
  trend?: 'up' | 'down' | 'stable';
}

export function StatsOverview({
  totalWelds,
  avgQuality,
  defectRate,
  avgStability,
  trend = 'stable',
}: StatsOverviewProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const stats = [
    {
      label: '总焊点数',
      value: totalWelds.toString(),
      unit: '个',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: '平均质量',
      value: avgQuality.toFixed(1),
      unit: '%',
      color: avgQuality >= 80 ? 'text-green-400' : avgQuality >= 60 ? 'text-yellow-400' : 'text-red-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: '缺陷率',
      value: defectRate.toFixed(2),
      unit: '%',
      color: defectRate < 5 ? 'text-green-400' : defectRate < 15 ? 'text-yellow-400' : 'text-red-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: '平均稳定性',
      value: avgStability.toFixed(1),
      unit: '%',
      color: avgStability >= 80 ? 'text-green-400' : avgStability >= 60 ? 'text-yellow-400' : 'text-red-400',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">{stat.label}</span>
            <div className={`p-1.5 rounded ${stat.bgColor}`}>
              {getTrendIcon()}
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
            <span className="text-sm text-gray-500">{stat.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
