'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import type { Alert } from '@/types';
import { cn, formatTime, getAlertLevelColor, getAlertLevelLabel } from '@/utils';
import { useGasMatrixStore } from '@/store';

interface AlertListProps {
  alerts: Alert[];
  maxItems?: number;
}

export default function AlertList({ alerts, maxItems = 10 }: AlertListProps) {
  const { acknowledgeAlert, user } = useGasMatrixStore();
  const displayAlerts = alerts.slice(0, maxItems);

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-danger-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-primary-500" />;
    }
  };

  const handleAcknowledge = (alertId: string) => {
    if (user) {
      acknowledgeAlert(alertId, user.name);
    }
  };

  return (
    <div className="space-y-2">
      {displayAlerts.length === 0 ? (
        <div className="text-center py-8 text-dark-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success-500/50" />
          <p>暂无告警信息</p>
        </div>
      ) : (
        displayAlerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'p-4 rounded-lg border transition-all duration-200',
              getAlertLevelColor(alert.level),
              alert.acknowledged && 'opacity-60'
            )}
          >
            <div className="flex items-start gap-3">
              {getAlertIcon(alert.level)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      getAlertLevelColor(alert.level)
                    )}
                  >
                    {getAlertLevelLabel(alert.level)}
                  </span>
                  <span className="text-xs text-dark-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(alert.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-dark-200">{alert.message}</p>
                {alert.acknowledged && alert.acknowledgedBy && (
                  <p className="text-xs text-dark-500 mt-1">
                    已确认：{alert.acknowledgedBy} ·{' '}
                    {alert.acknowledgedAt && formatTime(alert.acknowledgedAt)}
                  </p>
                )}
              </div>
              {!alert.acknowledged && (
                <button
                  onClick={() => handleAcknowledge(alert.id)}
                  className="p-1.5 rounded hover:bg-dark-700/50 transition-colors"
                  title="确认告警"
                >
                  <CheckCircle className="w-4 h-4 text-success-500" />
                </button>
              )}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
