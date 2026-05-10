import { FlowDecayParams } from '../types';
import { PIPE_MATERIAL_FRICTION, WATER_VISCOSITY } from '../constants';

interface SimulationResult {
  pressure: number;
  flowRate: number;
  velocity: number;
  headLoss: number;
  reynoldsNumber: number;
  frictionFactor: number;
}

export const calculateReynoldsNumber = (
  velocity: number,
  diameter: number,
  viscosity: number = WATER_VISCOSITY
): number => {
  return (velocity * diameter) / viscosity;
};

export const calculateDarcyWeisbachFrictionFactor = (
  reynoldsNumber: number,
  relativeRoughness: number
): number => {
  if (reynoldsNumber < 2000) {
    return 64 / reynoldsNumber;
  }

  let f = 0.02;
  for (let i = 0; i < 10; i++) {
    const left = 1 / Math.sqrt(f);
    const right =
      -2 *
      Math.log10(
        relativeRoughness / 3.7 + 2.51 / (reynoldsNumber * Math.sqrt(f))
      );
    const error = Math.abs(left - right);
    if (error < 0.0001) break;
    f = f - (left - right) / (1 / (2 * f * Math.sqrt(f)));
  }
  return f;
};

export const calculateHeadLoss = (
  frictionFactor: number,
  length: number,
  diameter: number,
  velocity: number
): number => {
  const g = 9.81;
  return (frictionFactor * length * velocity * velocity) / (2 * g * diameter);
};

export const calculatePressureFromHead = (head: number): number => {
  const rho = 1000;
  const g = 9.81;
  return (rho * g * head) / 1000000;
};

export const calculateVelocityFromFlow = (
  flowRate: number,
  diameter: number
): number => {
  const area = Math.PI * Math.pow(diameter / 2, 2);
  return flowRate / area;
};

export const calculateFlowDecay = (
  params: FlowDecayParams
): SimulationResult => {
  const { initialFlow, distance, pipeDiameter, frictionCoefficient, viscosity } =
    params;

  const velocity = calculateVelocityFromFlow(initialFlow, pipeDiameter);
  const reynoldsNumber = calculateReynoldsNumber(
    velocity,
    pipeDiameter,
    viscosity
  );

  const relativeRoughness = 0.001 / pipeDiameter;
  const frictionFactor = calculateDarcyWeisbachFrictionFactor(
    reynoldsNumber,
    relativeRoughness
  );

  const headLoss = calculateHeadLoss(
    frictionFactor,
    distance,
    pipeDiameter,
    velocity
  );

  const efficiency = Math.exp(-0.0001 * distance / pipeDiameter);
  const decayedFlow = initialFlow * efficiency;
  const decayedVelocity = calculateVelocityFromFlow(decayedFlow, pipeDiameter);

  const pressureLoss = calculatePressureFromHead(headLoss);
  const basePressure = 0.5;
  const remainingPressure = Math.max(0, basePressure - pressureLoss);

  return {
    pressure: remainingPressure,
    flowRate: decayedFlow,
    velocity: decayedVelocity,
    headLoss,
    reynoldsNumber,
    frictionFactor,
  };
};

export const simulatePressureDistribution = async (
  sourcePressures: Map<string, number>,
  connections: Map<string, string[]>,
  distances: Map<string, number>,
  pipeDiameter: number,
  frictionCoefficient: number
): Promise<Map<string, number>> => {
  const results = new Map<string, number>(sourcePressures);
  const visited = new Set<string>(sourcePressures.keys());
  const queue: string[] = [...sourcePressures.keys()];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const connectedNodes = connections.get(current) || [];

    for (const neighbor of connectedNodes) {
      if (visited.has(neighbor)) continue;

      const distance = distances.get(neighbor) || 500;
      const currentPressure = results.get(current) || 0;

      const decay = calculateFlowDecay({
        initialFlow: 0.1,
        distance,
        pipeDiameter,
        frictionCoefficient,
        viscosity: WATER_VISCOSITY,
        time: Date.now(),
      });

      const pressureRatio = decay.pressure / 0.5;
      const estimatedPressure = currentPressure * pressureRatio;

      results.set(neighbor, Math.max(0.05, estimatedPressure));
      visited.add(neighbor);
      queue.push(neighbor);

      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }

  return results;
};

export const simulateTimeBasedDecay = (
  initialPressure: number,
  timeSeconds: number,
  flowRate: number
): number => {
  const decayConstant = 0.0001;
  const timeFactor = Math.exp(-decayConstant * timeSeconds * flowRate);
  return initialPressure * timeFactor;
};

export const calculatePressureGradient = (
  points: { position: { lng: number; lat: number }; pressure: number }[]
): number[][] => {
  const n = points.length;
  const gradient: number[][] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = points[j].position.lng - points[i].position.lng;
      const dy = points[j].position.lat - points[i].position.lat;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const dp = points[j].pressure - points[i].pressure;
        gradient.push([dp / distance, dp / distance]);
      }
    }
  }

  return gradient;
};

export const interpolatePressure = (
  x: number,
  y: number,
  knownPoints: { x: number; y: number; pressure: number }[]
): number => {
  let numerator = 0;
  let denominator = 0;
  const power = 2;

  for (const point of knownPoints) {
    const distance = Math.sqrt(
      Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
    );

    if (distance < 0.001) {
      return point.pressure;
    }

    const weight = 1 / Math.pow(distance, power);
    numerator += weight * point.pressure;
    denominator += weight;
  }

  return denominator > 0 ? numerator / denominator : 0;
};
