export interface EmissionFactor {
  id: string
  name: string
  category: string
  unit: string
  factor: number
  source: string
  lastUpdated: string
}

export interface ProductionLine {
  id: string
  name: string
  department: string
  energyType: string
  hourlyOutput: number
  emissionRate: number
  status: 'active' | 'inactive' | 'maintenance'
}

export interface SupplyChainNode {
  id: string
  name: string
  type: 'supplier' | 'manufacturer' | 'distributor' | 'retailer'
  tier: number
  location: string
  emissionIntensity: number
  parentId?: string
  children?: string[]
}

export interface CarbonRecord {
  id: string
  timestamp: string
  type: 'production' | 'supply' | 'transport' | 'energy'
  sourceId: string
  sourceName: string
  quantity: number
  unit: string
  emissions: number
  scope: 1 | 2 | 3
  department: string
  status: 'pending' | 'verified' | 'audited'
  syncStatus: 'local' | 'synced' | 'conflict'
}

export interface CarbonTarget {
  id: string
  name: string
  baselineYear: number
  targetYear: number
  baselineEmissions: number
  targetReduction: number
  currentProgress: number
  status: 'on-track' | 'at-risk' | 'off-track'
  scope: (1 | 2 | 3)[]
}

export interface LCACalculation {
  id: string
  productId: string
  productName: string
  timestamp: string
  status: 'pending' | 'calculating' | 'completed' | 'failed'
  stages: LCAStage[]
  totalEmissions: number
  breakdown: LCABreakdown
}

export interface LCAStage {
  name: string
  emissions: number
  percentage: number
  duration: number
}

export interface LCABreakdown {
  rawMaterials: number
  manufacturing: number
  transport: number
  use: number
  endOfLife: number
}

export interface SimulationResult {
  id: string
  name: string
  timestamp: string
  baseEmissions: number
  simulatedEmissions: number
  reductionPercentage: number
  parameters: SimulationParams
  scenario: string
}

export interface SimulationParams {
  energyEfficiency?: number
  renewableRatio?: number
  supplyChainOptimization?: number
  productionOptimization?: number
}
