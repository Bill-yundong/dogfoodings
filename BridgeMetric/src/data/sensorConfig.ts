import type { SensorInfo } from '../types'

export const bridgeSensors: SensorInfo[] = [
  {
    id: 'SG-001',
    name: '主梁A段应变片',
    type: 'strain_gauge',
    location: {
      x: 50,
      y: 0,
      z: 10,
      structureType: 'main_girder',
      description: '主梁跨中位置'
    },
    calibration: {
      offset: 0,
      scale: 1.0,
      temperatureCoefficient: 0.001
    },
    thresholds: {
      warning: 150,
      danger: 250,
      critical: 350
    },
    installationDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    lastCalibrationDate: Date.now() - 30 * 24 * 60 * 60 * 1000
  },
  {
    id: 'SG-002',
    name: '主梁B段应变片',
    type: 'strain_gauge',
    location: {
      x: 150,
      y: 0,
      z: 10,
      structureType: 'main_girder',
      description: '主梁1/4跨位置'
    },
    calibration: {
      offset: 0,
      scale: 1.0,
      temperatureCoefficient: 0.001
    },
    thresholds: {
      warning: 150,
      danger: 250,
      critical: 350
    },
    installationDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    lastCalibrationDate: Date.now() - 30 * 24 * 60 * 60 * 1000
  },
  {
    id: 'SG-003',
    name: '桥墩1应变片',
    type: 'strain_gauge',
    location: {
      x: 0,
      y: -20,
      z: 5,
      structureType: 'pier',
      description: '桥墩1底部'
    },
    calibration: {
      offset: 0,
      scale: 1.0,
      temperatureCoefficient: 0.0008
    },
    thresholds: {
      warning: 200,
      danger: 350,
      critical: 500
    },
    installationDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    lastCalibrationDate: Date.now() - 30 * 24 * 60 * 60 * 1000
  },
  {
    id: 'SG-004',
    name: '拉索A应变片',
    type: 'strain_gauge',
    location: {
      x: 100,
      y: 30,
      z: 15,
      structureType: 'cable',
      description: '主拉索中段'
    },
    calibration: {
      offset: 0,
      scale: 1.0,
      temperatureCoefficient: 0.0012
    },
    thresholds: {
      warning: 100,
      danger: 180,
      critical: 250
    },
    installationDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    lastCalibrationDate: Date.now() - 30 * 24 * 60 * 60 * 1000
  },
  {
    id: 'DS-001',
    name: '主梁跨中位移',
    type: 'displacement',
    location: {
      x: 100,
      y: 0,
      z: 10,
      structureType: 'main_girder',
      description: '主梁跨中位移监测'
    },
    calibration: {
      offset: 0,
      scale: 1.0,
      temperatureCoefficient: 0.0005
    },
    thresholds: {
      warning: 50,
      danger: 80,
      critical: 120
    },
    installationDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    lastCalibrationDate: Date.now() - 30 * 24 * 60 * 60 * 1000
  },
  {
    id: 'ACC-001',
    name: '主梁加速度',
    type: 'acceleration',
    location: {
      x: 100,
      y: 0,
      z: 10,
      structureType: 'main_girder',
      description: '主梁振动监测'
    },
    calibration: {
      offset: 0,
      scale: 1.0,
      temperatureCoefficient: 0.0001
    },
    thresholds: {
      warning: 0.5,
      danger: 1.0,
      critical: 2.0
    },
    installationDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    lastCalibrationDate: Date.now() - 30 * 24 * 60 * 60 * 1000
  },
  {
    id: 'TEMP-001',
    name: '主梁温度',
    type: 'temperature',
    location: {
      x: 100,
      y: 0,
      z: 10,
      structureType: 'main_girder',
      description: '主梁环境温度监测'
    },
    calibration: {
      offset: 0,
      scale: 1.0,
      temperatureCoefficient: 0
    },
    thresholds: {
      warning: 45,
      danger: 55,
      critical: 65
    },
    installationDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
    lastCalibrationDate: Date.now() - 30 * 24 * 60 * 60 * 1000
  }
]

export const sensorUnits: Record<string, string> = {
  strain_gauge: 'με',
  displacement: 'mm',
  acceleration: 'm/s²',
  temperature: '°C'
}
