import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
}

export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatCapacity(capacity: number): string {
  if (capacity >= 10000) {
    return `${(capacity / 10000).toFixed(1)}万`;
  }
  return capacity.toLocaleString('zh-CN');
}

export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    empty: '空闲',
    occupied: '已占用',
    reserved: '已预留',
    maintenance: '维护中',
    idle: '待机',
    running: '运行中',
    paused: '暂停',
    fault: '故障',
    pending: '待处理',
    allocating: '分配中',
    allocated: '已分配',
    executing: '执行中',
    completed: '已完成',
    failed: '失败',
  };
  return statusMap[status] || status;
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    empty: 'text-wms-subtext',
    occupied: 'text-wms-primary',
    reserved: 'text-wms-warning',
    maintenance: 'text-wms-danger',
    idle: 'text-wms-subtext',
    running: 'text-wms-success',
    paused: 'text-wms-warning',
    fault: 'text-wms-danger',
    pending: 'text-wms-subtext',
    allocating: 'text-wms-accent',
    allocated: 'text-wms-primary',
    executing: 'text-wms-success',
    completed: 'text-wms-success',
    failed: 'text-wms-danger',
    low: 'text-wms-subtext',
    medium: 'text-wms-warning',
    high: 'text-wms-danger',
    hot: 'text-wms-danger',
    warm: 'text-wms-warning',
    cool: 'text-wms-primary',
    cold: 'text-wms-subtext',
  };
  return colorMap[status] || 'text-wms-text';
}

export function getStatusBgColor(status: string): string {
  const colorMap: Record<string, string> = {
    empty: 'bg-wms-subtext/20',
    occupied: 'bg-wms-primary/20',
    reserved: 'bg-wms-warning/20',
    maintenance: 'bg-wms-danger/20',
    idle: 'bg-wms-subtext/20',
    running: 'bg-wms-success/20',
    paused: 'bg-wms-warning/20',
    fault: 'bg-wms-danger/20',
    pending: 'bg-wms-subtext/20',
    allocating: 'bg-wms-accent/20',
    allocated: 'bg-wms-primary/20',
    executing: 'bg-wms-success/20',
    completed: 'bg-wms-success/20',
    failed: 'bg-wms-danger/20',
    low: 'bg-wms-subtext/20',
    medium: 'bg-wms-warning/20',
    high: 'bg-wms-danger/20',
  };
  return colorMap[status] || 'bg-wms-panel/50';
}

export function getHeatLevelColor(level: number): string {
  if (level >= 80) return 'bg-wms-danger';
  if (level >= 60) return 'bg-wms-warning';
  if (level >= 40) return 'bg-wms-accent';
  if (level >= 20) return 'bg-wms-primary';
  return 'bg-wms-subtext';
}

export function getHeatLevelTextColor(level: number): string {
  if (level >= 80) return 'text-wms-danger';
  if (level >= 60) return 'text-wms-warning';
  if (level >= 40) return 'text-wms-accent';
  if (level >= 20) return 'text-wms-primary';
  return 'text-wms-subtext';
}

export function getStrategyText(strategy: string): string {
  const strategyMap: Record<string, string> = {
    liquidity: '流动性优先',
    association: '关联优先',
    space: '空间优先',
    balanced: '综合平衡',
  };
  return strategyMap[strategy] || strategy;
}

export function getSeverityText(severity: string): string {
  const severityMap: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
  };
  return severityMap[severity] || severity;
}

export function getFragmentTypeText(type: string): string {
  const typeMap: Record<string, string> = {
    single: '单货位碎片',
    cluster: '集群碎片',
    aisle: '巷道级碎片',
  };
  return typeMap[type] || type;
}

export function truncateString(str: string, maxLength: number = 20): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => void>(
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

export function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function calculatePagination(
  total: number,
  page: number,
  pageSize: number
): { totalPages: number; startIndex: number; endIndex: number } {
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  return { totalPages, startIndex, endIndex };
}
