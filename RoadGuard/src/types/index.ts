export interface Coordinate {
  x: number;
  y: number;
  timestamp: number;
}

export interface CrackPoint {
  id: string;
  coordinate: Coordinate;
  width: number;
  length: number;
  depth: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectionDate: string;
  roadSection: string;
}

export interface MaintenanceRecord {
  id: string;
  crackId: string;
  actionType: 'inspection' | 'repair' | 'replacement' | 'monitoring';
  description: string;
  cost: number;
  materials: string[];
  personnel: string[];
  executionDate: string;
  nextInspectionDate: string;
}

export interface FinancialRecord {
  id: string;
  referenceId: string;
  category: 'material_cost' | 'labor_cost' | 'equipment_cost' | 'maintenance_fee' | 'inspection_fee';
  amount: number;
  currency: string;
  budgetCode: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'completed';
  transactionDate: string;
  vendor?: string;
  invoiceNumber?: string;
  remarks?: string;
}

export interface SemanticMappingRule {
  id: string;
  maintenanceField: string;
  financialField: string;
  transformation: 'direct' | 'scale' | 'categorize' | 'aggregate' | 'custom';
  scaleFactor?: number;
  categoryMap?: Record<string, string>;
  customFormula?: string;
  bidirectional: boolean;
}

export interface Snapshot {
  id: string;
  roadSection: string;
  captureDate: string;
  year: number;
  imageData: string;
  imageType: 'thermal' | 'visual' | '3d_scan' | 'radar';
  resolution: {
    width: number;
    height: number;
  };
  metadata: {
    weather?: string;
    temperature?: number;
    humidity?: number;
    equipment?: string;
    operator?: string;
  };
  associatedCracks: string[];
  annotations: Annotation[];
}

export interface Annotation {
  id: string;
  type: 'crack' | 'pothole' | 'rutting' | 'deformation';
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  notes?: string;
}

export interface InterpolationResult {
  id: string;
  crackId: string;
  targetDate: string;
  predictedPoints: Coordinate[];
  predictedWidth: number;
  predictedLength: number;
  confidence: number;
  method: string;
  parameters: Record<string, number>;
  generatedAt: string;
}

export interface TrendSimulation {
  id: string;
  crackId: string;
  startDate: string;
  endDate: string;
  steps: InterpolationResult[];
  status: 'running' | 'completed' | 'error';
  progress: number;
  createdAt: string;
  simulationType: 'trend' | 'single';
  method: string;
}

export interface DashboardStats {
  totalCracks: number;
  criticalCracks: number;
  maintenanceCost: number;
  snapshotsCount: number;
  trendPredictions: number;
  pendingApprovals: number;
}

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444'
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  low: '轻微',
  medium: '中等',
  high: '严重',
  critical: '危急'
};