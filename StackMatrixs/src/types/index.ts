export interface Location {
  id: string;
  aisle: number;
  rack: number;
  level: number;
  slot: number;
  status: 'empty' | 'occupied' | 'reserved' | 'maintenance';
  capacity: number;
  usedCapacity: number;
  heatLevel: number;
  skuId?: string;
  lastUpdated: Date;
}

export interface SKU {
  id: string;
  name: string;
  category: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight: number;
  turnoverRate: number;
  lastInbound: Date;
  lastOutbound: Date;
  liquidityScore: number;
  totalStock: number;
  unit: string;
}

export interface StackerTask {
  id: string;
  type: 'inbound' | 'outbound' | 'transfer' | 'defrag';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  fromLocation?: string;
  toLocation?: string;
  skuId?: string;
  quantity?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number;
}

export interface Stacker {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'fault' | 'maintenance';
  currentTask?: string;
  currentPosition: {
    aisle: number;
    rack: number;
    level: number;
  };
  taskQueue: StackerTask[];
  efficiency: number;
  totalTasks: number;
  completedTasks: number;
  faultCount: number;
  lastMaintenance: Date;
  uptime: number;
}

export interface InboundTask {
  id: string;
  skuId: string;
  skuName?: string;
  quantity: number;
  status: 'pending' | 'allocating' | 'allocated' | 'executing' | 'completed' | 'failed';
  allocatedLocation?: string;
  stackerId?: string;
  priority: 'normal' | 'high' | 'urgent';
  strategy: 'liquidity' | 'association' | 'space' | 'balanced';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTime?: number;
  notes?: string;
}

export interface FragmentationInfo {
  id: string;
  locationId: string;
  locationInfo?: Location;
  fragmentType: 'single' | 'cluster' | 'aisle';
  severity: 'low' | 'medium' | 'high';
  wastedCapacity: number;
  recommendedAction: 'consolidate' | 'reallocate' | 'defrag';
  detectedAt: Date;
}

export interface DefragTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'paused' | 'failed';
  fragmentIds: string[];
  totalMoves: number;
  completedMoves: number;
  estimatedDuration: number;
  startedAt?: Date;
  completedAt?: Date;
  stackerIds: string[];
  spaceSaved: number;
}

export interface AssociationResult {
  skuId1: string;
  skuId2: string;
  confidence: number;
  support: number;
  lift: number;
  orderCount: number;
}

export interface AllocationResult {
  skuId: string;
  locationId: string;
  score: number;
  reason: string;
  distanceToEntrance: number;
  associationMatch: boolean;
  spaceUtilization: number;
}

export interface EfficiencyMetric {
  timestamp: Date;
  metricType: 'throughput' | 'utilization' | 'efficiency' | 'fragmentation';
  value: number;
  aisle?: number;
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  message: string;
  source: 'wms' | 'stacker' | 'allocation' | 'defrag';
  timestamp: Date;
  read: boolean;
  relatedId?: string;
}

export interface WarehouseStats {
  totalLocations: number;
  occupiedLocations: number;
  emptyLocations: number;
  reservedLocations: number;
  maintenanceLocations: number;
  totalCapacity: number;
  usedCapacity: number;
  utilizationRate: number;
  fragmentationIndex: number;
  totalSKUs: number;
  activeSKUs: number;
  pendingInboundTasks: number;
  pendingOutboundTasks: number;
  avgStackerEfficiency: number;
  todayThroughput: number;
}

export type HeatmapColor = 'cold' | 'cool' | 'moderate' | 'warm' | 'hot';

export interface SkuSnapshot {
  id: string;
  skuId: string;
  snapshotDate: Date;
  liquidityScore: number;
  turnoverRate: number;
  stockLevel: number;
  inboundCount: number;
  outboundCount: number;
}

export interface OrderHistoryItem {
  orderId: string;
  skuIds: string[];
  timestamp: Date;
}
