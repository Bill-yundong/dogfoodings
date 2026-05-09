// 电网拓扑元素类型
export interface GridNode {
  id: string;
  name: string;
  type: 'substation' | 'transformer' | 'load' | 'generator';
  capacity: number; // 容量
  currentLoad: number; // 当前负荷
  voltageLevel: number; // 电压等级
  coordinates: {
    x: number;
    y: number;
  };
}

export interface GridEdge {
  id: string;
  source: string; // 源节点ID
  target: string; // 目标节点ID
  capacity: number; // 传输容量
  currentFlow: number; // 当前流量
  impedance: number; // 阻抗
}

export interface GridTopology {
  nodes: GridNode[];
  edges: GridEdge[];
}

// 语义映射类型
export interface SemanticMapping {
  id: string;
  sourceSystem: string; // 源系统（如调度中心）
  targetSystem: string; // 目标系统（如变电站）
  mappings: MappingItem[];
  lastUpdated: string;
}

export interface MappingItem {
  sourceField: string;
  targetField: string;
  transformation?: string; // 转换规则
  validation?: string; // 验证规则
}

// 运行状态类型
export interface GridState {
  timestamp: string;
  topology: GridTopology;
  keyMetrics: {
    totalLoad: number;
    totalGeneration: number;
    peakLoad: number;
    averageLoad: number;
  };
  alerts: GridAlert[];
}

export interface GridAlert {
  id: string;
  nodeId: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

// 扩容决策类型
export interface ExpansionDecision {
  id: string;
  timestamp: string;
  recommendations: ExpansionRecommendation[];
  reasoning: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ExpansionRecommendation {
  nodeId: string;
  action: 'add_capacity' | 'add_node' | 'upgrade_line';
  details: any;
  estimatedCost: number;
  expectedBenefit: number;
  paybackPeriod: number;
}
