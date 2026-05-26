import type { 
  Cargo, 
  CargoPlacement, 
  LoadPlan, 
  AircraftSpec, 
  AlgorithmConfig, 
  AlgorithmProgress,
  WorkerMessage 
} from '@/types';
import { 
  calculateCenterOfGravity, 
  calculateScore, 
  calculateSpaceUtilization, 
  calculateFuelEfficiency,
  getRotatedDimensions,
  checkCollision,
  isWithinBoundaries,
  generateId
} from '@/utils/calculations';

interface SearchState {
  placements: CargoPlacement[];
  remainingCargos: string[];
  score: number;
  depth: number;
}

class PriorityQueue<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  enqueue(item: T): void {
    this.items.push(item);
    this.items.sort(this.compare);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  get size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}

let isRunning = false;
let isPaused = false;
let shouldStop = false;
let cargos: Cargo[] = [];
let aircraft: AircraftSpec | null = null;
let config: AlgorithmConfig = {
  maxIterations: 10000,
  timeLimitMs: 30000,
  optimalCgX: 30,
  cgWeight: 100,
  balanceWeight: 50,
  spaceWeight: 200,
  priorityWeight: 10
};
let bestSolution: LoadPlan | null = null;
let bestScore = Infinity;
let solutionsEvaluated = 0;
let startTime = 0;

function getZoneForPosition(x: number): string {
  if (!aircraft) return 'B';
  for (const zone of aircraft.cargoZones) {
    if (x >= zone.boundaries.minX && x < zone.boundaries.maxX) {
      return zone.code;
    }
  }
  return aircraft.cargoZones[aircraft.cargoZones.length - 1].code;
}

function generateCandidatePositions(cargo: Cargo, existingPlacements: CargoPlacement[]): Array<{ x: number; y: number; z: number; rotation: number; zone: string }> {
  const positions: Array<{ x: number; y: number; z: number; rotation: number; zone: string }> = [];
  if (!aircraft) return positions;

  const rotations = cargo.isDangerous ? [0] : [0, 90];
  const gridStep = 20;

  const forbiddenZones = cargo.constraints?.forbiddenZones || [];
  const preferredZone = cargo.constraints?.preferredZone;

  for (const rotation of rotations) {
    const dims = getRotatedDimensions(cargo.dimensions, rotation);
    
    for (let x = 0; x <= aircraft.cargoHoldDimensions.length - dims.length; x += gridStep) {
      for (let y = -aircraft.cargoHoldDimensions.width / 2 + dims.width / 2; 
           y <= aircraft.cargoHoldDimensions.width / 2 - dims.width / 2; 
           y += gridStep) {
        
        let z = 0;
        let canPlace = true;
        let maxStack = cargo.constraints?.maxStacking || 3;
        let currentStackLevel = 0;

        for (const existing of existingPlacements) {
          const existingCargo = cargos.find(c => c.id === existing.cargoId);
          if (!existingCargo) continue;
          
          const existingDims = getRotatedDimensions(existingCargo.dimensions, existing.rotation);
          
          if (checkCollision(
            { x, y: y - dims.width / 2, z },
            dims,
            existing.position,
            existingDims
          )) {
            z = Math.max(z, existing.position.z + existingDims.height + 2);
            currentStackLevel++;
            
            if (currentStackLevel >= maxStack) {
              canPlace = false;
              break;
            }
          }
        }

        if (!canPlace) continue;
        if (z + dims.height > aircraft.cargoHoldDimensions.height) continue;

        const zone = getZoneForPosition(x + dims.length / 2);
        
        if (forbiddenZones.includes(zone)) continue;

        const posDims = { length: dims.length, width: dims.width, height: dims.height };
        const boundaries = {
          minX: 0,
          maxX: aircraft.cargoHoldDimensions.length,
          minY: -aircraft.cargoHoldDimensions.width / 2,
          maxY: aircraft.cargoHoldDimensions.width / 2,
          minZ: 0,
          maxZ: aircraft.cargoHoldDimensions.height
        };

        if (!isWithinBoundaries({ x, y: y - dims.width / 2, z }, posDims, boundaries)) continue;

        let score = 0;
        if (preferredZone && zone === preferredZone) score -= 50;
        if (cargo.priority > 7) {
          if (zone === 'A') score -= 30;
        }

        positions.push({ x, y: y - dims.width / 2, z, rotation, zone });
      }
    }
  }

  return positions.sort(() => Math.random() - 0.5).slice(0, 20);
}

function calculateLowerBound(state: SearchState): number {
  if (state.remainingCargos.length === 0) return state.score;
  
  const remainingWeight = state.remainingCargos.reduce((sum, id) => {
    const cargo = cargos.find(c => c.id === id);
    return sum + (cargo?.weight || 0);
  }, 0);
  
  return state.score - remainingWeight * 0.01;
}

function createLoadPlan(placements: CargoPlacement[]): LoadPlan {
  const cg = calculateCenterOfGravity(placements, cargos);
  const totalWeight = placements.reduce((sum, p) => {
    const cargo = cargos.find(c => c.id === p.cargoId);
    return sum + (cargo?.weight || 0);
  }, 0) + (aircraft?.operatingEmptyWeight || 100000);
  
  const cgPercent = aircraft ? (cg.x - aircraft.mac.leadingEdge) / aircraft.mac.length * 100 : 30;
  
  return {
    id: generateId(),
    flightNumber: 'CA' + Math.floor(Math.random() * 9000 + 1000),
    aircraftType: aircraft?.type || 'B777F',
    timestamp: Date.now(),
    cargoPlacements: placements,
    centerOfGravity: cg,
    totalWeight,
    spaceUtilization: aircraft ? calculateSpaceUtilization(placements, cargos, aircraft) : 0,
    fuelEfficiency: calculateFuelEfficiency(cgPercent, totalWeight),
    score: aircraft ? calculateScore(placements, cargos, aircraft, config) : 0,
    status: 'draft'
  };
}

function sendProgress(): void {
  const progress: AlgorithmProgress = {
    currentIteration: solutionsEvaluated,
    bestScore,
    solutionsEvaluated,
    currentDepth: 0,
    status: isRunning ? (isPaused ? 'paused' : 'running') : 'completed',
    elapsedMs: Date.now() - startTime,
    bestSolution: bestSolution || undefined
  };
  self.postMessage({ type: 'progress', payload: progress } as WorkerMessage);
}

async function runAlgorithm(): Promise<void> {
  if (!aircraft) return;

  isRunning = true;
  isPaused = false;
  shouldStop = false;
  startTime = Date.now();
  solutionsEvaluated = 0;
  bestScore = Infinity;
  bestSolution = null;

  const sortedCargos = [...cargos].sort((a, b) => b.weight * b.priority - a.weight * a.priority);
  const cargoIds = sortedCargos.map(c => c.id);

  const queue = new PriorityQueue<SearchState>((a, b) => a.score - b.score);
  
  queue.enqueue({
    placements: [],
    remainingCargos: cargoIds,
    score: 0,
    depth: 0
  });

  while (queue.size > 0 && !shouldStop && solutionsEvaluated < config.maxIterations) {
    while (isPaused && !shouldStop) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (shouldStop) break;

    if (Date.now() - startTime > config.timeLimitMs) {
      break;
    }

    const current = queue.dequeue();
    if (!current) break;

    if (current.remainingCargos.length === 0) {
      const plan = createLoadPlan(current.placements);
      if (plan.score < bestScore) {
        bestScore = plan.score;
        bestSolution = plan;
        sendProgress();
      }
      solutionsEvaluated++;
      continue;
    }

    if (calculateLowerBound(current) >= bestScore) {
      continue;
    }

    const cargoId = current.remainingCargos[0];
    const cargo = cargos.find(c => c.id === cargoId);
    if (!cargo) continue;

    const candidates = generateCandidatePositions(cargo, current.placements);
    
    for (const candidate of candidates) {
      const placement: CargoPlacement = {
        cargoId,
        position: { x: candidate.x, y: candidate.y, z: candidate.z },
        rotation: candidate.rotation,
        zone: candidate.zone
      };

      const newPlacements = [...current.placements, placement];
      const newScore = calculateScore(newPlacements, cargos, aircraft, config);

      queue.enqueue({
        placements: newPlacements,
        remainingCargos: current.remainingCargos.slice(1),
        score: newScore,
        depth: current.depth + 1
      });
    }

    solutionsEvaluated++;
    
    if (solutionsEvaluated % 100 === 0) {
      sendProgress();
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  isRunning = false;
  sendProgress();
  self.postMessage({ type: 'result', payload: bestSolution } as WorkerMessage);
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'config':
      if (payload) {
        const data = payload as { cargos?: Cargo[]; aircraft?: AircraftSpec; settings?: Partial<AlgorithmConfig> };
        if (data.cargos) cargos = data.cargos;
        if (data.aircraft) aircraft = data.aircraft;
        if (data.settings) config = { ...config, ...data.settings };
      }
      break;

    case 'start':
      if (!isRunning) {
        runAlgorithm();
      }
      break;

    case 'pause':
      isPaused = true;
      break;

    case 'resume':
      isPaused = false;
      break;

    case 'stop':
      shouldStop = true;
      isPaused = false;
      break;
  }
};
