import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center justify-between mb-4 pb-3 border-b border-steel-700/50',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <span className="p-2 bg-deep-ocean-900/50 rounded-sm text-deep-ocean-400">
            {icon}
          </span>
        )}
        <div>
          <h2 className="font-display text-lg font-semibold text-steel-50 tracking-wider">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-steel-400 font-mono mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  );
};
