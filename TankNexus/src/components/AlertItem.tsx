'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, XCircle, CheckCircle, Clock } from 'lucide-react';
import type { Alert } from '@/types';
import { acknowledgeAlert } from '@/lib/db';

interface AlertItemProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
}

export default function AlertItem({ alert, onAcknowledge }: AlertItemProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleAcknowledge = () => {
    if (!alert.acknowledged) {
      acknowledgeAlert(alert.id);
      onAcknowledge?.(alert.id);
    }
  };

  const severityConfig = {
    warning: {
      bg: 'bg-tech-yellow/10',
      border: 'border-tech-yellow/30',
      icon: AlertTriangle,
      iconColor: 'text-tech-yellow',
    },
    critical: {
      bg: 'bg-tech-red/10',
      border: 'border-tech-red/30',
      icon: XCircle,
      iconColor: 'text-tech-red',
    },
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      onClick={handleAcknowledge}
      className={`p-3 rounded-lg border ${config.bg} ${config.border} cursor-pointer transition-all hover:scale-[1.01] ${alert.acknowledged ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 flex-shrink-0 ${config.iconColor}`} size={18} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{alert.message}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">{alert.robotId}</span>
            <span className="text-xs text-gray-500">阈值: {alert.threshold}</span>
            <span className="text-xs text-gray-400">当前: {alert.value}</span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <Clock size={12} />
            <span>{formatTime(alert.timestamp)}</span>
            {alert.acknowledged && (
              <span className="ml-2 flex items-center gap-1 text-tech-green">
                <CheckCircle size={12} />
                已确认
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
