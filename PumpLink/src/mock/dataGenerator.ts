import type { PumpDevice, HealthSnapshot, Alert, VibrationFeatures, CavitationRisk } from '@/types'

const regions = ['华东区', '华南区', '华北区', '西南区', '西北区']
const locations = ['上海石化总厂', '广州炼油厂', '北京化工基地', '成都水电厂', '兰州泵站']
const models = ['CP-2000', 'CP-3000', 'CP-4000', 'CP-5000', 'CP-6000']

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function generateMockDevices(count: number): PumpDevice[] {
  const devices: PumpDevice[] = []
  const statuses: PumpDevice['currentStatus'][] = ['running', 'running', 'running', 'standby', 'maintenance', 'fault']

  for (let i = 0; i < count; i++) {
    const regionIdx = Math.floor(Math.random() * regions.length)
    const healthScore = Math.floor(randomInRange(35, 98))
    
    devices.push({
      id: generateId('dev'),
      name: `离心泵组-${String(i + 1).padStart(3, '0')}`,
      model: models[Math.floor(Math.random() * models.length)],
      location: locations[regionIdx],
      region: regions[regionIdx],
      installDate: `202${Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      ratedPower: Math.floor(randomInRange(500, 3000)),
      ratedFlow: Math.floor(randomInRange(100, 1000)),
      ratedHead: Math.floor(randomInRange(50, 300)),
      currentStatus: statuses[Math.floor(Math.random() * statuses.length)],
      healthScore,
      lastSnapshotTime: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
      sensorIds: [generateId('sen'), generateId('sen')],
      coordinates: {
        lat: randomInRange(20, 50),
        lng: randomInRange(80, 130)
      }
    })
  }

  return devices
}

export function generateVibrationFeatures(healthScore: number): VibrationFeatures {
  const severity = (100 - healthScore) / 100
  
  return {
    rms: randomInRange(1, 12) * (0.3 + severity * 0.7),
    peak: randomInRange(5, 50) * (0.3 + severity * 0.7),
    crestFactor: randomInRange(3, 10) * (0.8 + severity * 0.2),
    kurtosis: randomInRange(2.5, 8) * (0.8 + severity * 0.2),
    skewness: randomInRange(-1, 2) * severity,
    peakFrequency: randomInRange(100, 500),
    harmonicRatio: randomInRange(0.1, 0.7) * severity
  }
}

export function generateCavitationRisk(healthScore: number): CavitationRisk {
  const severity = (100 - healthScore) / 100
  const probability = Math.min(95, severity * 100 + randomInRange(-10, 10))
  
  let level: CavitationRisk['level'] = 'low'
  if (probability > 75) level = 'critical'
  else if (probability > 50) level = 'high'
  else if (probability > 25) level = 'medium'

  const trends: CavitationRisk['trend'][] = ['improving', 'stable', 'deteriorating']
  const trend = trends[Math.min(2, Math.floor(severity * 3))]

  return {
    level,
    probability,
    factors: [
      { name: '振动有效值', weight: 0.25, value: randomInRange(2, 15), threshold: 5, unit: 'mm/s' },
      { name: '峰值振幅', weight: 0.2, value: randomInRange(10, 60), threshold: 20, unit: 'mm/s' },
      { name: '波峰因子', weight: 0.15, value: randomInRange(3, 12), threshold: 6, unit: '' },
      { name: '峭度指标', weight: 0.2, value: randomInRange(2, 10), threshold: 4, unit: '' },
      { name: '谐波占比', weight: 0.1, value: randomInRange(0.1, 0.8), threshold: 0.3, unit: '%' },
      { name: '能量集中度', weight: 0.1, value: randomInRange(0.3, 0.9), threshold: 0.6, unit: '' }
    ],
    trend
  }
}

export function generateMockSnapshots(deviceId: string, count: number): HealthSnapshot[] {
  const snapshots: HealthSnapshot[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const healthScore = Math.floor(randomInRange(40, 98))
    const timestamp = now - i * 3600000 * 6
    
    snapshots.push({
      id: generateId('snap'),
      deviceId,
      timestamp,
      healthScore,
      vibrationFeatures: generateVibrationFeatures(healthScore),
      cavitationRisk: generateCavitationRisk(healthScore),
      recommendations: healthScore > 70 
        ? ['设备运行正常，保持监测']
        : healthScore > 40
        ? ['建议增加监测频率', '检查入口压力']
        : ['立即停机检查', '安排专业维护']
    })
  }

  return snapshots
}

export function generateMockAlerts(devices: PumpDevice[]): Alert[] {
  const alerts: Alert[] = []
  const severities: Alert['severity'][] = ['info', 'warning', 'error', 'critical']
  const statuses: Alert['status'][] = ['pending', 'acknowledged', 'resolved']

  const alertTemplates = [
    { title: '振动值超标', description: '径向振动有效值超过警告阈值' },
    { title: '气蚀风险预警', description: '检测到潜在气蚀先兆特征' },
    { title: '轴承温度异常', description: '驱动端轴承温度上升速率异常' },
    { title: '流量偏离', description: '运行流量低于设计点70%' },
    { title: '压力脉动', description: '出口压力波动超过正常范围' }
  ]

  for (let i = 0; i < 30; i++) {
    const device = devices[Math.floor(Math.random() * devices.length)]
    const template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)]
    const severity = severities[Math.floor(Math.random() * severities.length)]
    
    alerts.push({
      id: generateId('alert'),
      deviceId: device.id,
      deviceName: device.name,
      severity,
      title: template.title,
      description: template.description,
      timestamp: Date.now() - Math.floor(Math.random() * 86400000 * 7),
      status: severity === 'critical' ? 'pending' : statuses[Math.floor(Math.random() * statuses.length)]
    })
  }

  return alerts.sort((a, b) => b.timestamp - a.timestamp)
}

export function generateWaveletData(timeSteps: number, scales: number, hasCavitation: boolean = false): number[][] {
  const data: number[][] = []

  for (let s = 0; s < scales; s++) {
    const row: number[] = []
    for (let t = 0; t < timeSteps; t++) {
      let val = Math.random() * 0.3
      
      if (hasCavitation) {
        if (s > scales / 2 && t > timeSteps / 3 && t < timeSteps * 2 / 3) {
          val += Math.exp(-Math.pow((t - timeSteps / 2) / (timeSteps / 6), 2)) * 
                  Math.exp(-Math.pow((s - scales * 0.75) / (scales / 4), 2)) * 0.8
        }
      }

      const rotFreq = Math.sin(2 * Math.PI * t * 0.05) * 0.3
      val += rotFreq * Math.exp(-s / scales)

      row.push(Math.min(1, Math.max(0, val)))
    }
    data.push(row)
  }

  return data
}
