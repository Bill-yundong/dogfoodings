import { FaultSlice } from '../models/FaultSlice.js'

export class SemanticAlignmentService {
  constructor() {
    this.vocabularies = {
      deviceOps: this.createDeviceOpsVocabulary(),
      realTimeMonitor: this.createRealTimeMonitorVocabulary()
    }
    this.mappings = this.createDefaultMappings()
    this.alignedSlices = new Map()
  }

  createDeviceOpsVocabulary() {
    return {
      faultTypes: {
        '断路器跳闸': 'breaker_trip',
        '保护动作': 'protection_action',
        '过流保护': 'overcurrent_protection',
        '差动保护': 'differential_protection',
        '距离保护': 'distance_protection'
      },
      status: {
        '运行': 'online',
        '停运': 'offline',
        '检修': 'maintenance',
        '故障': 'fault'
      },
      severity: {
        '一般': 'low',
        '重要': 'medium',
        '紧急': 'high',
        '事故': 'critical'
      }
    }
  }

  createRealTimeMonitorVocabulary() {
    return {
      faultTypes: {
        'Phase A Fault': 'phase_a_ground',
        'Phase B Fault': 'phase_b_ground',
        'Phase C Fault': 'phase_c_ground',
        'Three Phase Fault': 'three_phase_short',
        'Overcurrent': 'overcurrent_protection'
      },
      status: {
        'Normal': 'normal',
        'Warning': 'warning',
        'Alarm': 'alarm',
        'Fault': 'fault'
      },
      severity: {
        'Low': 'low',
        'Medium': 'medium',
        'High': 'high',
        'Critical': 'critical'
      }
    }
  }

  createDefaultMappings() {
    return {
      deviceOpsToStandard: {
        '断路器跳闸': 'breaker_trip',
        '保护动作': 'protection_activated',
        '过流保护': 'overcurrent',
        '差动保护': 'differential',
        '距离保护': 'distance',
        '运行': 'online',
        '停运': 'offline',
        '检修': 'maintenance',
        '故障': 'fault'
      },
      realTimeToStandard: {
        'Phase A Fault': 'phase_a_ground',
        'Phase B Fault': 'phase_b_ground',
        'Phase C Fault': 'phase_c_ground',
        'Three Phase Fault': 'three_phase_short',
        'Overcurrent': 'overcurrent',
        'Normal': 'normal',
        'Warning': 'warning',
        'Alarm': 'alarm',
        'Fault': 'fault'
      },
      standardToUnified: {
        'breaker_trip': 'circuit_breaker_operation',
        'protection_activated': 'protection_device_action',
        'overcurrent': 'overcurrent_condition',
        'differential': 'differential_protection_event',
        'distance': 'distance_protection_event',
        'phase_a_ground': 'phase_a_to_ground_fault',
        'phase_b_ground': 'phase_b_to_ground_fault',
        'phase_c_ground': 'phase_c_to_ground_fault',
        'three_phase_short': 'three_phase_short_circuit',
        'online': 'operational',
        'offline': 'non_operational',
        'maintenance': 'under_maintenance',
        'fault': 'fault_condition',
        'normal': 'normal_operation',
        'warning': 'warning_condition',
        'alarm': 'alarm_condition'
      }
    }
  }

  alignDeviceOpsData(deviceOpsData) {
    const standardData = this.mapToStandard(deviceOpsData, this.mappings.deviceOpsToStandard)
    return this.mapToUnified(standardData, 'device_ops')
  }

  alignRealTimeData(realTimeData) {
    const standardData = this.mapToStandard(realTimeData, this.mappings.realTimeToStandard)
    return this.mapToUnified(standardData, 'real_time_monitor')
  }

  mapToStandard(data, mapping) {
    const result = { ...data }
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && mapping[value]) {
        result[key] = mapping[value]
      }
    }
    return result
  }

  mapToUnified(data, source) {
    const unifiedData = {
      ...data,
      source,
      alignedAt: Date.now(),
      semanticTags: []
    }

    if (data.faultType && this.mappings.standardToUnified[data.faultType]) {
      unifiedData.faultType = this.mappings.standardToUnified[data.faultType]
      unifiedData.semanticTags.push(unifiedData.faultType)
    }

    if (data.status && this.mappings.standardToUnified[data.status]) {
      unifiedData.status = this.mappings.standardToUnified[data.status]
      unifiedData.semanticTags.push(unifiedData.status)
    }

    return unifiedData
  }

  alignFaultSlices(deviceOpsSlice, realTimeSlice) {
    const timeThreshold = 1000
    const timeDiff = Math.abs(deviceOpsSlice.timestamp - realTimeSlice.timestamp)

    if (timeDiff > timeThreshold) {
      return { aligned: false, reason: 'time_mismatch', timeDiff }
    }

    const alignedDeviceOps = this.alignDeviceOpsData(deviceOpsSlice.toJSON())
    const alignedRealTime = this.alignRealTimeData(realTimeSlice.toJSON())

    const confidence = this.calculateAlignmentConfidence(alignedDeviceOps, alignedRealTime)

    const unifiedSlice = new FaultSlice({
      ...alignedDeviceOps,
      id: `ALIGNED-${Date.now()}`,
      timestamp: Math.min(deviceOpsSlice.timestamp, realTimeSlice.timestamp),
      sources: ['device_ops', 'real_time_monitor'],
      alignmentConfidence: confidence,
      deviceOpsData: alignedDeviceOps,
      realTimeData: alignedRealTime,
      semanticTags: [...new Set([...alignedDeviceOps.semanticTags, ...alignedRealTime.semanticTags])]
    })

    this.alignedSlices.set(unifiedSlice.id, unifiedSlice)

    return {
      aligned: true,
      confidence,
      unifiedSlice,
      timeDiff
    }
  }

  calculateAlignmentConfidence(data1, data2) {
    let score = 0
    let total = 0

    if (data1.deviceId && data2.deviceId) {
      total++
      if (data1.deviceId === data2.deviceId) score++
    }

    if (data1.faultType && data2.faultType) {
      total++
      if (data1.faultType === data2.faultType) score++
    }

    if (data1.faultPhase && data2.faultPhase) {
      total++
      if (data1.faultPhase === data2.faultPhase) score++
    }

    return total > 0 ? score / total : 0.5
  }

  getAlignmentStatistics() {
    const slices = Array.from(this.alignedSlices.values())
    return {
      totalAligned: slices.length,
      averageConfidence: slices.reduce((sum, s) => sum + (s.alignmentConfidence || 0), 0) / (slices.length || 1),
      sources: {
        deviceOps: slices.filter(s => s.sources?.includes('device_ops')).length,
        realTimeMonitor: slices.filter(s => s.sources?.includes('real_time_monitor')).length
      }
    }
  }

  addMapping(type, from, to) {
    const mappingKey = `${type}ToStandard`
    if (this.mappings[mappingKey]) {
      this.mappings[mappingKey][from] = to
    }
  }

  searchBySemanticTag(tag) {
    return Array.from(this.alignedSlices.values()).filter(slice =>
      slice.semanticTags?.includes(tag)
    )
  }
}

export const alignmentService = new SemanticAlignmentService()
