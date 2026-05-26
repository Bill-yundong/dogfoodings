import type { ReactNode } from 'react';
import { cn } from '@/utils/format';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  glow?: boolean;
  icon?: ReactNode;
  actions?: ReactNode;
}

export function Card({ children, className, title, subtitle, glow = false, icon, actions }: CardProps) {
  return (
    <div className={cn(
      'glass-card p-4 transition-all duration-300',
      glow && 'glow-border',
      className
    )}>
      {(title || icon || actions) && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && <span className="text-electric-blue">{icon}</span>}
            <div>
              {title && <h3 className="text-sm font-semibold text-white font-display">{title}</h3>}
              {subtitle && <p className="text-xs text-metal-gray">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
