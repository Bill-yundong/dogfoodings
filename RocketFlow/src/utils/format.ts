export const formatPressure = (value: number): string => {
  return value.toFixed(3)
}

export const formatTemperature = (value: number): string => {
  return value.toFixed(2)
}

export const formatFlowRate = (value: number): string => {
  return value.toFixed(2)
}

export const formatPercent = (value: number): string => {
  return value.toFixed(1)
}

export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export const formatCountdown = (ms: number): string => {
  const isNegative = ms < 0
  const absMs = Math.abs(ms)
  const totalSeconds = Math.floor(absMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const milliseconds = Math.floor((absMs % 1000) / 10)
  
  const sign = isNegative ? '+' : 'T-'
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
}

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp)
  const timeStr = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const ms = String(Math.floor(date.getMilliseconds())).padStart(3, '0')
  return `${timeStr}.${ms}`
}

export const getRiskLevel = (value: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
  if (value < 30) return 'LOW'
  if (value < 50) return 'MEDIUM'
  if (value < 80) return 'HIGH'
  return 'CRITICAL'
}

export const getRiskColor = (level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string => {
  switch (level) {
    case 'LOW': return '#00ff88'
    case 'MEDIUM': return '#ffd700'
    case 'HIGH': return '#ff6b35'
    case 'CRITICAL': return '#ff2d55'
  }
}

export const getStatusColor = (status: boolean): string => {
  return status ? '#00ff88' : '#ff2d55'
}
