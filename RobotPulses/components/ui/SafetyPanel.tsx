'use client';

import { Shield, AlertTriangle, AlertCircle, CheckCircle, Database, RefreshCw } from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';
import { robotDB } from '@/lib/storage/indexedDB';
import { useState } from 'react';

const warningLevelConfig = {
  safe: { icon: CheckCircle, color: 'text-accent-green', bg: 'bg-accent-green/10', label: '安全' },
  warning: { icon: AlertCircle, color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', label: '警告' },
  danger: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', label: '危险' },
  emergency: { icon: AlertTriangle, color: 'text-accent-red', bg: 'bg-accent-red/10', label: '紧急' },
};

export const SafetyPanel = () => {
  const {
    collisionWarnings,
    isDataAligned,
    maxDeviation,
    robotModels,
    actions,
  } = useSimulationStore();

  const [exporting, setExporting] = useState(false);

  const overallStatus = collisionWarnings.length > 0
    ? collisionWarnings.some(w => w.level === 'emergency')
      ? 'emergency'
      : collisionWarnings.some(w => w.level === 'danger')
      ? 'danger'
      : 'warning'
    : 'safe';

  const StatusIcon = warningLevelConfig[overallStatus].icon;

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await robotDB.exportAllSnapshots();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `robot_snapshots_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
    setExporting(false);
  };

  return (
    <div className="w-72 bg-industrial-800 border-l border-industrial-600 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-accent-cyan" />
        安全监控
      </h2>

      <div className={`p-4 rounded-lg mb-4 ${warningLevelConfig[overallStatus].bg}`}>
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-8 h-8 ${warningLevelConfig[overallStatus].color}`} />
          <div>
            <div className={`font-bold ${warningLevelConfig[overallStatus].color}`}>
              {warningLevelConfig[overallStatus].label}
            </div>
            <div className="text-xs text-industrial-400">
              {collisionWarnings.length > 0
                ? `${collisionWarnings.length} 个告警`
                : '系统运行正常'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-industrial-700 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-industrial-400">数据对齐状态</span>
          {isDataAligned ? (
            <span className="flex items-center gap-1 text-accent-green text-xs">
              <CheckCircle className="w-3 h-3" />
              已对齐
            </span>
          ) : (
            <span className="flex items-center gap-1 text-accent-red text-xs animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              未对齐
            </span>
          )}
        </div>
        <div className="text-xs text-industrial-400">
          最大偏差: <span className="text-white font-mono">{(maxDeviation * 1000000).toFixed(2)} μrad</span>
        </div>
        <div className="mt-2 h-1 bg-industrial-900 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${isDataAligned ? 'bg-accent-green' : 'bg-accent-red'}`}
            style={{ width: `${Math.min(100, (1 - maxDeviation / 0.001) * 100)}%` }}
          />
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-bold text-white mb-2">实时告警</h3>
        {collisionWarnings.length === 0 ? (
          <div className="bg-industrial-700 rounded-lg p-4 text-center text-industrial-400 text-sm">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-accent-green/50" />
            暂无告警
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {collisionWarnings.map((warning, index) => {
              const config = warningLevelConfig[warning.level];
              const WarningIcon = config.icon;
              const robot = robotModels.find(r => r.id === warning.robotId);
              return (
                <div key={index} className={`p-2 rounded-lg ${config.bg}`}>
                  <div className="flex items-start gap-2">
                    <WarningIcon className={`w-4 h-4 mt-0.5 ${config.color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium ${config.color}`}>
                        {config.label}
                      </div>
                      <div className="text-xs text-industrial-400 truncate">
                        {robot?.name || warning.robotId} - 与 {warning.obstacleId} 距离过近
                      </div>
                      <div className="text-xs text-industrial-500 mt-0.5">
                        距离: {warning.distance.toFixed(3)}m
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-industrial-600 pt-4">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-accent-cyan" />
          数据管理
        </h3>
        <div className="space-y-2">
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            导出历史数据
          </button>
          <button
            onClick={async () => {
              await robotDB.clearAll();
              await actions.syncSnapshotCount();
            }}
            className="w-full bg-accent-red/20 hover:bg-accent-red/30 text-accent-red px-4 py-2 rounded-lg text-sm transition-colors"
          >
            清空存储
          </button>
        </div>
      </div>

      <div className="border-t border-industrial-600 pt-4 mt-4">
        <h3 className="text-sm font-bold text-white mb-3">人工势场参数</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-industrial-400 flex justify-between">
              <span>引力系数 (kAtt)</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="20"
              step="0.1"
              value={useSimulationStore.getState().apfParameters.kAtt}
              onChange={(e) => actions.updateAPFParams({ kAtt: parseFloat(e.target.value) })}
              className="w-full accent-accent-cyan"
            />
          </div>
          <div>
            <label className="text-xs text-industrial-400 flex justify-between">
              <span>斥力系数 (kRep)</span>
            </label>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={useSimulationStore.getState().apfParameters.kRep}
              onChange={(e) => actions.updateAPFParams({ kRep: parseFloat(e.target.value) })}
              className="w-full accent-accent-cyan"
            />
          </div>
          <div>
            <label className="text-xs text-industrial-400 flex justify-between">
              <span>作用距离 (d0)</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.05"
              value={useSimulationStore.getState().apfParameters.d0}
              onChange={(e) => actions.updateAPFParams({ d0: parseFloat(e.target.value) })}
              className="w-full accent-accent-cyan"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
