import type { Cargo, CargoPlacement, CenterOfGravity, AircraftSpec, AlgorithmConfig } from '@/types';

export function calculateCargoVolume(cargo: Cargo): number {
  return cargo.dimensions.length * cargo.dimensions.width * cargo.dimensions.height;
}

export function getRotatedDimensions(
  dimensions: { length: number; width: number; height: number },
  rotation: number
): { length: number; width: number; height: number } {
  const rot = ((rotation % 360) + 360) % 360;
  if (rot === 0 || rot === 180) {
    return { ...dimensions };
  }
  return {
    length: dimensions.width,
    width: dimensions.length,
    height: dimensions.height
  };
}

export function calculateCenterOfGravity(
  placements: CargoPlacement[],
  cargos: Cargo[],
  emptyWeightCG: CenterOfGravity = { x: 50, y: 0, z: 50 },
  emptyWeight: number = 100000
): CenterOfGravity {
  let totalMomentX = emptyWeight * emptyWeightCG.x;
  let totalMomentY = emptyWeight * emptyWeightCG.y;
  let totalMomentZ = emptyWeight * emptyWeightCG.z;
  let totalWeight = emptyWeight;

  for (const placement of placements) {
    const cargo = cargos.find(c => c.id === placement.cargoId);
    if (!cargo) continue;

    const rotatedDims = getRotatedDimensions(cargo.dimensions, placement.rotation);
    const centerX = placement.position.x + rotatedDims.length / 2;
    const centerY = placement.position.y + rotatedDims.width / 2;
    const centerZ = placement.position.z + rotatedDims.height / 2;

    totalMomentX += cargo.weight * centerX;
    totalMomentY += cargo.weight * centerY;
    totalMomentZ += cargo.weight * centerZ;
    totalWeight += cargo.weight;
  }

  if (totalWeight === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: totalMomentX / totalWeight,
    y: totalMomentY / totalWeight,
    z: totalMomentZ / totalWeight
  };
}

export function calculateCgPercentage(cgX: number, aircraft: AircraftSpec): number {
  const cgFromLE = cgX - aircraft.mac.leadingEdge;
  return (cgFromLE / aircraft.mac.length) * 100;
}

export function isCgWithinLimits(cg: CenterOfGravity, aircraft: AircraftSpec): {
  isValid: boolean;
  message: string;
} {
  const cgPercent = calculateCgPercentage(cg.x, aircraft);
  
  if (cgPercent < aircraft.cgLimits.forward) {
    return {
      isValid: false,
      message: `重心过前: ${cgPercent.toFixed(1)}% MAC，限制: ${aircraft.cgLimits.forward}%`
    };
  }
  
  if (cgPercent > aircraft.cgLimits.aft) {
    return {
      isValid: false,
      message: `重心过后: ${cgPercent.toFixed(1)}% MAC，限制: ${aircraft.cgLimits.aft}%`
    };
  }
  
  if (Math.abs(cg.y) > aircraft.cgLimits.lateral) {
    return {
      isValid: false,
      message: `横向重心偏移过大: ${cg.y.toFixed(1)}cm，限制: ±${aircraft.cgLimits.lateral}cm`
    };
  }
  
  return { isValid: true, message: '重心在安全范围内' };
}

export function calculateSpaceUtilization(
  placements: CargoPlacement[],
  cargos: Cargo[],
  aircraft: AircraftSpec
): number {
  const cargoVolume = placements.reduce((sum, p) => {
    const cargo = cargos.find(c => c.id === p.cargoId);
    return sum + (cargo ? calculateCargoVolume(cargo) : 0);
  }, 0);
  
  const holdVolume = 
    aircraft.cargoHoldDimensions.length *
    aircraft.cargoHoldDimensions.width *
    aircraft.cargoHoldDimensions.height;
  
  return holdVolume > 0 ? cargoVolume / holdVolume : 0;
}

export function calculateScore(
  placements: CargoPlacement[],
  cargos: Cargo[],
  aircraft: AircraftSpec,
  config: AlgorithmConfig
): number {
  const cg = calculateCenterOfGravity(placements, cargos);
  const cgPercent = calculateCgPercentage(cg.x, aircraft);
  const cgScore = Math.abs(cgPercent - config.optimalCgX) * config.cgWeight;
  const balanceScore = Math.abs(cg.y) * config.balanceWeight;
  const utilization = calculateSpaceUtilization(placements, cargos, aircraft);
  const spaceScore = (1 - utilization) * config.spaceWeight;
  
  let priorityScore = 0;
  for (const placement of placements) {
    const cargo = cargos.find(c => c.id === placement.cargoId);
    if (cargo) {
      priorityScore += (11 - cargo.priority) * config.priorityWeight;
    }
  }
  
  return cgScore + balanceScore + spaceScore + priorityScore;
}

export function calculateFuelEfficiency(
  cgPercent: number,
  totalWeight: number,
  optimalCg: number = 35
): number {
  const cgPenalty = Math.abs(cgPercent - optimalCg) * 0.002;
  const weightPenalty = (totalWeight - 100000) * 0.000001;
  return Math.max(0, 1 - cgPenalty - Math.max(0, weightPenalty));
}

export function checkCollision(
  pos1: { x: number; y: number; z: number },
  dims1: { length: number; width: number; height: number },
  pos2: { x: number; y: number; z: number },
  dims2: { length: number; width: number; height: number }
): boolean {
  return !(
    pos1.x + dims1.length <= pos2.x ||
    pos1.x >= pos2.x + dims2.length ||
    pos1.y + dims1.width <= pos2.y ||
    pos1.y >= pos2.y + dims2.width ||
    pos1.z + dims1.height <= pos2.z ||
    pos1.z >= pos2.z + dims2.height
  );
}

export function isWithinBoundaries(
  pos: { x: number; y: number; z: number },
  dims: { length: number; width: number; height: number },
  boundaries: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
): boolean {
  return (
    pos.x >= boundaries.minX &&
    pos.x + dims.length <= boundaries.maxX &&
    pos.y >= boundaries.minY &&
    pos.y + dims.width <= boundaries.maxY &&
    pos.z >= boundaries.minZ &&
    pos.z + dims.height <= boundaries.maxZ
  );
}

export function generateId(): string {
  return crypto.randomUUID();
}
