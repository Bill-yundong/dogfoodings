import type { Location, SKU, AllocationResult, AssociationResult } from '@/types';

export interface AllocationConfig {
  strategy: 'liquidity' | 'association' | 'space' | 'balanced';
  weights: {
    liquidity: number;
    association: number;
    space: number;
    distance: number;
  };
  entrancePosition: { aisle: number; rack: number };
}

const defaultConfig: AllocationConfig = {
  strategy: 'balanced',
  weights: {
    liquidity: 0.3,
    association: 0.25,
    space: 0.25,
    distance: 0.2,
  },
  entrancePosition: { aisle: 1, rack: 1 },
};

export function calculateDistance(
  loc: Location,
  entrance: { aisle: number; rack: number }
): number {
  const aisleDist = Math.abs(loc.aisle - entrance.aisle);
  const rackDist = Math.abs(loc.rack - entrance.rack);
  const levelWeight = loc.level * 0.5;
  return aisleDist * 2 + rackDist + levelWeight;
}

export function calculateSpaceUtilization(
  loc: Location,
  sku: SKU,
  quantity: number
): number {
  const skuVolume = sku.dimensions.length * sku.dimensions.width * sku.dimensions.height;
  const totalRequiredVolume = skuVolume * quantity;
  const availableCapacity = loc.capacity - loc.usedCapacity;
  return Math.min(1, totalRequiredVolume / availableCapacity);
}

export function findAssociationScore(
  skuId: string,
  location: Location,
  associations: AssociationResult[],
  skuMap: Map<string, SKU>
): number {
  if (!location.skuId) return 0;

  const locationSku = skuMap.get(location.skuId);
  if (!locationSku) return 0;

  const association = associations.find(
    (a) =>
      (a.skuId1 === skuId && a.skuId2 === location.skuId) ||
      (a.skuId2 === skuId && a.skuId1 === location.skuId)
  );

  return association ? association.confidence : 0;
}

export function scoreLocation(
  location: Location,
  sku: SKU,
  quantity: number,
  config: AllocationConfig,
  associations: AssociationResult[],
  skuMap: Map<string, SKU>
): { score: number; details: AllocationResult } {
  const distance = calculateDistance(location, config.entrancePosition);
  const maxDistance = 50;
  const distanceScore = Math.max(0, 1 - distance / maxDistance);

  const liquidityMatch =
    Math.abs(sku.liquidityScore - location.heatLevel) / 100;
  const liquidityScore = 1 - liquidityMatch;

  const spaceUtilization = calculateSpaceUtilization(location, sku, quantity);
  const spaceScore = spaceUtilization > 0.9 ? spaceUtilization : spaceUtilization * 0.8;

  const associationScore = findAssociationScore(
    sku.id,
    location,
    associations,
    skuMap
  );

  let finalScore = 0;
  switch (config.strategy) {
    case 'liquidity':
      finalScore =
        liquidityScore * 0.5 +
        distanceScore * 0.3 +
        spaceScore * 0.15 +
        associationScore * 0.05;
      break;
    case 'association':
      finalScore =
        associationScore * 0.5 +
        liquidityScore * 0.2 +
        distanceScore * 0.15 +
        spaceScore * 0.15;
      break;
    case 'space':
      finalScore =
        spaceScore * 0.5 +
        distanceScore * 0.2 +
        liquidityScore * 0.2 +
        associationScore * 0.1;
      break;
    case 'balanced':
    default:
      finalScore =
        liquidityScore * config.weights.liquidity +
        associationScore * config.weights.association +
        spaceScore * config.weights.space +
        distanceScore * config.weights.distance;
      break;
  }

  let reason = '';
  if (liquidityScore > 0.8) reason += '流动性匹配度高; ';
  if (associationScore > 0.6) reason += '关联SKU邻近; ';
  if (spaceScore > 0.85) reason += '空间利用率优; ';
  if (distanceScore > 0.7) reason += '距离出入口近; ';
  if (!reason) reason = '综合评分最优';

  return {
    score: finalScore,
    details: {
      skuId: sku.id,
      locationId: location.id,
      score: finalScore,
      reason: reason.trim(),
      distanceToEntrance: distance,
      associationMatch: associationScore > 0.3,
      spaceUtilization,
    },
  };
}

export function allocateLocation(
  sku: SKU,
  quantity: number,
  locations: Location[],
  associations: AssociationResult[],
  skuMap: Map<string, SKU>,
  customConfig?: Partial<AllocationConfig>
): AllocationResult | null {
  const config: AllocationConfig = { ...defaultConfig, ...customConfig };

  const skuVolume =
    sku.dimensions.length * sku.dimensions.width * sku.dimensions.height;
  const requiredCapacity = skuVolume * quantity;

  const availableLocations = locations.filter(
    (loc) =>
      loc.status === 'empty' &&
      loc.capacity - loc.usedCapacity >= requiredCapacity
  );

  if (availableLocations.length === 0) {
    return null;
  }

  const scoredLocations = availableLocations.map((loc) =>
    scoreLocation(loc, sku, quantity, config, associations, skuMap)
  );

  scoredLocations.sort((a, b) => b.score - a.score);

  return scoredLocations[0]?.details || null;
}

export function batchAllocate(
  tasks: Array<{ sku: SKU; quantity: number; priority?: string }>,
  locations: Location[],
  associations: AssociationResult[],
  skuMap: Map<string, SKU>,
  customConfig?: Partial<AllocationConfig>
): Array<{ taskIndex: number; result: AllocationResult | null }> {
  const sortedTasks = [...tasks].map((t, i) => ({ ...t, originalIndex: i }));
  sortedTasks.sort((a, b) => {
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
    const aPriority = priorityOrder[a.priority || 'normal'] ?? 2;
    const bPriority = priorityOrder[b.priority || 'normal'] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.sku.liquidityScore - a.sku.liquidityScore;
  });

  const usedLocations = new Set<string>();
  const results: Array<{ taskIndex: number; result: AllocationResult | null }> = [];

  for (const task of sortedTasks) {
    const availableLocs = locations.filter(
      (loc) => !usedLocations.has(loc.id) && loc.status === 'empty'
    );

    const result = allocateLocation(
      task.sku,
      task.quantity,
      availableLocs,
      associations,
      skuMap,
      customConfig
    );

    if (result) {
      usedLocations.add(result.locationId);
    }

    results.push({ taskIndex: task.originalIndex, result });
  }

  return results.sort((a, b) => a.taskIndex - b.taskIndex);
}
