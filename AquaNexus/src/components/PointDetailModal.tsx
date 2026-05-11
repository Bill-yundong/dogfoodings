import React from 'react';
import { X, Droplets, Thermometer, Activity, Zap } from 'lucide-react';
import type { MonitoringPoint } from '../types/hydrodynamics';

interface PointDetailModalProps {
  point: MonitoringPoint | null;
  onClose: () => void;
}

const STATUS_LABELS: Record<MonitoringPoint['status'], { label: string; color: string }> = {
  normal: { label: '正常', color: 'text-emerald-400 bg-emerald-400/10' },
  warning: { label: '预警', color: 'text-amber-400 bg-amber-400/10' },
  critical: { label: '危急', color: 'text-red-400 bg-red-400/10' },
  offline: { label: '离线', color: 'text-gray-400 bg-gray-400/10' },
};

export const PointDetailModal: React.FC<PointDetailModalProps> = ({ point, onClose }) => {
  if (!point) return null;

  const statusInfo = STATUS_LABELS[point.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl w-full max-w-md mx-4 shadow-2xl border border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">{point.name}</h3>
            <p className="text-sm text-slate-400">ID: {point.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">状态</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-slate-400 text-xs mb-1">X坐标</div>
              <div className="text-slate-100 font-semibold">{point.coordinate.x.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-slate-400 text-xs mb-1">Y坐标</div>
              <div className="text-slate-100 font-semibold">{point.coordinate.y.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-slate-400 text-xs mb-1">深度</div>
              <div className="text-slate-100 font-semibold">{point.coordinate.z.toFixed(2)}</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-aqua-400" />
              水质参数
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">pH值</div>
                <div className="text-slate-100 font-semibold">{point.waterQuality.pH.toFixed(2)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">浊度 (NTU)</div>
                <div className="text-slate-100 font-semibold">{point.waterQuality.turbidity.toFixed(2)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">溶解氧 (mg/L)</div>
                <div className="text-slate-100 font-semibold">{point.waterQuality.dissolvedOxygen.toFixed(2)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">
                  <Thermometer className="w-3 h-3 inline mr-1" />
                  温度 (°C)
                </div>
                <div className="text-slate-100 font-semibold">{point.waterQuality.temperature.toFixed(1)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">电导率 (μS/cm)</div>
                <div className="text-slate-100 font-semibold">{point.waterQuality.conductivity.toFixed(0)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">氨氮 (mg/L)</div>
                <div className="text-slate-100 font-semibold">{point.waterQuality.ammoniaNitrogen.toFixed(3)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">总磷 (mg/L)</div>
                <div className="text-slate-100 font-semibold">{point.waterQuality.totalPhosphorus.toFixed(3)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">COD (mg/L)</div>
                <div className="text-slate-100 font-semibold">{point.waterQuality.chemicalOxygenDemand.toFixed(1)}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-aqua-400" />
              水动力参数
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">
                  <Zap className="w-3 h-3 inline mr-1" />
                  流速 (m/s)
                </div>
                <div className="text-slate-100 font-semibold">
                  {Math.sqrt(
                    point.velocity.x ** 2 + point.velocity.y ** 2 + point.velocity.z ** 2
                  ).toFixed(3)}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-slate-400 text-xs mb-1">压力 (kPa)</div>
                <div className="text-slate-100 font-semibold">{point.pressure.toFixed(1)}</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 text-right">
            最后更新: {new Date(point.lastUpdate).toLocaleString('zh-CN')}
          </div>
        </div>
      </div>
    </div>
  );
};
