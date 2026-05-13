import React from 'react';
import { PerformanceMetrics } from '../types/core';

interface MetricsPanelProps {
  metrics: PerformanceMetrics;
  averageLatency: number;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics, averageLatency }) => {
  const metricItems = [
    {
      label: '总包裹数',
      value: metrics.totalPackages,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      icon: '📦'
    },
    {
      label: '已分拣',
      value: metrics.sortedPackages,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: '✅'
    },
    {
      label: '分拣效率',
      value: `${metrics.throughput.toFixed(1)}/s`,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      icon: '⚡'
    },
    {
      label: '设备利用率',
      value: `${(metrics.utilizationRate * 100).toFixed(0)}%`,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      icon: '📊'
    },
    {
      label: '平均延迟',
      value: `${averageLatency.toFixed(0)}ms`,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      icon: '⏱️'
    },
    {
      label: '错误率',
      value: `${(metrics.errorRate * 100).toFixed(1)}%`,
      color: metrics.errorRate > 0.1 ? 'text-red-400' : 'text-gray-400',
      bgColor: metrics.errorRate > 0.1 ? 'bg-red-500/10' : 'bg-gray-500/10',
      icon: '⚠️'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {metricItems.map((item, index) => (
        <div
          key={index}
          className={`${item.bgColor} rounded-xl p-4 border border-gray-700 transition-all hover:scale-105`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xl">{item.icon}</span>
            <span className="text-gray-400 text-sm">{item.label}</span>
          </div>
          <div className={`text-2xl font-bold ${item.color}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricsPanel;
