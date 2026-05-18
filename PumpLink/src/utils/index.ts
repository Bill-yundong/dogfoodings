import dayjs from 'dayjs'

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals)
}

export function formatTimestamp(timestamp: number): string {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

export function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('YYYY-MM-DD')
}

export function formatDuration(hours: number): string {
  if (hours < 24) return `${hours.toFixed(1)} 小时`
  const days = hours / 24
  return `${days.toFixed(1)} 天`
}

export function getHealthColor(score: number): string {
  if (score >= 80) return '#00C853'
  if (score >= 60) return '#FFD600'
  if (score >= 40) return '#FF9100'
  return '#FF1744'
}

export function getRiskColor(level: string): string {
  const map: Record<string, string> = {
    low: '#00C853',
    medium: '#FFD600',
    high: '#FF9100',
    critical: '#FF1744'
  }
  return map[level] || '#8892B0'
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    running: '#00C853',
    standby: '#64FFDA',
    maintenance: '#FF9100',
    fault: '#FF1744'
  }
  return map[status] || '#8892B0'
}

export function getStatusText(status: string): string {
  const map: Record<string, string> = {
    running: '运行中',
    standby: '待机',
    maintenance: '维护中',
    fault: '故障'
  }
  return map[status] || status
}

export function getRiskText(level: string): string {
  const map: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    critical: '严重'
  }
  return map[level] || level
}

export function getSeverityText(severity: string): string {
  const map: Record<string, string> = {
    info: '提示',
    warning: '警告',
    error: '错误',
    critical: '严重'
  }
  return map[severity] || severity
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function throttle<T extends (...args: any[]) => any>(fn: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
