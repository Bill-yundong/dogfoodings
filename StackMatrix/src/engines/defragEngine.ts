import { Location, Fragment, Task } from '../types';

export interface DefragConfig {
  minFragmentSize: number;
  maxFragmentSize: number;
  wasteThreshold: number;
  maxTasksPerRun: number;
}

const DEFAULT_CONFIG: DefragConfig = {
  minFragmentSize: 2,
  maxFragmentSize: 10,
  wasteThreshold: 50,
  maxTasksPerRun: 20
};

export interface DefragResult {
  fragments: Fragment[];
  totalWasteScore: number;
  potentialSpaceGain: number;
  tasks: Task[];
}

export class DefragEngine {
  private config: DefragConfig;

  constructor(config?: Partial<DefragConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public detectFragments(locations: Location[]): Fragment[] {
    const fragments: Fragment[] = [];
    const sortedLocations = [...locations].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      if (a.col !== b.col) return a.col - b.col;
      return a.level - b.level;
    });

    const byRowCol = new Map<string, Location[]>();
    for (const loc of sortedLocations) {
      const key = `${loc.row}-${loc.col}`;
      if (!byRowCol.has(key)) {
        byRowCol.set(key, []);
      }
      byRowCol.get(key)!.push(loc);
    }

    let fragmentId = 0;
    for (const [, column] of byRowCol) {
      const sortedByLevel = column.sort((a, b) => a.level - b.level);
      
      let currentFragment: Location[] = [];
      
      for (let i = 0; i < sortedByLevel.length; i++) {
        const loc = sortedByLevel[i];
        
        if (loc.status === 'empty') {
          currentFragment.push(loc);
        } else {
          if (currentFragment.length >= this.config.minFragmentSize && 
              currentFragment.length <= this.config.maxFragmentSize) {
            const wasteScore = this.calculateWasteScore(currentFragment);
            if (wasteScore >= this.config.wasteThreshold) {
              fragments.push({
                id: `FRG-${String(fragmentId++).padStart(4, '0')}`,
                locationIds: currentFragment.map(l => l.id),
                size: currentFragment.length,
                wasteScore,
                recommendation: this.getRecommendation(currentFragment, locations),
                potentialGain: this.calculatePotentialGain(currentFragment)
              });
            }
          }
          currentFragment = [];
        }
      }
      
      if (currentFragment.length >= this.config.minFragmentSize && 
          currentFragment.length <= this.config.maxFragmentSize) {
        const wasteScore = this.calculateWasteScore(currentFragment);
        if (wasteScore >= this.config.wasteThreshold) {
          fragments.push({
            id: `FRG-${String(fragmentId++).padStart(4, '0')}`,
            locationIds: currentFragment.map(l => l.id),
            size: currentFragment.length,
            wasteScore,
            recommendation: this.getRecommendation(currentFragment, locations),
            potentialGain: this.calculatePotentialGain(currentFragment)
          });
        }
      }
    }

    return fragments.sort((a, b) => b.wasteScore - a.wasteScore);
  }

  private calculateWasteScore(fragment: Location[]): number {
    if (fragment.length === 0) return 0;

    const avgHeatLevel = fragment.reduce((sum, loc) => sum + loc.heatLevel, 0) / fragment.length;
    const standardSize = 4;
    const sizeScore = Math.abs(fragment.length - standardSize) / standardSize * 50;
    const heatScore = (5 - avgHeatLevel) * 10;
    const neighborOccupied = this.countNeighborOccupied(fragment);
    const isolationScore = (1 - neighborOccupied / 8) * 30;

    return Math.min(100, sizeScore + heatScore + isolationScore);
  }

  private countNeighborOccupied(fragment: Location[]): number {
    if (fragment.length === 0) return 0;

    let count = 0;
    const fragmentIds = new Set(fragment.map(l => l.id));
    const sampleLoc = fragment[0];

    const neighbors = [
      { row: sampleLoc.row - 1, col: sampleLoc.col, level: sampleLoc.level },
      { row: sampleLoc.row + 1, col: sampleLoc.col, level: sampleLoc.level },
      { row: sampleLoc.row, col: sampleLoc.col - 1, level: sampleLoc.level },
      { row: sampleLoc.row, col: sampleLoc.col + 1, level: sampleLoc.level },
    ];

    for (const n of neighbors) {
      const neighborId = `LOC-${n.row}-${n.col}-${n.level}`;
      if (fragmentIds.has(neighborId)) {
        count++;
      }
    }

    return count;
  }

  private getRecommendation(fragment: Location[], allLocations: Location[]): 'merge' | 'relocate' | 'keep' {
    const wasteScore = this.calculateWasteScore(fragment);
    const occupiedNearby = this.countOccupiedNearby(fragment, allLocations);

    if (wasteScore > 80 && occupiedNearby > 3) {
      return 'merge';
    } else if (wasteScore > 60) {
      return 'relocate';
    }
    return 'keep';
  }

  private countOccupiedNearby(fragment: Location[], allLocations: Location[]): number {
    if (fragment.length === 0) return 0;

    const sampleLoc = fragment[0];
    let count = 0;

    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        for (let dl = -1; dl <= 1; dl++) {
          if (dr === 0 && dc === 0 && dl === 0) continue;
          const loc = allLocations.find(
            l => l.row === sampleLoc.row + dr && 
                 l.col === sampleLoc.col + dc && 
                 l.level === sampleLoc.level + dl
          );
          if (loc && loc.status === 'occupied') {
            count++;
          }
        }
      }
    }

    return count;
  }

  private calculatePotentialGain(fragment: Location[]): number {
    return fragment.length * (0.5 + Math.random() * 0.5);
  }

  public generateDefragTasks(
    fragments: Fragment[],
    locations: Location[],
    skus: Map<string, { id: string; name: string }>
  ): Task[] {
    const tasks: Task[] = [];
    const actionableFragments = fragments.filter(f => f.recommendation !== 'keep');
    const now = Date.now();

    for (const fragment of actionableFragments.slice(0, this.config.maxTasksPerRun)) {
      if (fragment.recommendation === 'merge') {
        const mergeTasks = this.generateMergeTasks(fragment, locations, skus, now);
        tasks.push(...mergeTasks);
      } else if (fragment.recommendation === 'relocate') {
        const relocateTask = this.generateRelocateTask(fragment, locations, skus, now);
        if (relocateTask) {
          tasks.push(relocateTask);
        }
      }
    }

    return tasks;
  }

  private generateMergeTasks(
    fragment: Fragment,
    locations: Location[],
    skus: Map<string, { id: string; name: string }>,
    now: number
  ): Task[] {
    const tasks: Task[] = [];
    const occupiedInFragment = locations.filter(
      l => fragment.locationIds.includes(l.id) && l.status === 'occupied' && l.skuId
    );

    const targetLocation = this.findBestMergeTarget(fragment, locations);
    if (!targetLocation) return tasks;

    for (let i = 0; i < occupiedInFragment.length; i++) {
      const loc = occupiedInFragment[i];
      const sku = loc.skuId ? skus.get(loc.skuId) : undefined;
      if (!sku) continue;

      tasks.push({
        id: `TSK-DEF-${String(i).padStart(6, '0')}`,
        type: 'defrag',
        skuId: sku.id,
        skuName: sku.name,
        fromLocation: loc.id,
        toLocation: targetLocation.id,
        status: 'pending',
        priority: 1,
        createdAt: now + i * 1000,
        progress: 0
      });
    }

    return tasks;
  }

  private findBestMergeTarget(fragment: Fragment, locations: Location[]): Location | undefined {
    const emptyLocations = locations.filter(l => l.status === 'empty');
    const fragmentLocations = locations.filter(l => fragment.locationIds.includes(l.id));
    
    if (fragmentLocations.length === 0) return undefined;

    const centerRow = fragmentLocations.reduce((sum, l) => sum + l.row, 0) / fragmentLocations.length;
    const centerCol = fragmentLocations.reduce((sum, l) => sum + l.col, 0) / fragmentLocations.length;

    let bestLocation: Location | undefined;
    let bestScore = Infinity;

    for (const loc of emptyLocations) {
      const distance = Math.sqrt(
        Math.pow(loc.row - centerRow, 2) + 
        Math.pow(loc.col - centerCol, 2)
      );
      const score = distance + loc.level * 0.5;
      
      if (score < bestScore) {
        bestScore = score;
        bestLocation = loc;
      }
    }

    return bestLocation;
  }

  private generateRelocateTask(
    fragment: Fragment,
    locations: Location[],
    skus: Map<string, { id: string; name: string }>,
    now: number
  ): Task | undefined {
    const fragmentLocations = locations.filter(l => fragment.locationIds.includes(l.id));
    const occupied = fragmentLocations.find(l => l.status === 'occupied' && l.skuId);
    
    if (!occupied || !occupied.skuId) return undefined;

    const sku = skus.get(occupied.skuId);
    if (!sku) return undefined;

    const targetLocation = locations.find(l => l.status === 'empty' && l.heatLevel >= 3);
    if (!targetLocation) return undefined;

    return {
      id: `TSK-DEF-${String(Math.random()).padStart(6, '0')}`,
      type: 'defrag',
      skuId: sku.id,
      skuName: sku.name,
      fromLocation: occupied.id,
      toLocation: targetLocation.id,
      status: 'pending',
      priority: 1,
      createdAt: now,
      progress: 0
    };
  }

  public calculateFragmentRate(locations: Location[]): number {
    const fragments = this.detectFragments(locations);
    const fragmentedLocations = new Set(fragments.flatMap(f => f.locationIds));
    const emptyLocations = locations.filter(l => l.status === 'empty');
    
    if (emptyLocations.length === 0) return 0;
    
    return fragmentedLocations.size / emptyLocations.length;
  }

  public executeDefragStep(
    fragments: Fragment[],
    locations: Location[],
    currentIndex: number
  ): { updatedLocations: Location[]; newIndex: number } {
    if (currentIndex >= fragments.length) {
      return { updatedLocations: locations, newIndex: currentIndex };
    }

    const fragment = fragments[currentIndex];
    const updatedLocations = [...locations];

    if (fragment.recommendation === 'merge') {
      const fragmentLocIndices = fragment.locationIds.map(
        id => updatedLocations.findIndex(l => l.id === id)
      ).filter(i => i >= 0);

      if (fragmentLocIndices.length > 1) {
        const targetIdx = fragmentLocIndices[0];
        for (let i = 1; i < fragmentLocIndices.length; i++) {
          const sourceIdx = fragmentLocIndices[i];
          if (updatedLocations[sourceIdx].skuId) {
            updatedLocations[targetIdx] = {
              ...updatedLocations[targetIdx],
              status: 'occupied',
              skuId: updatedLocations[sourceIdx].skuId,
              usedCapacity: updatedLocations[targetIdx].usedCapacity + updatedLocations[sourceIdx].usedCapacity
            };
            updatedLocations[sourceIdx] = {
              ...updatedLocations[sourceIdx],
              status: 'empty',
              skuId: undefined,
              usedCapacity: 0
            };
          }
        }
      }
    }

    return { updatedLocations, newIndex: currentIndex + 1 };
  }
}

export const defragEngine = new DefragEngine();
