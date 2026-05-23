import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, Users, Anchor, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import type { SyncStatusItem } from '@/types';

interface SyncStatusPanelProps {
  statuses: SyncStatusItem[];
  onResolveConflict?: () => void;
}

const systemConfig = {
  meteorology: { name: '气象系统', icon: Cloud, color: 'text-deep-ocean-400' },
  fleet: { name: '机队指挥', icon: Users, color: 'text-alert-orange-400' },
  platform: { name: '平台终端', icon: Anchor, color: 'text-safety-green-400' },
};

export const SyncStatusPanel: React.FC<SyncStatusPanelProps> = ({ statuses, onResolveConflict }) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {statuses.map((status, index) => {
        const config = systemConfig[status.system];
        const Icon = config.icon;

        return (
          <motion.div
            key={status.system}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="industrial-card p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 bg-steel-800 rounded-sm ${config.color}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <div className="font-display text-sm font-semibold text-steel-100">
                  {config.name}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {status.status === 'online' ? (
                    <Wifi size={12} className="text-safety-green-500" />
                  ) : status.status === 'degraded' ? (
                    <AlertTriangle size={12} className="text-alert-orange-500" />
                  ) : (
                    <WifiOff size={12} className="text-red-500" />
                  )}
                  <span
                    className={`text-xs font-mono ${
                      status.status === 'online'
                        ? 'text-safety-green-400'
                        : status.status === 'degraded'
                        ? 'text-alert-orange-400'
                        : 'text-red-400'
                    }`}
                  >
                    {status.status === 'online' ? '在线' : status.status === 'degraded' ? '降级' : '离线'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-steel-500">延迟</span>
                <span className="font-mono text-steel-200">{status.latency.toFixed(0)} ms</span>
              </div>
              <div className="w-full h-1 bg-steel-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (status.latency / 300) * 100)}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full ${
                    status.latency < 100
                      ? 'bg-safety-green-500'
                      : status.latency < 200
                      ? 'bg-alert-orange-500'
                      : 'bg-red-500'
                  }`}
                />
              </div>

              <div className="flex justify-between text-xs mt-2">
                <span className="text-steel-500">标签匹配率</span>
                <span className="font-mono text-deep-ocean-400">{status.tagMatchRate.toFixed(1)}%</span>
              </div>
              <div className="w-full h-1 bg-steel-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${status.tagMatchRate}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="h-full bg-deep-ocean-500"
                />
              </div>
            </div>

            {status.status === 'degraded' && (
              <button
                onClick={onResolveConflict}
                className="w-full mt-3 py-1.5 text-xs font-mono text-alert-orange-400 border border-alert-orange-500/30 rounded-sm hover:bg-alert-orange-500/10 transition-colors"
              >
                解决冲突
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
