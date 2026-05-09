import type { CongestionLevel } from '@/types'

export function getCongestionColor(level: CongestionLevel): string {
  switch (level) {
    case 'low':
      return 'bg-green-500'
    case 'medium':
      return 'bg-yellow-500'
    case 'high':
      return 'bg-orange-500'
    case 'critical':
      return 'bg-red-600'
    default:
      return 'bg-gray-500'
  }
}

export function getCongestionTextColor(level: CongestionLevel): string {
  switch (level) {
    case 'low':
      return 'text-green-600'
    case 'medium':
      return 'text-yellow-600'
    case 'high':
      return 'text-orange-600'
    case 'critical':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

export function getCongestionLabel(level: CongestionLevel): string {
  switch (level) {
    case 'low':
      return '畅通'
    case 'medium':
      return '较拥挤'
    case 'high':
      return '拥挤'
    case 'critical':
      return '严重拥挤'
    default:
      return '未知'
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'low':
      return 'bg-blue-100 text-blue-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'high':
      return 'bg-orange-100 text-orange-800'
    case 'critical':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-800'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800'
    case 'completed':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return '待处理'
    case 'in_progress':
      return '处理中'
    case 'completed':
      return '已完成'
    default:
      return status
  }
}

export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

export function formatPercentage(num: number): string {
  return (num * 100).toFixed(1) + '%'
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) {
    return `${minutes}分钟`
  }
  return `${minutes}分${remainingSeconds}秒`
}
