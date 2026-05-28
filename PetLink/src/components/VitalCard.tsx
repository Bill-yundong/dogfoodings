'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface VitalCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  color: string;
  bgColor: string;
}

export default function VitalCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  color,
  bgColor,
}: VitalCardProps) {
  const trendColors = {
    up: 'text-red-500',
    down: 'text-blue-500',
    stable: 'text-slate-400',
  };

  return (
    <motion.div
      className="card p-5 card-hover"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {trend && (
          <span className={`text-sm ${trendColors[trend]}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
      <div className="mt-4">
        <motion.div
          className="flex items-baseline gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-3xl font-poppins font-bold text-slate-800">
            {value}
          </span>
          <span className="text-sm text-slate-500">{unit}</span>
        </motion.div>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
      </div>
    </motion.div>
  );
}
