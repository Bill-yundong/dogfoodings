export function formatTemperature(temp: number, decimals: number = 1): string {
  return `${temp.toFixed(decimals)}°C`;
}

export function formatCurrent(current: number, decimals: number = 0): string {
  return `${current.toFixed(decimals)}A`;
}

export function formatVoltage(voltage: number, decimals: number = 1): string {
  return `${voltage.toFixed(decimals)}kV`;
}

export function formatPower(current: number, voltage: number, decimals: number = 2): string {
  const power = current * voltage / 1000;
  return `${power.toFixed(decimals)}MW`;
}

export function formatDistance(distance: number, decimals: number = 1): string {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(decimals)}km`;
  }
  return `${distance.toFixed(decimals)}m`;
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return `${seconds}秒前`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function getTemperatureColor(temp: number, maxTemp: number = 90): string {
  const ratio = temp / maxTemp;
  if (ratio < 0.6) return '#2EC4B6';
  if (ratio < 0.75) return '#3E92CC';
  if (ratio < 0.9) return '#FF9F1C';
  return '#E63946';
}

export function getSeverityColor(severity: 'info' | 'warning' | 'danger'): string {
  switch (severity) {
    case 'info': return '#3E92CC';
    case 'warning': return '#FF9F1C';
    case 'danger': return '#E63946';
  }
}

export function getRiskLevelColor(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'low': return '#2EC4B6';
    case 'medium': return '#FF9F1C';
    case 'high': return '#E63946';
  }
}

export function interpolateColor(
  value: number,
  min: number,
  max: number,
  colors: [string, string, string] = ['#2EC4B6', '#FF9F1C', '#E63946']
): string {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  if (ratio <= 0.5) {
    return lerpColor(colors[0], colors[1], ratio * 2);
  } else {
    return lerpColor(colors[1], colors[2], (ratio - 0.5) * 2);
  }
}

function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
