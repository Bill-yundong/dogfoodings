import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

export function formatPercent(num: number, decimals: number = 1): string {
  return `${(num * 100).toFixed(decimals)}%`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'HH:mm:ss', { locale: zhCN });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}小时${mins}分钟`;
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'available': 'text-status-green',
    'occupied': 'text-alert-orange',
    'normal': 'text-status-green',
    'warning': 'text-alert-orange',
    'error': 'text-red-500',
    'healthy': 'text-status-green',
    'degrading': 'text-alert-orange',
    'replace': 'text-red-500',
    'enroute': 'text-electric-blue',
    'delayed': 'text-alert-orange',
    'cancelled': 'text-red-500',
    'arrived': 'text-status-green',
  };
  return colorMap[status] || 'text-metal-gray';
}

export function getStatusBgColor(status: string): string {
  const colorMap: Record<string, string> = {
    'available': 'bg-status-green/20',
    'occupied': 'bg-alert-orange/20',
    'normal': 'bg-status-green/20',
    'warning': 'bg-alert-orange/20',
    'error': 'bg-red-500/20',
    'healthy': 'bg-status-green/20',
    'degrading': 'bg-alert-orange/20',
    'replace': 'bg-red-500/20',
  };
  return colorMap[status] || 'bg-metal-gray/20';
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
