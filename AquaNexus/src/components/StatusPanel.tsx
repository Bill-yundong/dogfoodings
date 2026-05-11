import React from 'react';
import { Wifi, WifiOff, Database, Clock, AlertTriangle } from 'lucide-react';
import type { AlignmentStatus, MonitoringPoint } from '../types/hydrodynamics';

interface StatusPanelProps {
  networkStatus: boolean;
  alignmentStatus: AlignmentStatus | null;
  monitoringPoints: MonitoringPoint[];
  lastSnapshotTime: number | null;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  networkStatus,
  alignmentStatus,
  monitoringPoints,
  lastSnapshotTime,
}) => {
  const statusCounts = React.useMemo(() => {
    const counts = { normal: 0, warning: 0, critical: 0, offline: 0 };
    monitoringPoints.forEach((p) => counts[p.status]++);
    return counts;
  }, [monitoringPoints]);

  const totalPoints = monitoringPoints.length;
  const normalPercentage = totalPoints > 0 ? (statusCounts.normal / totalPoints) * 100 : 0;

  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <Database className="w-5 h-5 text-aqua-400" />
        系统状态
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            {networkStatus ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm text-slate-400">网络状态</span>
          </div>
          <div className="text-xl font-bold">
            {networkStatus ? (
              <span className="text-emerald-400">在线</span>
            ) : (
              <span className="text-red-400">离线</span>
            )}
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-aqua-400" />
            <span className="text-sm text-slate-400">系统对齐度</span>
          </div>
          <div className="text-xl font-bold text-aqua-400">
            {alignmentStatus?.alignmentScore.toFixed(1) || 0}%
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
            <div
              className="bg-aqua-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${alignmentStatus?.alignmentScore || 0}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-slate-400">监测点状态</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-emerald-400">正常</span>
              <span className="text-slate-300">{statusCounts.normal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400">预警</span>
              <span className="text-slate-300">{statusCounts.warning}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-400">危急</span>
              <span className="text-slate-300">{statusCounts.critical}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-aqua-400" />
            <span className="text-sm text-slate-400">最新快照</span>
          </div>
          <div className="text-sm text-slate-300">
            {lastSnapshotTime
              ? new Date(lastSnapshotTime).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '无数据'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            健康度: {normalPercentage.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};
