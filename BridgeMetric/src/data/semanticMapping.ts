import type { SensorType, BridgeStructureType, SemanticMapping } from '../types'

export const sensorTypeLabels: Record<SensorType, { cn: string; en: string }> = {
  strain_gauge: { cn: '应变片', en: 'Strain Gauge' },
  displacement: { cn: '位移传感器', en: 'Displacement Sensor' },
  acceleration: { cn: '加速度传感器', en: 'Acceleration Sensor' },
  temperature: { cn: '温度传感器', en: 'Temperature Sensor' }
}

export const structureTypeLabels: Record<BridgeStructureType, { cn: string; en: string }> = {
  main_girder: { cn: '主梁', en: 'Main Girder' },
  pier: { cn: '桥墩', en: 'Pier' },
  cable: { cn: '拉索', en: 'Cable' },
  deck: { cn: '桥面', en: 'Deck' },
  bearing: { cn: '支座', en: 'Bearing' }
}

export const semanticMapping: SemanticMapping = {
  operationCenter: {
    strain_gauge_main_girder: '主梁应力监测',
    strain_gauge_pier: '桥墩应力监测',
    strain_gauge_cable: '拉索张力监测',
    strain_gauge_deck: '桥面应力监测',
    strain_gauge_bearing: '支座受力监测',
    displacement_main_girder: '主梁挠度监测',
    displacement_pier: '桥墩位移监测',
    displacement_cable: '拉索伸长监测',
    displacement_deck: '桥面沉降监测',
    displacement_bearing: '支座位移监测',
    acceleration_main_girder: '主梁振动监测',
    acceleration_pier: '桥墩振动监测',
    acceleration_cable: '拉索振动监测',
    acceleration_deck: '桥面振动监测',
    acceleration_bearing: '支座振动监测',
    temperature_main_girder: '主梁温度监测',
    temperature_pier: '桥墩温度监测',
    temperature_cable: '拉索温度监测',
    temperature_deck: '桥面温度监测',
    temperature_bearing: '支座温度监测'
  },
  emergencyCommand: {
    strain_gauge_main_girder: '主梁结构应力异常',
    strain_gauge_pier: '桥墩应力超限预警',
    strain_gauge_cable: '拉索张力异常预警',
    strain_gauge_deck: '桥面结构应力异常',
    strain_gauge_bearing: '支座受力异常预警',
    displacement_main_girder: '主梁挠度超限警报',
    displacement_pier: '桥墩位移超限警报',
    displacement_cable: '拉索伸长异常警报',
    displacement_deck: '桥面沉降异常警报',
    displacement_bearing: '支座位移异常警报',
    acceleration_main_girder: '主梁振动超限预警',
    acceleration_pier: '桥墩振动异常警报',
    acceleration_cable: '拉索颤振预警',
    acceleration_deck: '桥面共振预警',
    acceleration_bearing: '支座振动异常预警',
    temperature_main_girder: '主梁温度梯度异常',
    temperature_pier: '桥墩温度应力预警',
    temperature_cable: '拉索温度异常监测',
    temperature_deck: '桥面温度差监测',
    temperature_bearing: '支座温度异常监测'
  }
}

export const recommendationRules = {
  normal: ['继续常规监测', '保持定期巡检'],
  warning: ['增加监测频率', '安排技术人员现场检查', '分析历史数据趋势'],
  danger: ['启动应急监测预案', '立即通知运维团队', '准备应急响应措施'],
  critical: ['启动紧急响应程序', '疏散人员', '限制桥梁通行', '通知应急指挥中心']
}
