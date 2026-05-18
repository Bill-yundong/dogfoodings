export function formatNumber(num: number, decimals = 2): string {
  return num.toFixed(decimals);
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-red-500';
    case 'warning':
      return 'text-warning-500';
    case 'info':
      return 'text-industrial-400';
    default:
      return 'text-gray-400';
  }
}

export function getSeverityBgColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/20 border-red-500/50';
    case 'warning':
      return 'bg-warning-500/20 border-warning-500/50';
    case 'info':
      return 'bg-industrial-500/20 border-industrial-500/50';
    default:
      return 'bg-gray-500/20 border-gray-500/50';
  }
}

export function getHealthColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-warning-500';
  return 'text-red-500';
}

export function getHealthBgColor(score: number): string {
  if (score >= 80) return 'from-green-500/20 to-green-600/20';
  if (score >= 60) return 'from-yellow-500/20 to-yellow-600/20';
  if (score >= 40) return 'from-warning-500/20 to-warning-600/20';
  return 'from-red-500/20 to-red-600/20';
}
