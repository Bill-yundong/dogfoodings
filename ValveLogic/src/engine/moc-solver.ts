import type {
  MOCConfig,
  MOCGrid,
  MOCPoint,
  PipelineSegment,
  PipelineNode,
  Valve,
  Warning,
  MATERIAL_PROPERTIES,
} from '../types';
import { MATERIAL_PROPERTIES as MAT_PROPS } from '../types';

export function calculateWaveSpeed(
  segment: PipelineSegment,
  fluidBulkModulus: number = 2.2e9,
  fluidDensity: number = 850
): number {
  const { diameter, wallThickness, material } = segment;
  const E = MAT_PROPS[material].youngsModulus;
  const K = fluidBulkModulus;
  const rho = fluidDensity;
  const D = diameter;
  const e = wallThickness;
  const a = Math.sqrt((K / rho) / (1 + (K * D) / (E * e)));
  return Math.round(a);
}

export function createMOCGrid(
  segment: PipelineSegment,
  waveSpeed: number,
  timeStep: number
): MOCGrid {
  const dx = waveSpeed * timeStep;
  const nx = Math.floor(segment.length / dx) + 1;
  const actualDx = segment.length / (nx - 1);

  const points: MOCPoint[][] = [];
  for (let t = 0; t < 2; t++) {
    points[t] = [];
    for (let i = 0; i < nx; i++) {
      points[t][i] = {
        x: i * actualDx,
        Q: 0,
        H: 0,
        Cp: 0,
        Cm: 0,
      };
    }
  }

  return {
    points,
    segmentId: segment.id,
    nx,
    dx: actualDx,
  };
}

export function initializeSteadyState(
  grid: MOCGrid,
  upstreamHead: number,
  downstreamHead: number,
  flowRate: number
): void {
  const nx = grid.nx;
  const points = grid.points;

  for (let i = 0; i < nx; i++) {
    const fraction = i / (nx - 1);
    const H = upstreamHead - fraction * (upstreamHead - downstreamHead);

    for (let t = 0; t < 2; t++) {
      points[t][i].Q = flowRate;
      points[t][i].H = H;
    }
  }
}

export function computeCharacteristicCoefficients(
  grid: MOCGrid,
  config: MOCConfig,
  segment: PipelineSegment
): void {
  const { gravity: g, fluidDensity: rho } = config;
  const { diameter: D, roughness, waveSpeed: a } = segment;
  const A = Math.PI * D * D / 4;
  const points = grid.points[0];
  const nx = grid.nx;

  for (let i = 1; i < nx - 1; i++) {
    const Q = points[i].Q;
    const V = Q / A;
    const f = computeDarcyWeisbachFriction(D, V, rho, config.fluidViscosity, roughness);
    const signQ = Q >= 0 ? 1 : -1;

    const B = a / (g * A);
    const R = (f * Q * Math.abs(Q)) / (2 * g * D * A * A);

    points[i].Cp = points[i].H + B * points[i].Q + config.timeStep * R;
    points[i].Cm = points[i].H - B * points[i].Q - config.timeStep * R;
  }
}

function computeDarcyWeisbachFriction(
  D: number,
  V: number,
  rho: number,
  mu: number,
  roughness: number
): number {
  if (Math.abs(V) < 0.001) return 0.02;

  const Re = (rho * V * D) / mu;

  if (Re < 2000) {
    return 64 / Re;
  }

  const relRough = roughness / D;
  let f = 0.02;

  for (let iter = 0; iter < 10; iter++) {
    const sqrtF = Math.sqrt(f);
    const rhs = -2 * Math.log10(relRough / 3.7 + 2.51 / (Re * sqrtF));
    const newF = 1 / (rhs * rhs);
    if (Math.abs(newF - f) < 1e-6) break;
    f = newF;
  }

  return f;
}

export function solveInteriorPoints(
  grid: MOCGrid,
  config: MOCConfig,
  segment: PipelineSegment
): void {
  const { gravity: g } = config;
  const { diameter: D, waveSpeed: a } = segment;
  const A = Math.PI * D * D / 4;
  const B = a / (g * A);

  const curr = grid.points[0];
  const next = grid.points[1];
  const nx = grid.nx;

  for (let i = 1; i < nx - 1; i++) {
    const Cp = curr[i - 1].Cp;
    const Cm = curr[i + 1].Cm;

    next[i].H = 0.5 * (Cp + Cm);
    next[i].Q = (Cp - Cm) / (2 * B);
  }
}

export function solveUpstreamReservoir(
  grid: MOCGrid,
  config: MOCConfig,
  segment: PipelineSegment,
  reservoirHead: number
): void {
  const { gravity: g } = config;
  const { diameter: D, waveSpeed: a } = segment;
  const A = Math.PI * D * D / 4;
  const B = a / (g * A);

  const next = grid.points[1];
  const curr = grid.points[0];

  next[0].H = reservoirHead;
  next[0].Q = (curr[0].Cp - reservoirHead) / B;
}

export function solveDownstreamValve(
  grid: MOCGrid,
  config: MOCConfig,
  segment: PipelineSegment,
  valveOpening: number,
  maxFlowRate: number
): { pressure: number; flowRate: number } {
  const { gravity: g } = config;
  const { diameter: D, waveSpeed: a } = segment;
  const A = Math.PI * D * D / 4;
  const B = a / (g * A);

  const next = grid.points[1];
  const curr = grid.points[0];
  const nx = grid.nx;

  const Cm = curr[nx - 2].Cm;
  const effectiveOpening = Math.max(0.01, valveOpening);
  const Cv = maxFlowRate * effectiveOpening;
  const Qv = Cv * Math.sqrt(Math.abs(Cm));
  const Q = Qv * (Cm >= 0 ? 1 : -1);

  next[nx - 1].Q = Q;
  next[nx - 1].H = Cm + B * Q;

  return {
    pressure: next[nx - 1].H * g * config.fluidDensity,
    flowRate: Q,
  };
}

export function solveJunction(
  grids: MOCGrid[],
  incomingIndices: number[],
  outgoingIndices: number[],
  config: MOCConfig
): number {
  const { gravity: g } = config;
  let numerator = 0;
  let denominator = 0;

  for (let k = 0; k < grids.length; k++) {
    const grid = grids[k];
    const D = 1.0;
    const A = Math.PI * D * D / 4;
    const B = 1000 / (g * A);

    if (incomingIndices.includes(k)) {
      const curr = grid.points[0];
      const nx = grid.nx;
      const Cp = curr[nx - 2].Cp;
      numerator += Cp / B;
      denominator += 1 / B;
    } else if (outgoingIndices.includes(k)) {
      const curr = grid.points[0];
      const Cm = curr[1].Cm;
      numerator += Cm / B;
      denominator += 1 / B;
    }
  }

  const HJ = numerator / denominator;

  for (let k = 0; k < grids.length; k++) {
    const grid = grids[k];
    const D = 1.0;
    const A = Math.PI * D * D / 4;
    const B = 1000 / (g * A);
    const next = grid.points[1];

    if (incomingIndices.includes(k)) {
      const nx = grid.nx;
      const curr = grid.points[0];
      const Cp = curr[nx - 2].Cp;
      next[nx - 1].H = HJ;
      next[nx - 1].Q = (Cp - HJ) / B;
    } else if (outgoingIndices.includes(k)) {
      const curr = grid.points[0];
      const Cm = curr[1].Cm;
      next[0].H = HJ;
      next[0].Q = (HJ - Cm) / B;
    }
  }

  return HJ;
}

export function advanceTimeStep(grid: MOCGrid): void {
  const curr = grid.points[0];
  const next = grid.points[1];

  for (let i = 0; i < grid.nx; i++) {
    curr[i].Q = next[i].Q;
    curr[i].H = next[i].H;
  }
}

export function extractPressureProfile(grid: MOCGrid): number[] {
  return grid.points[0].map((p) => p.H);
}

export function checkPressureWarnings(
  pressure: number,
  config: MOCConfig,
  nodeId: string,
  timestamp: number
): Warning[] {
  const warnings: Warning[] = [];

  if (pressure > config.pressureMax) {
    warnings.push({
      id: `overpressure-${nodeId}-${timestamp}`,
      type: 'overpressure',
      severity: pressure > config.pressureMax * 1.2 ? 'critical' : 'high',
      nodeId,
      message: `节点 ${nodeId} 超压: ${pressure.toFixed(1)} Pa`,
      timestamp,
    });
  }

  if (pressure < config.pressureMin) {
    warnings.push({
      id: `underpressure-${nodeId}-${timestamp}`,
      type: 'underpressure',
      severity: pressure < 0 ? 'critical' : 'medium',
      nodeId,
      message: `节点 ${nodeId} 负压: ${pressure.toFixed(1)} Pa`,
      timestamp,
    });
  }

  if (pressure < -1000) {
    warnings.push({
      id: `cavitation-${nodeId}-${timestamp}`,
      type: 'cavitation',
      severity: 'critical',
      nodeId,
      message: `节点 ${nodeId} 发生气蚀风险`,
      timestamp,
    });
  }

  return warnings;
}

export function simulateWaterHammer(
  grids: MOCGrid[],
  segments: PipelineSegment[],
  config: MOCConfig,
  valves: Valve[],
  duration: number,
  onProgress?: (time: number, pressures: Record<string, number[]>) => void
): {
  pressures: Record<string, number[]>;
  warnings: Warning[];
  timeSeries: number[];
} {
  const timeSeries: number[] = [];
  const pressures: Record<string, number[]> = {};
  const allWarnings: Warning[] = [];

  segments.forEach((s) => {
    pressures[s.id] = [];
  });

  const steps = Math.floor(duration / config.timeStep);

  for (let step = 0; step < steps; step++) {
    const time = step * config.timeStep;
    timeSeries.push(time);

    grids.forEach((grid, idx) => {
      const segment = segments[idx];
      computeCharacteristicCoefficients(grid, config, segment);
    });

    grids.forEach((grid, idx) => {
      const segment = segments[idx];
      solveInteriorPoints(grid, config, segment);
    });

    grids.forEach((grid, idx) => {
      const segment = segments[idx];
      solveUpstreamReservoir(grid, config, segment, 100);

      const valve = valves.find((v) => v.nodeId === segment.toNodeId);
      if (valve) {
        const { pressure } = solveDownstreamValve(
          grid,
          config,
          segment,
          valve.opening,
          valve.maxFlowRate
        );

        const warnings = checkPressureWarnings(
          pressure,
          config,
          segment.toNodeId,
          time
        );
        allWarnings.push(...warnings);
      }
    });

    grids.forEach((grid) => advanceTimeStep(grid));

    if (step % 10 === 0) {
      grids.forEach((grid, idx) => {
        const profile = extractPressureProfile(grid);
        pressures[segments[idx].id] = [...profile];
      });

      if (onProgress) {
        onProgress(time, pressures);
      }
    }
  }

  return { pressures, warnings: allWarnings, timeSeries };
}
