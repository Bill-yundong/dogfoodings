export interface Package {
  id: string;
  barcode: string;
  destination: string;
  weight: number;
  volume: number;
  entryTime: number;
  priority: number;
  status: 'pending' | 'sorting' | 'sorted' | 'error';
  currentPosition: string;
  assignedPath: string[];
  actualPath: string[];
}

export interface ConveyorNode {
  id: string;
  name: string;
  type: 'entry' | 'junction' | 'chute' | 'exit' | 'cross-belt';
  x: number;
  y: number;
  neighbors: string[];
  capacity: number;
  currentLoad: number;
  isActive: boolean;
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
  action: 'route' | 'hold' | 'redirect' | 'eject';
  targetNode: string;
  timestamp: number;
  deadline: number;
  status: 'pending' | 'sent' | 'acknowledged' | 'executed' | 'failed';
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

export interface SortingSnapshot {
  id: string;
  version: number;
  timestamp: number;
  packages: Package[];
  commands: WCSCommand[];
  plcStatus: PLCStatus[];
  performanceMetrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
  throughput: number;
  averageSortTime: number;
  errorRate: number;
  utilizationRate: number;
  totalPackages: number;
  sortedPackages: number;
}

export interface AlignmentResult {
  isAligned: boolean;
  timeDiff: number;
  wcsTime: number;
  plcTime: number;
  packageId: string;
}

export type { Package, ConveyorNode, SortingPath, WCSCommand, PLCStatus, SortingSnapshot, PerformanceMetrics, AlignmentResult };
