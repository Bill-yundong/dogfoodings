import type { Facility, AlertEvent, SafetyScore, SafetyDimension } from './types'

export function generateFacilities(): Facility[] {
  return [
    { id: 'f1', name: '1# 压缩机', type: 'compressor', status: 'normal', pressure: 45.2, temperature: 38.5, x: 200, y: 150 },
    { id: 'f2', name: '2# 压缩机', type: 'compressor', status: 'warning', pressure: 47.8, temperature: 42.1, x: 200, y: 280 },
    { id: 'f3', name: '1# 高压储罐', type: 'tank', status: 'normal', pressure: 35.0, temperature: 25.3, x: 380, y: 150 },
    { id: 'f4', name: '2# 高压储罐', type: 'tank', status: 'normal', pressure: 34.5, temperature: 24.8, x: 380, y: 280 },
    { id: 'f5', name: '1# 加注机', type: 'dispenser', status: 'normal', pressure: 35.0, temperature: 22.1, x: 560, y: 120 },
    { id: 'f6', name: '2# 加注机', type: 'dispenser', status: 'alarm', pressure: 38.9, temperature: 28.7, x: 560, y: 220 },
    { id: 'f7', name: '3# 加注机', type: 'dispenser', status: 'normal', pressure: 34.8, temperature: 21.9, x: 560, y: 320 },
    { id: 'f8', name: '主管道A', type: 'pipeline', status: 'normal', pressure: 35.2, temperature: 23.4, x: 290, y: 150 },
    { id: 'f9', name: '主管道B', type: 'pipeline', status: 'normal', pressure: 35.1, temperature: 23.1, x: 290, y: 280 },
    { id: 'f10', name: '放散阀', type: 'vent', status: 'normal', pressure: 0.1, temperature: 20.0, x: 450, y: 380 },
    { id: 'f11', name: '氢气传感器组', type: 'sensor', status: 'normal', pressure: 0, temperature: 22.0, x: 350, y: 420 },
    { id: 'f12', name: '火焰探测器', type: 'sensor', status: 'normal', pressure: 0, temperature: 21.5, x: 500, y: 420 },
  ]
}

const alertMessages: Record<string, string[]> = {
  pressure: ['压力超上限告警', '压力波动异常', '压力传感器漂移', '泄压阀动作'],
  temperature: ['温度越限告警', '温升速率异常', '冷却系统故障', '环境温度超标'],
  leak: ['微量氢气泄漏', '高压管路泄漏', '法兰连接泄漏', '阀门内漏检测'],
  system: ['PLC通信中断', 'UPS电源切换', '安全仪表系统触发', '紧急切断阀动作'],
  communication: ['站控通信中断', '消防终端离线', '数据同步延迟', '网络链路恢复'],
}

const alertLevels: Array<AlertEvent['level']> = ['info', 'warning', 'alarm', 'critical']

let alertCounter = 0

export function generateAlert(facilities: Facility[]): AlertEvent {
  const types = Object.keys(alertMessages) as AlertEvent['type'][]
  const type = types[Math.floor(Math.random() * types.length)]
  const messages = alertMessages[type]
  const message = messages[Math.floor(Math.random() * messages.length)]
  const level = alertLevels[Math.floor(Math.random() * alertLevels.length)]
  const facility = facilities[Math.floor(Math.random() * facilities.length)]
  alertCounter++
  return {
    id: `alert-${Date.now()}-${alertCounter}`,
    type,
    level,
    message,
    facilityId: facility.id,
    timestamp: Date.now(),
    acknowledged: false,
  }
}

export function calculateSafetyScore(facilities: Facility[]): SafetyScore {
  const dims: Record<SafetyDimension, Facility[]> = {
    storage: facilities.filter(f => f.type === 'tank'),
    compression: facilities.filter(f => f.type === 'compressor'),
    dispensing: facilities.filter(f => f.type === 'dispenser'),
    environment: facilities.filter(f => f.type === 'sensor' || f.type === 'vent'),
  }

  const scoreMap: Record<Facility['status'], number> = {
    normal: 100,
    warning: 70,
    alarm: 40,
    offline: 20,
  }

  const dimensions: Record<SafetyDimension, number> = {} as Record<SafetyDimension, number>
  let totalWeight = 0
  let weightedSum = 0
  const weights: Record<SafetyDimension, number> = {
    storage: 0.35,
    compression: 0.30,
    dispensing: 0.25,
    environment: 0.10,
  }

  for (const [dim, fs] of Object.entries(dims)) {
    if (fs.length === 0) {
      dimensions[dim as SafetyDimension] = 100
    } else {
      const avg = fs.reduce((s, f) => s + scoreMap[f.status], 0) / fs.length
      dimensions[dim as SafetyDimension] = Math.round(avg)
    }
    weightedSum += dimensions[dim as SafetyDimension] * weights[dim as SafetyDimension]
    totalWeight += weights[dim as SafetyDimension]
  }

  return {
    overall: Math.round(weightedSum / totalWeight),
    dimensions,
  }
}

export function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleString('zh-CN', { hour12: false })
}
