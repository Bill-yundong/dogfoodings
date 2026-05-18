export type LocationStatus = 'empty' | 'occupied' | 'reserved' | 'defective';

export interface Location {
  id: string;
  row: number;
  col: number;
  level: number;
  status: LocationStatus;
  skuId?: string;
  skuName?: string;
  heatLevel: number;
  lastAccessTime: number;
  capacity: number;
  usedCapacity: number;
}

export type SKUCategory = 'electronics' | 'clothing' | 'food' | 'cosmetics' | 'household' | 'industrial';

export interface SKU {
  id: string;
  name: string;
  category: SKUCategory;
  liquidityScore: number;
  inCount: number;
  outCount: number;
  lastMoveTime: number;
  associatedSKUs: string[];
  heatLevel: number;
  weight: number;
  volume: number;
}

export interface SKUSnapshot {
  skuId: string;
  timestamp: number;
  liquidityScore: number;
  inCount: number;
  outCount: number;
  locationId?: string;
}

export type StackerStatus = 'idle' | 'running' | 'paused' | 'error';

export interface Stacker {
  id: string;
  name: string;
  status: StackerStatus;
  currentTask?: Task;
  efficiency: number;
  totalTasks: number;
  currentPosition: { row: number; col: number; level: number };
  errorMessage?: string;
}

export type TaskType = 'inbound' | 'outbound' | 'transfer' | 'defrag';
export type TaskStatus = 'pending' | 'executing' | 'completed' | 'failed';

export interface Task {
  id: string;
  type: TaskType;
  skuId: string;
  skuName: string;
  fromLocation?: string;
  toLocation: string;
  status: TaskStatus;
  priority: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  stackerId?: string;
  progress: number;
}

export interface Fragment {
  id: string;
  locationIds: string[];
  size: number;
  wasteScore: number;
  recommendation: 'merge' | 'relocate' | 'keep';
  potentialGain: number;
}

export interface Metrics {
  locationUtilization: number;
  inboundEfficiency: number;
  outboundEfficiency: number;
  avgTaskDuration: number;
  fragmentRate: number;
  timestamp: number;
  totalSKUs: number;
  activeTasks: number;
  completedTasksToday: number;
}

export interface AllocationRecommendation {
  locationId: string;
  score: number;
  reasons: string[];
  heatMatch: number;
  associationMatch: number;
  spaceEfficiency: number;
  pathCost: number;
}

export interface AssociationRule {
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
}

export interface DefragProgress {
  isRunning: boolean;
  currentStep: number;
  totalSteps: number;
  fragmentsProcessed: number;
  spaceRecovered: number;
  startTime: number;
}

export interface RealtimeUpdate {
  type: 'task' | 'stacker' | 'location' | 'metrics';
  id: string;
  data: any;
  timestamp: number;
}

export interface LiquidityAnalysis {
  overallScore: number;
  categoryRank: number;
  categoryTotal: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number;
  heatLevel: number;
  recommendations: string[];
}

export interface CategoryStats {
  category: string;
  totalSKUs: number;
  avgLiquidity: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}
