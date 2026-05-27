import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-lg border border-coffee-100 overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('p-6 border-b border-coffee-100', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn('text-lg font-bold text-coffee-900', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export function CardDescription({
  children,
  className,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={cn('text-sm text-coffee-500 mt-1', className)}
      {...props}
    >
      {children}
    </p>
  );
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn('p-6 border-t border-coffee-100 bg-coffee-50/50', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  color?: 'amber' | 'green' | 'red' | 'blue' | 'purple';
  compact?: boolean;
  className?: string;
}

const colorClasses = {
  amber: 'from-amber-50 to-orange-50 border-amber-200',
  green: 'from-emerald-50 to-green-50 border-emerald-200',
  red: 'from-red-50 to-rose-50 border-red-200',
  blue: 'from-blue-50 to-sky-50 border-blue-200',
  purple: 'from-violet-50 to-purple-50 border-violet-200',
};

const iconColorClasses = {
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-violet-100 text-violet-700',
};

export function StatsCard({
  title,
  value,
  icon,
  trend,
  color = 'amber',
  compact = false,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'bg-gradient-to-br rounded-2xl border shadow-md',
        compact ? 'p-3' : 'p-5',
        colorClasses[color],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={cn('font-medium text-coffee-600', compact ? 'text-xs' : 'text-sm')}>{title}</p>
          <p className={cn('font-bold text-coffee-900 mt-1', compact ? 'text-xl' : 'text-3xl')}>{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className={cn(
                  'font-medium',
                  compact ? 'text-xs' : 'text-sm',
                  trend.positive ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {trend.positive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
              </span>
              <span className={cn('text-coffee-500', compact ? 'text-[10px]' : 'text-xs')}>{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'rounded-xl',
              compact ? 'p-2' : 'p-3',
              iconColorClasses[color]
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses = {
  default: 'bg-coffee-100 text-coffee-700',
  secondary: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

interface ButtonProps extends HTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}

const buttonVariantClasses = {
  primary:
    'bg-gradient-to-r from-coffee-700 to-coffee-800 text-white hover:from-coffee-800 hover:to-coffee-900 shadow-lg shadow-coffee-700/20',
  secondary:
    'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20',
  outline:
    'border-2 border-coffee-300 text-coffee-700 hover:bg-coffee-50 hover:border-coffee-400',
  ghost:
    'text-coffee-600 hover:bg-coffee-100',
  danger:
    'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
};

const buttonSizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-lg',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
