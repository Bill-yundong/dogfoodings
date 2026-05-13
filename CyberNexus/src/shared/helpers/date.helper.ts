export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(2)} 秒`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(2)} 分钟`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(2)} 小时`;
  return `${(seconds / 86400).toFixed(2)} 天`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatRate(rate: number, unit = '秒'): string {
  if (rate < 1000) return `${rate.toFixed(2)}/${unit}`;
  if (rate < 1000000) return `${(rate / 1000).toFixed(2)} K/${unit}`;
  return `${(rate / 1000000).toFixed(2)} M/${unit}`;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds} 秒前`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} 天前`;
  return formatTimestamp(timestamp);
}
