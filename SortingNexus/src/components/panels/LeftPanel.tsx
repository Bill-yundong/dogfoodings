import React from 'react';
import { MetricCard } from '../common/MetricCard';
import { PerformanceMetrics, PLCStatus } from '../../types';

interface LeftPanelProps {
  metrics: PerformanceMetrics;
  plcStatus: PLCStatus[];
}

export const LeftPanel: React.FC<LeftPanelProps> = ({ metrics, plcStatus }) => {
  return (
    <aside className="w-80 bg-gray-800 border-r border-gray-700 p-5 min-h-screen overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-300 mb-5 flex items-center gap-2">
        <span>📊</span> 性能指标
      </h2>
      
      <div className="space-y-3">
        <MetricCard icon="📦" label="总包裹数" value={metrics.totalPackages} color="blue" />
        <MetricCard icon="✅" label="已分拣" value={metrics.sortedPackages} color="green" />
        <MetricCard icon="⚡" label="分拣效率" value={`${metrics.throughput.toFixed(1)}/s`} color="yellow" />
        <MetricCard icon="📈" label="设备利用率" value={`${(metrics.utilizationRate * 100).toFixed(0)}%`} color="purple" />
        <MetricCard icon="⏱️" label="平均延迟" value={`${metrics.averageLatency.toFixed(0)}ms`} color="cyan" />
        <MetricCard icon="⚠️" label="错误率" value={`${(metrics.errorRate * 100).toFixed(1)}%`} color={metrics.errorRate > 0.1 ? 'red' : 'gray'} />
      </div>

      <h2 className="text-lg font-semibold text-gray-300 mt-8 mb-4 flex items-center gap-2">
        <span>🔧</span> PLC 设备状态
      </h2>
      
      <div className="space-y-2">
        {plcStatus.slice(0, 8).map(status => {
          const nodeName = status.nodeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return (
            <div key={status.nodeId} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2.5">
              <span className="text-sm font-medium text-gray-300">{nodeName}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                status.isRunning ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {status.isRunning ? '运行中' : '停止'}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default LeftPanel;
