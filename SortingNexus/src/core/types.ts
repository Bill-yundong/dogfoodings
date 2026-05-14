export type NodeType = 'entry' | 'cross-belt' | 'junction' | 'chute' | 'exit';
export type PackageStatus = 'pending' | 'sorting' | 'sorted' | 'error';
export type CommandStatus = 'pending' | 'sent' | 'acknowledged' | 'executed' | 'failed';
export type CommandAction = 'route' | 'hold' | 'redirect' | 'eject';
export type ErrorType = 'MISALIGNMENT' | 'NODE_FAILURE' | 'PACKAGE_JAM' | 'PATH_NOT_FOUND' | 'COMMAND_TIMEOUT' | 'SENSOR_ERROR';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ConveyorNode {
  id: string;
  name: string;
  type: NodeType;
  x: number;
  y: number;
  neighbors: string[];
  capacity: number;
  currentLoad: number;
  isActive: boolean;
}

export interface Package {
  id: string;
  barcode: string;
  destination: string;
  weight: number;
  volume: number;
  entryTime: number;
  priority: number;
  status: PackageStatus;
  currentPosition: string;
  assignedPath: string[];
  actualPath: string[];
}

export interface SortingPath {
  id: string;
  packageId: string;
  nodes: string[];
  totalDistance: number;
  estimatedTime: number;
  createdAt: number;
  priority: number;
}

export interface WCSCommand {
  id: string;
  packageId: string;
  action: CommandAction;
  targetNode: string;
  timestamp: number;
  deadline: number;
  status: CommandStatus;
  plcAckTime?: number;
  executionTime?: number;
}

export interface PLCStatus {
  nodeId: string;
  isRunning: boolean;
  currentSpeed: number;
  packageCount: number;
  lastUpdate: number;
  errorCode?: string;
}

export interface PerformanceMetrics {
  throughput: number;
  averageSortTime: number;
  errorRate: number;
  utilizationRate: number;
  totalPackages: number;
  sortedPackages: number;
}

export interface SortingSnapshot {
  id: string;
  version: number;
  timestamp: number;
  packages: Package[];
  commands: WCSCommand[];
  plcStatus: PLCStatus[];
  performanceMetrics: PerformanceMetrics;
}

export interface AlignmentResult {
  isAligned: boolean;
  timeDiff: number;
  wcsTime: number;
  plcTime: number;
  packageId: string;
}

export interface ErrorEvent {
  id: string;
  type: ErrorType;
  timestamp: number;
  severity: ErrorSeverity;
  message: string;
  packageId?: string;
  nodeId?: string;
  commandId?: string;
  resolved: boolean;
  resolvedAt?: number;
  resolution?: string;
}

export interface SystemState {
  packages: Package[];
  nodes: ConveyorNode[];
  metrics: PerformanceMetrics;
  errors: ErrorEvent[];
  plcStatus: PLCStatus[];
  isRunning: boolean;
  averageLatency: number;
}
