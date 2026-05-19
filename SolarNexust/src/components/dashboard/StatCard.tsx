import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'cyan' | 'emerald' | 'yellow' | 'orange' | 'red' | 'blue';
}

const colorMap = {
  cyan: {
    bg: 'from-cyan-500/20 to-cyan-500/5',
    border: 'border-cyan-500/30',
    icon: 'text-cyan-400',
    value: 'text-cyan-300',
  },
  emerald: {
    bg: 'from-emerald-500/20 to-emerald-500/5',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-400',
    value: 'text-emerald-300',
  },
  yellow: {
    bg: 'from-yellow-500/20 to-yellow-500/5',
    border: 'border-yellow-500/30',
    icon: 'text-yellow-400',
    value: 'text-yellow-300',
  },
  orange: {
    bg: 'from-orange-500/20 to-orange-500/5',
    border: 'border-orange-500/30',
    icon: 'text-orange-400',
    value: 'text-orange-300',
  },
  red: {
    bg: 'from-red-500/20 to-red-500/5',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    value: 'text-red-300',
  },
  blue: {
    bg: 'from-blue-500/20 to-blue-500/5',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    value: 'text-blue-300',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'cyan',
}: StatCardProps) {
  const colors = colorMap[color];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border ${colors.border} bg-gradient-to-br ${colors.bg} backdrop-blur-md p-6`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <motion.p
            key={value}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`mt-2 text-3xl font-bold font-mono ${colors.value}`}
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-xs ${trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{trend.value.toFixed(1)}%</span>
              <span className="text-slate-500">较昨日</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-slate-900/50 ${colors.icon}`}>
          <Icon size={24} />
        </div>
      </div>
    </motion.div>
  );
}
