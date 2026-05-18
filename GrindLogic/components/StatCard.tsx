'use client';

import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  status?: 'normal' | 'warning' | 'critical';
  delay?: number;
}

export function StatCard({ title, value, unit, icon: Icon, trend, status = 'normal', delay = 0 }: StatCardProps) {
  const statusColors = {
    normal: 'from-primary-500/20 to-primary-500/5 border-primary-500/30',
    warning: 'from-warning-500/20 to-warning-500/5 border-warning-500/30',
    critical: 'from-red-500/20 to-red-500/5 border-red-500/30',
  };

  const statusIconColors = {
    normal: 'text-primary-400',
    warning: 'text-warning-400',
    critical: 'text-red-400',
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${statusColors[status]} border backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10 group`}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-dark-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white font-display tracking-tight">
              {value}
            </span>
            {unit && <span className="text-sm text-dark-400">{unit}</span>}
          </div>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 text-accent-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-warning-400" />
              )}
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? 'text-accent-400' : 'text-warning-400'
                }`}
              >
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-xs text-dark-500">较上批次</span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl bg-dark-800/50 flex items-center justify-center ${statusIconColors[status]} group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary-500/10 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
    </motion.div>
  );
}
