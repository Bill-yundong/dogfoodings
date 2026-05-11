import React, { useMemo } from 'react';
import type { MonitoringPoint, ChemicalDriftTrajectory } from '../types/hydrodynamics';

interface MonitoringMapProps {
  monitoringPoints: MonitoringPoint[];
  trajectories: ChemicalDriftTrajectory[];
  selectedPointId?: string;
  onPointSelect?: (point: MonitoringPoint) => void;
}

const STATUS_COLORS: Record<MonitoringPoint['status'], string> = {
  normal: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
  offline: 'bg-gray-500',
};

const RISK_COLORS: Record<ChemicalDriftTrajectory['riskLevel'], string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  extreme: '#7c2d12',
};

export const MonitoringMap: React.FC<MonitoringMapProps> = ({
  monitoringPoints,
  trajectories,
  selectedPointId,
  onPointSelect,
}) => {
  const normalizedPoints = useMemo(() => {
    if (monitoringPoints.length === 0) return [];

    const maxX = Math.max(...monitoringPoints.map((p) => p.coordinate.x));
    const maxY = Math.max(...monitoringPoints.map((p) => p.coordinate.y));

    return monitoringPoints.map((point) => ({
      ...point,
      normalizedX: (point.coordinate.x / maxX) * 100,
      normalizedY: (point.coordinate.y / maxY) * 100,
    }));
  }, [monitoringPoints]);

  const normalizedTrajectories = useMemo(() => {
    if (trajectories.length === 0) return [];

    const allPositions = trajectories.flatMap((t) => t.positions);
    const maxX = Math.max(...allPositions.map((p) => p.x), 1);
    const maxY = Math.max(...allPositions.map((p) => p.y), 1);

    return trajectories.map((traj) => ({
      ...traj,
      normalizedPositions: traj.positions.map((p) => ({
        x: (p.x / maxX) * 100,
        y: (p.y / maxY) * 100,
      })),
    }));
  }, [trajectories]);

  return (
    <div className="relative w-full h-96 bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <svg className="absolute inset-0 w-full h-full">
        {normalizedTrajectories.map((traj) => {
          const points = traj.normalizedPositions
            .map((p) => `${p.x}% ${p.y}%`)
            .join(', ');

          return (
            <g key={traj.id}>
              <polyline
                points={points}
                fill="none"
                stroke={RISK_COLORS[traj.riskLevel]}
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.7"
              />
              <circle
                cx={`${traj.normalizedPositions.at(-1)?.x || 0}%`}
                cy={`${traj.normalizedPositions.at(-1)?.y || 0}%`}
                r="6"
                fill={RISK_COLORS[traj.riskLevel]}
                className="animate-pulse"
              />
            </g>
          );
        })}
      </svg>

      {normalizedPoints.map((point) => (
        <div
          key={point.id}
          className={`absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-150 ${
            STATUS_COLORS[point.status]
          } ${selectedPointId === point.id ? 'ring-2 ring-white scale-150' : ''}`}
          style={{
            left: `${point.normalizedX}%`,
            top: `${point.normalizedY}%`,
          }}
          onClick={() => onPointSelect?.(point)}
          title={point.name}
        />
      ))}

      <div className="absolute bottom-3 left-3 bg-slate-800/90 rounded-lg p-3 text-xs">
        <div className="font-semibold text-slate-200 mb-2">图例</div>
        <div className="space-y-1">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-slate-400">
                {status === 'normal'
                  ? '正常'
                  : status === 'warning'
                  ? '预警'
                  : status === 'critical'
                  ? '危急'
                  : '离线'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-3 right-3 bg-slate-800/90 rounded-lg px-3 py-2 text-xs">
        <span className="text-slate-400">监测点: </span>
        <span className="text-aqua-400 font-semibold">{monitoringPoints.length}</span>
        <span className="text-slate-600 mx-2">|</span>
        <span className="text-slate-400">轨迹: </span>
        <span className="text-aqua-400 font-semibold">{trajectories.length}</span>
      </div>
    </div>
  );
};
