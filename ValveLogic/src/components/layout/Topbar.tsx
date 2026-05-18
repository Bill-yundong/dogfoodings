import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, Database, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { StatusIndicator } from '../common/StatusIndicator';
import { useSimulationStore } from '../../store/useSimulationStore';
import type { Warning } from '../../types';

export const Topbar: React.FC = () => {
  const { status, currentTime, warnings, clearWarnings } = useSimulationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const criticalWarnings = warnings.filter((w) => w.severity === 'critical' || w.severity === 'high');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSeverityIcon = (severity: Warning['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />;
      case 'high':
        return <AlertCircle size={14} className="text-orange-400 flex-shrink-0" />;
      case 'medium':
        return <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />;
      default:
        return <Info size={14} className="text-blue-400 flex-shrink-0" />;
    }
  };

  const getSeverityBg = (severity: Warning['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-900/20 border-red-800/30';
      case 'high':
        return 'bg-orange-900/20 border-orange-800/30';
      case 'medium':
        return 'bg-yellow-900/20 border-yellow-800/30';
      default:
        return 'bg-blue-900/20 border-blue-800/30';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 relative">
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

        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Bell size={18} className={showNotifications ? 'text-white' : 'text-slate-400'} />
            {criticalWarnings.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                {criticalWarnings.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              ref={panelRef}
              className="absolute right-0 top-12 w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-white font-medium">系统通知</h3>
                <div className="flex items-center gap-2">
                  {warnings.length > 0 && (
                    <button
                      onClick={clearWarnings}
                      className="text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      清空全部
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {warnings.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="mx-auto text-slate-600 mb-2" size={32} />
                    <p className="text-slate-500 text-sm">暂无通知</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {warnings.slice().reverse().slice(0, 20).map((warning) => (
                      <div
                        key={warning.id}
                        className={`p-3 rounded-lg border ${getSeverityBg(warning.severity)}`}
                      >
                        <div className="flex items-start gap-2">
                          {getSeverityIcon(warning.severity)}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm">{warning.message}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatTime(warning.timestamp)} · {warning.type}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {warnings.length > 0 && (
                <div className="p-3 border-t border-slate-700 text-center">
                  <span className="text-xs text-slate-500">共 {warnings.length} 条通知</span>
                </div>
              )}
            </div>
          )}
        </div>

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
