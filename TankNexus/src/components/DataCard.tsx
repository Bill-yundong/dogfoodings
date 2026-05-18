'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface DataCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status?: 'normal' | 'warning' | 'error' | 'offline';
  subtitle?: string;
}

export default function DataCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  status = 'normal',
  subtitle,
}: DataCardProps) {
  const statusColors = {
    normal: 'border-tech-green/30 bg-tech-green/5',
    warning: 'border-tech-yellow/30 bg-tech-yellow/5',
    error: 'border-tech-red/30 bg-tech-red/5',
    offline: 'border-gray-600/30 bg-gray-600/5',
  };

  const iconColors = {
    normal: 'text-tech-green',
    warning: 'text-tech-yellow',
    error: 'text-tech-red',
    offline: 'text-gray-500',
  };

  const trendColors = {
    up: 'text-tech-green',
    down: 'text-tech-red',
    stable: 'text-tech-cyan',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`relative overflow-hidden rounded-xl border ${statusColors[status]} p-5 backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">
              {value}
            </span>
            {unit && <span className="text-sm text-gray-400">{unit}</span>}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-xs font-medium ${trendColors[trend]}`}>
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                {trend === 'stable' && '→'}
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-industrial-800/50 ${iconColors[status]}`}>
          <Icon size={24} />
        </div>
      </div>
      
      {status !== 'offline' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-tech-cyan/30 to-transparent" />
      )}
    </motion.div>
  );
}
