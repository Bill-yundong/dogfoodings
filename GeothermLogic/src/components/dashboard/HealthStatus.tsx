'use client';

import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useAppStore } from '@/store/use-app-store';

export default function HealthStatus() {
  const { healthStatuses } = useAppStore();

  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    warning: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-6">系统健康状态</h3>

      <div className="space-y-4">
        {healthStatuses.map((status, index) => {
          const config = statusConfig[status.status];
          const Icon = config.icon;

          return (
            <motion.div
              key={status.module}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className={`flex items-center justify-between p-4 rounded-lg ${config.bg} border ${config.border}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${config.color} ${status.status === 'warning' ? 'animate-pulse' : ''}`} />
                <div>
                  <p className="text-sm font-medium text-white">{status.module}</p>
                  <p className="text-xs text-gray-400">{status.message}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
                {status.status === 'healthy' ? '正常' : status.status === 'warning' ? '警告' : '异常'}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
