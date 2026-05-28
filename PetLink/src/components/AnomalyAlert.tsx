'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Check, Activity, Heart, Brain } from 'lucide-react';
import { AnomalyDetection } from '@/types';
import { usePetLinkStore } from '@/lib/store';

interface AnomalyAlertProps {
  anomaly: AnomalyDetection;
}

export default function AnomalyAlert({ anomaly }: AnomalyAlertProps) {
  const { acknowledgeAnomaly } = usePetLinkStore();

  const severityStyles = {
    low: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-500',
      badge: 'bg-yellow-100 text-yellow-700',
    },
    medium: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-500',
      badge: 'bg-orange-100 text-orange-700',
    },
    high: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-500',
      badge: 'bg-red-100 text-red-700',
    },
  };

  const typeIcons = {
    gait: <Activity className="w-5 h-5" />,
    vital: <Heart className="w-5 h-5" />,
    behavior: <Brain className="w-5 h-5" />,
  };

  const severityLabels = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  };

  const style = severityStyles[anomaly.severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-xl ${style.bg} ${style.border} border ${
        anomaly.acknowledged ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${style.icon} bg-white/60`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-slate-600">
              {typeIcons[anomaly.type]}
              {anomaly.type === 'gait' && '步态异常'}
              {anomaly.type === 'vital' && '生理指标异常'}
              {anomaly.type === 'behavior' && '行为异常'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
              {severityLabels[anomaly.severity]}
            </span>
            <span className="text-xs text-slate-400">
              {Math.round(anomaly.confidence * 100)}% 置信度
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-700">{anomaly.description}</p>
          <p className="mt-1 text-xs text-slate-500">
            {new Date(anomaly.timestamp).toLocaleString('zh-CN')}
          </p>
        </div>
        {!anomaly.acknowledged && (
          <button
            onClick={() => acknowledgeAnomaly(anomaly.id)}
            className="p-2 rounded-lg bg-white/60 hover:bg-white transition-colors text-slate-500 hover:text-primary-600"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
