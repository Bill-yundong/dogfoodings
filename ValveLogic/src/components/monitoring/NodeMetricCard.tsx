import React from 'react';
import { Gauge, Droplets, Zap, AlertTriangle } from 'lucide-react';
import { NumberScroll } from '../common/NumberScroll';
import { StatusIndicator } from '../common/StatusIndicator';
import type { PipelineNode, Warning, WarningSeverity } from '../../types';

interface NodeMetricCardProps {
  node: PipelineNode;
  realTimePressure?: number;
  warnings: Warning[];
  isSelected: boolean;
  onClick: () => void;
}

export const NodeMetricCard: React.FC<NodeMetricCardProps> = ({
  node,
  realTimePressure,
  warnings,
  isSelected,
  onClick,
}) => {
  const pressure = realTimePressure ?? node.pressure;
  const nodeWarnings = warnings.filter((w) => w.nodeId === node.id);
  const hasWarning = nodeWarnings.length > 0;
  const maxSeverity = hasWarning
    ? nodeWarnings.reduce((max, w) => {
        const severityOrder: Record<WarningSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
        return severityOrder[w.severity] > severityOrder[max] ? w.severity : max;
      }, 'low' as WarningSeverity)
    : null;

  const pressureInMPa = pressure / 1000000;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all cursor-pointer hover:border-blue-500/50 ${
        isSelected
          ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-500/20'
          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
      } ${hasWarning ? 'border-red-500/50' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium text-white">{node.name}</span>
          {hasWarning && maxSeverity && (
            <StatusIndicator status={maxSeverity} size="sm" showLabel />
          )}
        </div>
        <span className="text-xs text-slate-400 uppercase">{node.type}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <Gauge size={12} />
            <span>压力</span>
          </div>
          <NumberScroll
            value={pressureInMPa}
            decimals={2}
            unit="MPa"
            className={`text-lg font-bold ${
              pressureInMPa > 8 ? 'text-red-400' : pressureInMPa > 6 ? 'text-yellow-400' : 'text-green-400'
            }`}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <Droplets size={12} />
            <span>流量</span>
          </div>
          <NumberScroll
            value={node.flowRate}
            decimals={3}
            unit="m³/s"
            className="text-lg font-bold text-blue-400"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <Zap size={12} />
            <span>流速</span>
          </div>
          <NumberScroll
            value={node.velocity}
            decimals={2}
            unit="m/s"
            className="text-lg font-bold text-cyan-400"
          />
        </div>
      </div>

      {hasWarning && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          {nodeWarnings.slice(0, 2).map((warning) => (
            <div key={warning.id} className="flex items-start gap-2 text-xs">
              <AlertTriangle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">{warning.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
