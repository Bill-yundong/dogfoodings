import { Location, SKU, AllocationRecommendation } from '../types';

export interface AllocationConfig {
  heatWeight: number;
  associationWeight: number;
  spaceWeight: number;
  pathWeight: number;
  topN: number;
}

const DEFAULT_CONFIG: AllocationConfig = {
  heatWeight: 0.4,
  associationWeight: 0.3,
  spaceWeight: 0.2,
  pathWeight: 0.1,
  topN: 5
};

export class AllocationEngine {
  private config: AllocationConfig;

  constructor(config?: Partial<AllocationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public allocate(
    sku: SKU,
    locations: Location[],
    allSKUs: SKU[],
    stackerPosition: { row: number; col: number } = { row: 1, col: 1 }
  ): AllocationRecommendation[] {
    const emptyLocations = locations.filter(l => l.status === 'empty');
    const associatedSKUsMap = new Map(allSKUs.map(s => [s.id, s]));

    const scoredLocations = emptyLocations.map(location => {
      const heatMatch = this.calculateHeatMatch(sku, location);
      const associationMatch = this.calculateAssociationMatch(sku, location, locations, associatedSKUsMap);
      const spaceEfficiency = this.calculateSpaceEfficiency(location);
      const pathCost = this.calculatePathCost(location, stackerPosition);

      const totalScore =
        heatMatch * this.config.heatWeight +
        associationMatch * this.config.associationWeight +
        spaceEfficiency * this.config.spaceWeight +
        (1 - pathCost) * this.config.pathWeight;

      const reasons: string[] = [];
      if (heatMatch > 0.8) reasons.push('热度匹配度高');
      if (associationMatch > 0.6) reasons.push('邻近关联SKU');
      if (spaceEfficiency > 0.7) reasons.push('空间利用率优');
      if (pathCost < 0.3) reasons.push('堆垛机路径短');

      return {
        locationId: location.id,
        score: totalScore,
        reasons,
        heatMatch,
        associationMatch,
        spaceEfficiency,
        pathCost
      };
    });

    return scoredLocations
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.topN);
  }

  private calculateHeatMatch(sku: SKU, location: Location): number {
    const heatDiff = Math.abs(sku.heatLevel - location.heatLevel);
    return Math.max(0, 1 - heatDiff / 5);
  }

  private calculateAssociationMatch(
    sku: SKU,
    location: Location,
    allLocations: Location[],
    skuMap: Map<string, SKU>
  ): number {
    if (sku.associatedSKUs.length === 0) return 0.5;

    const occupiedLocations = allLocations.filter(l => l.status === 'occupied' && l.skuId);
    
    let totalDistance = 0;
    let matchCount = 0;

    for (const assocSKUId of sku.associatedSKUs) {
      const assocLocation = occupiedLocations.find(l => l.skuId === assocSKUId);
      if (assocLocation) {
        const distance = this.calculateDistance(location, assocLocation);
        const maxDistance = 20;
        totalDistance += Math.max(0, 1 - distance / maxDistance);
        matchCount++;
      }
    }

    return matchCount > 0 ? totalDistance / matchCount : 0.3;
  }

  private calculateDistance(loc1: Location, loc2: Location): number {
    return Math.sqrt(
      Math.pow(loc1.row - loc2.row, 2) +
      Math.pow(loc1.col - loc2.col, 2) +
      Math.pow(loc1.level - loc2.level, 2)
    );
  }

  private calculateSpaceEfficiency(location: Location): number {
    const freeCapacity = location.capacity - location.usedCapacity;
    return freeCapacity / location.capacity;
  }

  private calculatePathCost(
    location: Location,
    stackerPosition: { row: number; col: number }
  ): number {
    const horizontalDist = Math.abs(location.row - stackerPosition.row) + 
                           Math.abs(location.col - stackerPosition.col);
    const verticalDist = location.level;
    const totalDist = horizontalDist + verticalDist * 0.5;
    const maxDist = 30 + 5 * 0.5;
    return Math.min(1, totalDist / maxDist);
  }

  public batchAllocate(
    skus: SKU[],
    locations: Location[],
    allSKUs: SKU[]
  ): Map<string, AllocationRecommendation[]> {
    const results = new Map<string, AllocationRecommendation[]>();
    const availableLocations = [...locations];

    for (const sku of skus) {
      const recommendations = this.allocate(sku, availableLocations, allSKUs);
      results.set(sku.id, recommendations);
      
      if (recommendations.length > 0) {
        const bestLocation = availableLocations.find(
          l => l.id === recommendations[0].locationId
        );
        if (bestLocation) {
          const idx = availableLocations.indexOf(bestLocation);
          availableLocations.splice(idx, 1);
        }
      }
    }

    return results;
  }
}

export const allocationEngine = new AllocationEngine();
