import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export { formatPressure, formatFlow } from '@/lib/flowModel';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`;
  } else {
    return `${Math.floor(diff / 86400000)} 天前`;
  }
}

export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function interpolateColor(value: number, min: number, max: number): string {
  const normalized = clamp((value - min) / (max - min), 0, 1);
  
  if (normalized < 0.2) {
    return '#3B82F6';
  } else if (normalized < 0.4) {
    return '#10B981';
  } else if (normalized < 0.6) {
    return '#F59E0B';
  } else if (normalized < 0.8) {
    return '#F97316';
  } else {
    return '#EF4444';
  }
}

export function getAlertLevelColor(level: string): string {
  switch (level) {
    case 'info':
      return 'text-primary-400 bg-primary-500/10 border-primary-500/30';
    case 'warning':
      return 'text-warning-400 bg-warning-500/10 border-warning-500/30';
    case 'danger':
      return 'text-danger-400 bg-danger-500/10 border-danger-500/30';
    case 'critical':
      return 'text-danger-300 bg-danger-500/20 border-danger-500/50';
    default:
      return 'text-dark-400 bg-dark-700/50 border-dark-600';
  }
}

export function getAlertLevelLabel(level: string): string {
  switch (level) {
    case 'info':
      return '提示';
    case 'warning':
      return '警告';
    case 'danger':
      return '危险';
    case 'critical':
      return '紧急';
    default:
      return '未知';
  }
}

export function getCommandStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-warning-400 bg-warning-500/10 border-warning-500/30';
    case 'executing':
      return 'text-primary-400 bg-primary-500/10 border-primary-500/30';
    case 'completed':
      return 'text-success-400 bg-success-500/10 border-success-500/30';
    case 'failed':
      return 'text-danger-400 bg-danger-500/10 border-danger-500/30';
    case 'cancelled':
      return 'text-dark-400 bg-dark-700/50 border-dark-600';
    default:
      return 'text-dark-400 bg-dark-700/50 border-dark-600';
  }
}

export function getCommandStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return '待执行';
    case 'executing':
      return '执行中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '执行失败';
    case 'cancelled':
      return '已取消';
    default:
      return '未知';
  }
}

export function getStationStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return 'bg-success-500';
    case 'warning':
      return 'bg-warning-500';
    case 'danger':
      return 'bg-danger-500';
    case 'offline':
      return 'bg-dark-500';
    default:
      return 'bg-dark-500';
  }
}

export function getStationStatusLabel(status: string): string {
  switch (status) {
    case 'online':
      return '正常运行';
    case 'warning':
      return '预警';
    case 'danger':
      return '告警';
    case 'offline':
      return '离线';
    default:
      return '未知';
  }
}

export function downloadJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
