import type { Location, FragmentationInfo, DefragTask, StackerTask } from '@/types';

export interface FragmentationConfig {
  minFragmentSize: number;
  maxDefragMovesPerTask: number;
  severityThresholds: {
    low: number;
    medium: number;
    high: number;
  };
}

const defaultConfig: FragmentationConfig = {
  minFragmentSize: 1,
  maxDefragMovesPerTask: 50,
  severityThresholds: {
    low: 0.1,
    medium: 0.3,
    high: 0.5,
  },
};

export interface AisleStats {
  aisle: number;
  totalLocations: number;
  emptyLocations: number;
  occupiedLocations: number;
  fragments: FragmentationInfo[];
  fragmentationIndex: number;
  wastedCapacity: number;
}

export function analyzeAisleFragmentation(
  locations: Location[],
  aisle: number,
  config: FragmentationConfig = defaultConfig
): AisleStats {
  const aisleLocations = locations.filter((loc) => loc.aisle === aisle);
  const totalLocations = aisleLocations.length;
  const emptyLocations = aisleLocations.filter(
    (loc) => loc.status === 'empty'
  );
  const occupiedLocations = aisleLocations.filter(
    (loc) => loc.status === 'occupied'
  );

  const fragments: FragmentationInfo[] = [];
  const sortedByRack = [...aisleLocations].sort((a, b) => {
    if (a.rack !== b.rack) return a.rack - b.rack;
    if (a.level !== b.level) return a.level - b.level;
    return a.slot - b.slot;
  });

  let currentFragment: Location[] = [];
  for (let i = 0; i < sortedByRack.length; i++) {
    const loc = sortedByRack[i];
    if (loc.status === 'empty') {
      currentFragment.push(loc);
    } else {
      if (currentFragment.length >= config.minFragmentSize) {
        const isIsolated =
          (i === 0 || sortedByRack[i - 1].status === 'occupied') &&
          (i === sortedByRack.length - 1 ||
            sortedByRack[i + 1].status === 'occupied');

        const fragmentType: 'single' | 'cluster' | 'aisle' =
          currentFragment.length === 1
            ? 'single'
            : currentFragment.length <= 5
            ? 'cluster'
            : 'aisle';

        const totalWasted = currentFragment.reduce(
          (sum, l) => sum + (l.capacity - l.usedCapacity),
          0
        );

        fragments.push({
          id: `frag-${aisle}-${fragments.length}`,
          locationId: currentFragment[0].id,
          locationInfo: currentFragment[0],
          fragmentType,
          severity:
            totalWasted > 500
              ? 'high'
              : totalWasted > 200
              ? 'medium'
              : 'low',
          wastedCapacity: totalWasted,
          recommendedAction:
            isIsolated && fragmentType === 'single'
              ? 'reallocate'
              : fragmentType === 'aisle'
              ? 'defrag'
              : 'consolidate',
          detectedAt: new Date(),
        });
      }
      currentFragment = [];
    }
  }

  if (currentFragment.length >= config.minFragmentSize) {
    const totalWasted = currentFragment.reduce(
      (sum, l) => sum + (l.capacity - l.usedCapacity),
      0
    );
    fragments.push({
      id: `frag-${aisle}-${fragments.length}`,
      locationId: currentFragment[0].id,
      locationInfo: currentFragment[0],
      fragmentType: currentFragment.length === 1 ? 'single' : 'cluster',
      severity: totalWasted > 500 ? 'high' : totalWasted > 200 ? 'medium' : 'low',
      wastedCapacity: totalWasted,
      recommendedAction: 'consolidate',
      detectedAt: new Date(),
    });
  }

  const totalEmptyCapacity = emptyLocations.reduce(
    (sum, loc) => sum + (loc.capacity - loc.usedCapacity),
    0
  );
  const wastedCapacity = fragments.reduce(
    (sum, f) => sum + f.wastedCapacity,
    0
  );
  const fragmentationIndex =
    totalEmptyCapacity > 0 ? wastedCapacity / totalEmptyCapacity : 0;

  return {
    aisle,
    totalLocations,
    emptyLocations: emptyLocations.length,
    occupiedLocations: occupiedLocations.length,
    fragments,
    fragmentationIndex,
    wastedCapacity,
  };
}

export function analyzeWarehouseFragmentation(
  locations: Location[],
  config: FragmentationConfig = defaultConfig
): {
  aisles: AisleStats[];
  overallFragmentationIndex: number;
  totalFragments: number;
  totalWastedCapacity: number;
  highPriorityFragments: FragmentationInfo[];
} {
  const aisles = new Set(locations.map((l) => l.aisle));
  const aisleStats: AisleStats[] = [];

  for (const aisle of aisles) {
    aisleStats.push(analyzeAisleFragmentation(locations, aisle, config));
  }

  const allFragments = aisleStats.flatMap((a) => a.fragments);
  const totalWastedCapacity = aisleStats.reduce(
    (sum, a) => sum + a.wastedCapacity,
    0
  );
  const totalEmptyCapacity = locations
    .filter((l) => l.status === 'empty')
    .reduce((sum, l) => sum + (l.capacity - l.usedCapacity), 0);

  const overallFragmentationIndex =
    totalEmptyCapacity > 0 ? totalWastedCapacity / totalEmptyCapacity : 0;

  const highPriorityFragments = allFragments
    .filter((f) => f.severity === 'high')
    .sort((a, b) => b.wastedCapacity - a.wastedCapacity);

  return {
    aisles: aisleStats,
    overallFragmentationIndex,
    totalFragments: allFragments.length,
    totalWastedCapacity,
    highPriorityFragments,
  };
}

export function generateDefragPlan(
  fragments: FragmentationInfo[],
  locations: Location[],
  stackerCount: number,
  config: FragmentationConfig = defaultConfig
): DefragTask[] {
  const sortedFragments = [...fragments].sort((a, b) => {
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.wastedCapacity - a.wastedCapacity;
  });

  const tasks: DefragTask[] = [];
  let currentTaskFragments: FragmentationInfo[] = [];
  let moveCount = 0;

  for (const fragment of sortedFragments) {
    if (moveCount >= config.maxDefragMovesPerTask) {
      tasks.push(createDefragTask(currentTaskFragments, stackerCount));
      currentTaskFragments = [];
      moveCount = 0;
    }
    currentTaskFragments.push(fragment);
    moveCount += estimateMovesForFragment(fragment);
  }

  if (currentTaskFragments.length > 0) {
    tasks.push(createDefragTask(currentTaskFragments, stackerCount));
  }

  return tasks;
}

function estimateMovesForFragment(fragment: FragmentationInfo): number {
  switch (fragment.fragmentType) {
    case 'single':
      return 1;
    case 'cluster':
      return 3;
    case 'aisle':
      return 5;
    default:
      return 2;
  }
}

function createDefragTask(
  fragments: FragmentationInfo[],
  stackerCount: number
): DefragTask {
  const totalMoves = fragments.reduce(
    (sum, f) => sum + estimateMovesForFragment(f),
    0
  );
  const totalSaved = fragments.reduce((sum, f) => sum + f.wastedCapacity, 0);

  const stackerIds: string[] = [];
  for (let i = 0; i < Math.min(stackerCount, 3); i++) {
    stackerIds.push(`STK-${String(i + 1).padStart(3, '0')}`);
  }

  return {
    id: `DEFRAG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'pending',
    fragmentIds: fragments.map((f) => f.id),
    totalMoves,
    completedMoves: 0,
    estimatedDuration: totalMoves * 30000,
    stackerIds,
    spaceSaved: totalSaved,
  };
}

export function generateStackerTasksForDefrag(
  defragTask: DefragTask,
  fragments: FragmentationInfo[],
  locations: Location[]
): StackerTask[] {
  const tasks: StackerTask[] = [];
  const targetFragments = fragments.filter((f) =>
    defragTask.fragmentIds.includes(f.id)
  );

  for (const fragment of targetFragments) {
    const occupiedNearby = locations.filter(
      (loc) =>
        loc.status === 'occupied' &&
        fragment.locationInfo &&
        loc.aisle === fragment.locationInfo.aisle &&
        Math.abs(loc.rack - fragment.locationInfo.rack) <= 2
    );

    const emptyTargets = locations
      .filter(
        (loc) =>
          loc.status === 'empty' &&
          fragment.locationInfo &&
          loc.aisle === fragment.locationInfo.aisle
      )
      .slice(0, 3);

    for (let i = 0; i < Math.min(occupiedNearby.length, emptyTargets.length); i++) {
      tasks.push({
        id: `TASK-${Date.now()}-${i}`,
        type: 'defrag',
        status: 'pending',
        fromLocation: occupiedNearby[i].id,
        toLocation: emptyTargets[i].id,
        skuId: occupiedNearby[i].skuId,
        priority: 'low',
        createdAt: new Date(),
        estimatedDuration: 30000,
      });
    }
  }

  return tasks;
}
