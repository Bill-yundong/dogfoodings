import { SemanticLevel, FaultType } from '../types';

export const SEMANTIC_LEVEL_LABELS: Record<SemanticLevel, string> = {
  [SemanticLevel.INFORMATIONAL]: '信息',
  [SemanticLevel.WARNING]: '警告',
  [SemanticLevel.CRITICAL]: '严重',
  [SemanticLevel.EMERGENCY]: '紧急'
};

export const SEMANTIC_LEVEL_COLORS: Record<SemanticLevel, string> = {
  [SemanticLevel.INFORMATIONAL]: 'bg-blue-500',
  [SemanticLevel.WARNING]: 'bg-yellow-500',
  [SemanticLevel.CRITICAL]: 'bg-orange-500',
  [SemanticLevel.EMERGENCY]: 'bg-red-500 animate-pulse'
};

export const FAULT_TYPE_LABELS: Record<FaultType, string> = {
  [FaultType.NONE]: '无',
  [FaultType.OBSTACLE_DETECTED]: '障碍物检测',
  [FaultType.MOTOR_FAILURE]: '电机故障',
  [FaultType.SENSOR_ERROR]: '传感器故障',
  [FaultType.COMMUNICATION_ERROR]: '通信故障',
  [FaultType.DOOR_MISALIGNMENT]: '门体错位'
};

export const SEMANTIC_MAPPINGS = {
  [SemanticLevel.INFORMATIONAL]: {
    priority: 4,
    maintenanceAction: '记录日志',
    operationAction: '正常监控'
  },
  [SemanticLevel.WARNING]: {
    priority: 3,
    maintenanceAction: '安排检查',
    operationAction: '密切关注'
  },
  [SemanticLevel.CRITICAL]: {
    priority: 2,
    maintenanceAction: '立即检修',
    operationAction: '限制运行'
  },
  [SemanticLevel.EMERGENCY]: {
    priority: 1,
    maintenanceAction: '紧急响应',
    operationAction: '立即停运'
  }
};

export const FAULT_CHAIN_CONFIGS = [
  {
    id: 'motor_failure',
    name: '电机故障链',
    gates: [
      { id: 'current_sensor', type: 'OR', delay: 10 },
      { id: 'overload_detector', type: 'AND', delay: 25, faultType: FaultType.MOTOR_FAILURE, semanticLevel: SemanticLevel.CRITICAL, description: '电机电流过载检测' },
      { id: 'thermal_protection', type: 'AND', delay: 50, faultType: FaultType.MOTOR_FAILURE, semanticLevel: SemanticLevel.EMERGENCY, description: '电机过热保护触发' },
      { id: 'emergency_stop', type: 'OR', delay: 15, faultType: FaultType.MOTOR_FAILURE, semanticLevel: SemanticLevel.EMERGENCY, description: '紧急停止信号激活' }
    ],
    connections: [
      ['current_sensor', 'overload_detector'],
      ['overload_detector', 'thermal_protection'],
      ['thermal_protection', 'emergency_stop']
    ]
  },
  {
    id: 'sensor_error',
    name: '传感器故障链',
    gates: [
      { id: 'position_sensor_a', type: 'NOT', delay: 8 },
      { id: 'position_sensor_b', type: 'NOT', delay: 8 },
      { id: 'position_comparator', type: 'XOR', delay: 20, faultType: FaultType.SENSOR_ERROR, semanticLevel: SemanticLevel.WARNING, description: '位置传感器数据不一致' },
      { id: 'sensor_fault_confirmed', type: 'AND', delay: 30, faultType: FaultType.SENSOR_ERROR, semanticLevel: SemanticLevel.CRITICAL, description: '传感器故障确认' }
    ],
    connections: [
      ['position_sensor_a', 'position_comparator'],
      ['position_sensor_b', 'position_comparator'],
      ['position_comparator', 'sensor_fault_confirmed']
    ]
  },
  {
    id: 'obstacle_detection',
    name: '障碍物检测链',
    gates: [
      { id: 'light_curtain', type: 'OR', delay: 5 },
      { id: 'force_sensor', type: 'OR', delay: 5 },
      { id: 'obstacle_detected', type: 'OR', delay: 10, faultType: FaultType.OBSTACLE_DETECTED, semanticLevel: SemanticLevel.WARNING, description: '障碍物检测触发' },
      { id: 'obstacle_persistent', type: 'AND', delay: 100, faultType: FaultType.OBSTACLE_DETECTED, semanticLevel: SemanticLevel.CRITICAL, description: '障碍物持续存在' }
    ],
    connections: [
      ['light_curtain', 'obstacle_detected'],
      ['force_sensor', 'obstacle_detected'],
      ['obstacle_detected', 'obstacle_persistent']
    ]
  },
  {
    id: 'communication',
    name: '通信故障链',
    gates: [
      { id: 'packet_loss', type: 'OR', delay: 100 },
      { id: 'timeout', type: 'OR', delay: 500 },
      { id: 'comm_warning', type: 'OR', delay: 50, faultType: FaultType.COMMUNICATION_ERROR, semanticLevel: SemanticLevel.WARNING, description: '通信异常警告' },
      { id: 'comm_critical', type: 'AND', delay: 200, faultType: FaultType.COMMUNICATION_ERROR, semanticLevel: SemanticLevel.CRITICAL, description: '通信中断' }
    ],
    connections: [
      ['packet_loss', 'comm_warning'],
      ['timeout', 'comm_warning'],
      ['comm_warning', 'comm_critical']
    ]
  }
];
