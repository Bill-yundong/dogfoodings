import { FaultType } from '../value-objects/FaultType';
import { SemanticLevel } from '../value-objects/SemanticLevel';

export type LogicGateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';

export interface LogicGateConfig {
  id: string;
  type: LogicGateType;
  delay: number;
  faultType?: FaultType;
  semanticLevel?: SemanticLevel;
  description?: string;
}

export interface FaultChainConfig {
  id: string;
  name: string;
  gates: LogicGateConfig[];
  connections: Array<[string, string]>;
}

export const FAULT_CHAIN_CONFIGS: FaultChainConfig[] = [
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
    name: '传感器错误链',
    gates: [
      { id: 'position_sensor', type: 'OR', delay: 15 },
      { id: 'speed_sensor', type: 'OR', delay: 15 },
      { id: 'sensor_fusion', type: 'AND', delay: 30, faultType: FaultType.SENSOR_ERROR, semanticLevel: SemanticLevel.WARNING, description: '多传感器数据异常' }
    ],
    connections: [
      ['position_sensor', 'sensor_fusion'],
      ['speed_sensor', 'sensor_fusion']
    ]
  },
  {
    id: 'communication',
    name: '通信故障链',
    gates: [
      { id: 'heartbeat_loss', type: 'NOT', delay: 100 },
      { id: 'timeout_trigger', type: 'OR', delay: 50, faultType: FaultType.COMMUNICATION_LOST, semanticLevel: SemanticLevel.EMERGENCY, description: '通信心跳丢失' }
    ],
    connections: [
      ['heartbeat_loss', 'timeout_trigger']
    ]
  },
  {
    id: 'obstacle',
    name: '障碍物检测链',
    gates: [
      { id: 'infrared_sensor', type: 'OR', delay: 5 },
      { id: 'force_sensor', type: 'OR', delay: 5 },
      { id: 'obstacle_detected', type: 'AND', delay: 20, faultType: FaultType.DOOR_OBSTACLE, semanticLevel: SemanticLevel.WARNING, description: '门体障碍物检测' }
    ],
    connections: [
      ['infrared_sensor', 'obstacle_detected'],
      ['force_sensor', 'obstacle_detected']
    ]
  }
];

export interface GateState {
  id: string;
  type: LogicGateType;
  inputs: boolean[];
  output: boolean;
  triggeredAt?: number;
}

export interface ChainState {
  id: string;
  name: string;
  active: boolean;
  gates: GateState[];
  triggeredAt?: number;
}

export const evaluateGateOutput = (type: LogicGateType, inputs: boolean[]): boolean => {
  switch (type) {
    case 'AND':
      return inputs.length > 0 && inputs.every(v => v);
    case 'OR':
      return inputs.some(v => v);
    case 'NOT':
      return inputs.length > 0 ? !inputs[0] : false;
    case 'NAND':
      return inputs.length > 0 ? !inputs.every(v => v) : true;
    case 'NOR':
      return !inputs.some(v => v);
    case 'XOR':
      return inputs.filter(v => v).length % 2 === 1;
    default:
      return false;
  }
};
