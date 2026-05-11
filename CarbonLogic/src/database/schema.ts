export const DB_NAME = 'CarbonLogicDB'
export const DB_VERSION = 1

export interface DBSchema {
  emissionFactors: {
    key: string
    value: {
      id: string
      name: string
      category: string
      unit: string
      factor: number
      source: string
      lastUpdated: string
    }
    indexes: { 'by-category': string }
  }
  productionLines: {
    key: string
    value: {
      id: string
      name: string
      department: string
      energyType: string
      hourlyOutput: number
      emissionRate: number
      status: 'active' | 'inactive' | 'maintenance'
    }
    indexes: { 'by-department': string }
  }
  supplyChainNodes: {
    key: string
    value: {
      id: string
      name: string
      type: 'supplier' | 'manufacturer' | 'distributor' | 'retailer'
      tier: number
      location: string
      emissionIntensity: number
      parentId?: string
      children?: string[]
      lastSynced: string
    }
    indexes: { 'by-tier': number; 'by-parent': string }
  }
  carbonRecords: {
    key: string
    value: {
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
      createdAt: string
      updatedAt: string
    }
    indexes: { 'by-timestamp': string; 'by-scope': number; 'by-sync': string }
  }
  carbonTargets: {
    key: string
    value: {
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
    indexes: { 'by-year': number }
  }
  lcaCalculations: {
    key: string
    value: {
      id: string
      productId: string
      productName: string
      timestamp: string
      status: 'pending' | 'calculating' | 'completed' | 'failed'
      stages: Array<{
        name: string
        emissions: number
        percentage: number
        duration: number
      }>
      totalEmissions: number
      breakdown: {
        rawMaterials: number
        manufacturing: number
        transport: number
        use: number
        endOfLife: number
      }
    }
    indexes: { 'by-product': string; 'by-timestamp': string }
  }
  simulationResults: {
    key: string
    value: {
      id: string
      name: string
      timestamp: string
      baseEmissions: number
      simulatedEmissions: number
      reductionPercentage: number
      parameters: {
        energyEfficiency?: number
        renewableRatio?: number
        supplyChainOptimization?: number
        productionOptimization?: number
      }
      scenario: string
    }
    indexes: { 'by-timestamp': string }
  }
  syncQueue: {
    key: string
    value: {
      id: string
      recordId: string
      recordType: string
      operation: 'create' | 'update' | 'delete'
      timestamp: string
      retryCount: number
      status: 'pending' | 'processing' | 'failed'
    }
    indexes: { 'by-status': string; 'by-timestamp': string }
  }
}
