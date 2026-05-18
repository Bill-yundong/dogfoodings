import React from 'react';
import { Bell, User, Database } from 'lucide-react';
import { StatusIndicator } from '../common/StatusIndicator';
import { useSimulationStore } from '../../store/useSimulationStore';

export const Topbar: React.FC = () => {
  const { status, currentTime, warnings } = useSimulationStore();
  const criticalWarnings = warnings.filter((w) => w.severity === 'critical' || w.severity === 'high');

  return (
    <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <StatusIndicator status={status} size="md" showLabel />
          <div className="h-4 w-px bg-slate-700" />
          <div className="text-sm">
            <span className="text-slate-400">仿真时间: </span>
            <span className="text-white font-mono">{currentTime.toFixed(2)}s</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Database size={14} className="text-cyan-400" />
          <span className="text-slate-400">IndexedDB</span>
        </div>

        <button className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <Bell size={18} className="text-slate-400" />
          {criticalWarnings.length > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              {criticalWarnings.length}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <div className="text-sm">
            <p className="text-white font-medium">管理员</p>
            <p className="text-xs text-slate-400">工程师</p>
          </div>
        </div>
      </div>
    </div>
  );
};
