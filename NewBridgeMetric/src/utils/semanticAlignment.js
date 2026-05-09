const SEMANTIC_MAPPINGS = {
  strainTypes: {
    bending: {
      label: '弯曲应变',
      unit: 'με',
      category: '结构应变',
      description: '测量桥梁梁体的弯曲变形',
      emergencyThreshold: 150,
      warningThreshold: 100,
      normalRange: [-50, 50],
      maintenancePriority: 'high'
    },
    shear: {
      label: '剪切应变',
      unit: 'με',
      category: '结构应变',
      description: '测量桥梁节点的剪切变形',
      emergencyThreshold: 120,
      warningThreshold: 80,
      normalRange: [-40, 40],
      maintenancePriority: 'medium'
    },
    axial: {
      label: '轴向应变',
      unit: 'με',
      category: '结构应变',
      description: '测量桥梁构件的轴向变形',
      emergencyThreshold: 80,
      warningThreshold: 50,
      normalRange: [-30, 30],
      maintenancePriority: 'low'
    }
  },
  alertLevels: {
    normal: {
      label: '正常',
      color: '#4caf50',
      priority: 0,
      actions: ['定期监测']
    },
    warning: {
      label: '警告',
      color: '#ff9800',
      priority: 1,
      actions: ['增加监测频率', '检查传感器状态', '通知运维人员']
    },
    critical: {
      label: '危急',
      color: '#f44336',
      priority: 2,
      actions: ['立即检查', '准备应急响应', '通知应急指挥中心', '限制通行']
    }
  },
  locationContext: {
    span: {
      label: '跨度',
      unit: '号',
      semanticRole: 'structural_segment'
    },
    position: {
      label: '位置',
      unit: '%',
      semanticRole: 'relative_position'
    }
  },
  timeFormats: {
    realtime: 'HH:mm:ss',
    hourly: 'HH:00',
    daily: 'YYYY-MM-DD',
    historical: 'YYYY-MM-DD HH:mm'
  }
}

const OPS_CONTEXT = {
  system: '运维中枢',
  purpose: '日常监测与维护',
  dataFormat: {
    gaugeId: '设备编号',
    value: '应变值',
    unit: '单位',
    timestamp: '采集时间',
    span: '跨度',
    position: '相对位置',
    type: '应变类型',
    status: '运行状态',
    trend: '变化趋势',
    anomalyScore: '异常评分'
  },
  metrics: [
    'maxStrain',
    'avgStrain',
    'variance',
    'trendDirection',
    'anomalyCount'
  ]
}

const EMERGENCY_CONTEXT = {
  system: '应急指挥系统',
  purpose: '应急响应与指挥',
  dataFormat: {
    sensorId: '传感器ID',
    reading: '读数',
    unit: '度量单位',
    timeOfReading: '读取时间',
    bridgeSection: '桥梁区段',
    relativeLocation: '相对位置',
    measurementType: '测量类型',
    condition: '健康状况',
    riskLevel: '风险等级',
    recommendedAction: '建议措施'
  },
  emergencyMetrics: [
    'peakValue',
    'durationAboveThreshold',
    'affectedArea',
    'escalationLevel',
    'evacuationStatus'
  ]
}

export const alignData = (rawData, strainGauges) => {
  const alignedData = {}
  
  Object.entries(rawData).forEach(([gaugeId, data]) => {
    const gauge = strainGauges.find(g => g.id === gaugeId)
    if (!gauge) {
      alignedData[gaugeId] = data
      return
    }

    const strainType = SEMANTIC_MAPPINGS.strainTypes[gauge.type] || SEMANTIC_MAPPINGS.strainTypes.bending
    const status = determineStatus(data.value, strainType)
    const trend = calculateTrend(data.value, gauge.threshold)
    const anomalyScore = calculateAnomalyScore(data.value, gauge.threshold, strainType)

    alignedData[gaugeId] = {
      ...data,
      span: gauge.span,
      position: gauge.position,
      type: gauge.type,
      status,
      
      semanticInfo: {
        ops: {
          ...OPS_CONTEXT.dataFormat,
          设备编号: gaugeId,
          应变值: data.value,
          单位: strainType.unit,
          采集时间: data.timestamp,
          跨度: gauge.span,
          相对位置: `${(gauge.position * 100).toFixed(0)}%`,
          应变类型: strainType.label,
          运行状态: SEMANTIC_MAPPINGS.alertLevels[status].label,
          变化趋势: trend,
          异常评分: anomalyScore,
          阈值: gauge.threshold,
          维护优先级: strainType.maintenancePriority,
          描述: strainType.description
        },
        emergency: {
          ...EMERGENCY_CONTEXT.dataFormat,
          sensorId: gaugeId,
          reading: data.value,
          度量单位: strainType.unit,
          读取时间: data.timestamp,
          桥梁区段: `第 ${gauge.span} 跨`,
          相对位置: `${(gauge.position * 100).toFixed(0)}% 位置`,
          测量类型: strainType.label,
          健康状况: SEMANTIC_MAPPINGS.alertLevels[status].label,
          风险等级: SEMANTIC_MAPPINGS.alertLevels[status].priority,
          建议措施: SEMANTIC_MAPPINGS.alertLevels[status].actions,
          紧急阈值: strainType.emergencyThreshold,
          警告阈值: strainType.warningThreshold,
          正常范围: strainType.normalRange
        }
      },
      
      metrics: {
        maxStrain: data.value,
        avgStrain: data.value * 0.9,
        variance: Math.abs(data.value) * 0.1,
        trendDirection: trend > 0 ? '上升' : trend < 0 ? '下降' : '平稳',
        anomalyCount: status !== 'normal' ? 1 : 0,
        peakValue: Math.abs(data.value),
        durationAboveThreshold: status !== 'normal' ? 1 : 0,
        affectedArea: gauge.span,
        escalationLevel: SEMANTIC_MAPPINGS.alertLevels[status].priority,
        evacuationStatus: status === 'critical' ? '准备中' : '无需'
      }
    }
  })

  return alignedData
}

export const generateAlert = (gauge, value) => {
  const strainType = SEMANTIC_MAPPINGS.strainTypes[gauge.type] || SEMANTIC_MAPPINGS.strainTypes.bending
  const absValue = Math.abs(value)
  
  let level = 'normal'
  let message = ''
  let recommendation = ''

  if (absValue >= strainType.emergencyThreshold) {
    level = 'critical'
    message = `${strainType.label}超过紧急阈值 (${strainType.emergencyThreshold} με)，当前值: ${value} με`
    recommendation = '立即启动应急响应程序，疏散桥梁区域，通知应急指挥中心'
  } else if (absValue >= strainType.warningThreshold) {
    level = 'warning'
    message = `${strainType.label}超过警告阈值 (${strainType.warningThreshold} με)，当前值: ${value} με`
    recommendation = '增加监测频率，检查传感器状态，通知运维团队'
  } else if (absValue > gauge.threshold) {
    level = 'warning'
    message = `${strainType.label}超过设备阈值 (${gauge.threshold} με)，当前值: ${value} με`
    recommendation = '关注该位置应变变化，安排近期检查'
  } else {
    return null
  }

  return {
    id: `ALERT-${Date.now()}`,
    gaugeId: gauge.id,
    gaugeName: gauge.name,
    span: gauge.span,
    position: `${(gauge.position * 100).toFixed(0)}%`,
    type: gauge.type,
    value,
    threshold: gauge.threshold,
    level,
    levelText: SEMANTIC_MAPPINGS.alertLevels[level].label,
    severity: SEMANTIC_MAPPINGS.alertLevels[level].priority,
    message,
    recommendation,
    timestamp: new Date().toISOString(),
    
    opsContext: {
      system: OPS_CONTEXT.system,
      purpose: OPS_CONTEXT.purpose,
      alertType: '阈值越界',
      affectedComponent: `第 ${gauge.span} 跨 ${(gauge.position * 100).toFixed(0)}% 位置的 ${strainType.label} 传感器`,
      maintenanceRequired: level !== 'normal',
      priority: strainType.maintenancePriority
    },
    
    emergencyContext: {
      system: EMERGENCY_CONTEXT.system,
      purpose: EMERGENCY_CONTEXT.purpose,
      incidentType: level === 'critical' ? '紧急事件' : '预警事件',
      location: `桥梁第 ${gauge.span} 跨`,
      coordinates: {
        span: gauge.span,
        position: gauge.position
      },
      riskAssessment: {
        level: SEMANTIC_MAPPINGS.alertLevels[level].priority,
        immediateThreat: level === 'critical',
        structuralIntegrity: level === 'critical' ? '受损' : '关注'
      },
      responseActions: SEMANTIC_MAPPINGS.alertLevels[level].actions
    }
  }
}

export const getSemanticMappings = () => {
  return SEMANTIC_MAPPINGS
}

export const getOpsContext = () => {
  return OPS_CONTEXT
}

export const getEmergencyContext = () => {
  return EMERGENCY_CONTEXT
}

export const translateBetweenSystems = (data, fromSystem, toSystem) => {
  if (fromSystem === toSystem) {
    return data
  }

  const translated = { ...data }

  if (fromSystem === 'ops' && toSystem === 'emergency') {
    if (data.设备编号) translated.sensorId = data.设备编号
    if (data.应变值) translated.reading = data.应变值
    if (data.单位) translated.度量单位 = data.单位
    if (data.采集时间) translated.读取时间 = data.采集时间
    if (data.跨度) translated.桥梁区段 = `第 ${data.跨度} 跨`
    if (data.相对位置) translated.相对位置 = data.相对位置
    if (data.应变类型) translated.测量类型 = data.应变类型
    if (data.运行状态) translated.健康状况 = data.运行状态
  } else if (fromSystem === 'emergency' && toSystem === 'ops') {
    if (data.sensorId) translated.设备编号 = data.sensorId
    if (data.reading) translated.应变值 = data.reading
    if (data.度量单位) translated.单位 = data.度量单位
    if (data.读取时间) translated.采集时间 = data.读取时间
    if (data.桥梁区段) {
      const match = data.桥梁区段.match(/第 (\d+) 跨/)
      if (match) translated.跨度 = parseInt(match[1])
    }
    if (data.相对位置) translated.相对位置 = data.相对位置
    if (data.测量类型) translated.应变类型 = data.测量类型
    if (data.健康状况) translated.运行状态 = data.健康状况
  }

  return translated
}

const determineStatus = (value, strainType) => {
  const absValue = Math.abs(value)
  
  if (absValue >= strainType.emergencyThreshold) {
    return 'critical'
  } else if (absValue >= strainType.warningThreshold) {
    return 'warning'
  }
  return 'normal'
}

const calculateTrend = (currentValue, threshold) => {
  const ratio = Math.abs(currentValue) / threshold
  
  if (ratio > 0.8) {
    return '快速上升'
  } else if (ratio > 0.5) {
    return '缓慢上升'
  } else if (ratio < 0.2) {
    return '下降'
  }
  return '平稳'
}

const calculateAnomalyScore = (value, threshold, strainType) => {
  const absValue = Math.abs(value)
  const normalizedValue = absValue / strainType.emergencyThreshold
  
  return Math.min(normalizedValue * 100, 100).toFixed(2)
}

export const generateHealthReport = (strainData, timeRange) => {
  const report = {
    generatedAt: new Date().toISOString(),
    timeRange,
    summary: {
      totalMeasurements: 0,
      avgStrain: 0,
      maxStrain: 0,
      minStrain: 0,
      warningCount: 0,
      criticalCount: 0,
      overallStatus: '良好'
    },
    opsFormat: null,
    emergencyFormat: null
  }

  let totalValue = 0
  let minValue = Infinity
  let maxValue = -Infinity

  Object.values(strainData).forEach(data => {
    report.summary.totalMeasurements++
    totalValue += data.value
    
    if (data.value < minValue) minValue = data.value
    if (data.value > maxValue) maxValue = data.value
    
    if (data.status === 'warning') report.summary.warningCount++
    if (data.status === 'critical') report.summary.criticalCount++
  })

  if (report.summary.totalMeasurements > 0) {
    report.summary.avgStrain = totalValue / report.summary.totalMeasurements
    report.summary.maxStrain = maxValue
    report.summary.minStrain = minValue
  }

  if (report.summary.criticalCount > 0) {
    report.summary.overallStatus = '危急'
  } else if (report.summary.warningCount > 0) {
    report.summary.overallStatus = '警告'
  } else if (Math.abs(report.summary.maxStrain) > 40) {
    report.summary.overallStatus = '关注'
  }

  report.opsFormat = {
    报告时间: report.generatedAt,
    时间范围: timeRange,
    总测量次数: report.summary.totalMeasurements,
    平均应变: `${report.summary.avgStrain.toFixed(2)} με`,
    最大应变: `${report.summary.maxStrain.toFixed(2)} με`,
    最小应变: `${report.summary.minStrain.toFixed(2)} με`,
    警告次数: report.summary.warningCount,
    危急次数: report.summary.criticalCount,
    整体状态: report.summary.overallStatus,
    建议措施: generateRecommendations(report.summary)
  }

  report.emergencyFormat = {
    reportGenerated: report.generatedAt,
    dataTimeframe: timeRange,
    totalReadings: report.summary.totalMeasurements,
    averageReading: `${report.summary.avgStrain.toFixed(2)} με`,
    peakReading: `${report.summary.maxStrain.toFixed(2)} με`,
    lowestReading: `${report.summary.minStrain.toFixed(2)} με`,
    warningIncidents: report.summary.warningCount,
    criticalIncidents: report.summary.criticalCount,
    bridgeCondition: report.summary.overallStatus,
    emergencyActions: generateEmergencyActions(report.summary)
  }

  return report
}

const generateRecommendations = (summary) => {
  const recommendations = []
  
  if (summary.criticalCount > 0) {
    recommendations.push('立即安排紧急检查')
    recommendations.push('通知所有相关人员')
  }
  if (summary.warningCount > 0) {
    recommendations.push('增加监测频率')
    recommendations.push('安排定期维护')
  }
  if (summary.overallStatus === '良好') {
    recommendations.push('继续常规监测')
    recommendations.push('准备下一次定期检查')
  }
  
  return recommendations
}

const generateEmergencyActions = (summary) => {
  const actions = []
  
  if (summary.criticalCount > 0) {
    actions.push('启动应急响应级别 3')
    actions.push('准备疏散程序')
    actions.push('通知应急指挥中心')
    actions.push('限制桥梁通行')
  } else if (summary.warningCount > 0) {
    actions.push('启动应急响应级别 1')
    actions.push('增加巡逻频率')
    actions.push('准备应急设备')
  } else {
    actions.push('保持正常监测状态')
  }
  
  return actions
}
