import type { Valve, ValveStatus, Warning } from '../types';

export interface ValveTimingPoint {
  time: number;
  opening: number;
}

export interface ValveControlSequence {
  valveId: string;
  timingPoints: ValveTimingPoint[];
  repeat: boolean;
}

export interface EmergencyShutdownConfig {
  enabled: boolean;
  pressureThreshold: number;
  closingTime: number;
  targetOpening: number;
}

export function calculateValveFlowRate(
  valve: Valve,
  upstreamPressure: number,
  downstreamPressure: number,
  fluidDensity: number
): number {
  const deltaP = upstreamPressure - downstreamPressure;
  const sign = deltaP >= 0 ? 1 : -1;
  const Cv = valve.maxFlowRate * valve.opening;
  return Cv * Math.sqrt(Math.abs(deltaP) / fluidDensity) * sign;
}

export function getValveFlowCoefficient(
  type: Valve['type'],
  opening: number
): number {
  const normalizedOpening = Math.max(0, Math.min(1, opening));

  switch (type) {
    case 'gate':
      return 0.9 * Math.sin(normalizedOpening * Math.PI / 2);
    case 'ball':
      return 0.95 * normalizedOpening;
    case 'butterfly':
      return 0.85 * Math.sin(normalizedOpening * Math.PI / 2);
    case 'check':
      return normalizedOpening > 0.1 ? 0.9 : 0;
    default:
      return normalizedOpening;
  }
}

export function updateValveOpening(
  valve: Valve,
  timeStep: number
): { valve: Valve; warnings: Warning[] } {
  const warnings: Warning[] = [];
  const openingDiff = valve.targetOpening - valve.opening;
  const maxChange = (timeStep / valve.responseTime) * 1.0;

  let newOpening: number;
  let newStatus: ValveStatus = valve.status;

  if (Math.abs(openingDiff) < 0.001) {
    newOpening = valve.targetOpening;
    newStatus = valve.targetOpening <= 0.01 ? 'closed' : 'normal';
  } else {
    const change = Math.sign(openingDiff) * Math.min(Math.abs(openingDiff), maxChange);
    newOpening = valve.opening + change;
    newStatus = change > 0 ? 'opening' : 'closing';
  }

  return {
    valve: {
      ...valve,
      opening: newOpening,
      status: newStatus,
    },
    warnings,
  };
}

export function emergencyShutdown(
  valve: Valve,
  closingTime: number,
  timeStep: number
): { valve: Valve; triggered: boolean } {
  if (valve.opening <= 0.01) {
    return { valve, triggered: false };
  }

  const closingRate = timeStep / closingTime;
  const newOpening = Math.max(0, valve.opening - closingRate);

  return {
    valve: {
      ...valve,
      opening: newOpening,
      targetOpening: 0,
      status: 'closing',
    },
    triggered: true,
  };
}

export function checkAutoProtection(
  valve: Valve,
  pressure: number,
  config: EmergencyShutdownConfig,
  currentTime: number
): { valve: Valve; warnings: Warning[] } {
  const warnings: Warning[] = [];

  if (!valve.autoProtection || !config.enabled) {
    return { valve, warnings };
  }

  if (pressure > config.pressureThreshold) {
    warnings.push({
      id: `valve-protection-${valve.id}-${currentTime}`,
      type: 'overpressure',
      severity: 'high',
      nodeId: valve.nodeId,
      message: `阀门 ${valve.id} 触发超压自动保护`,
      timestamp: currentTime,
    });

    return {
      valve: {
        ...valve,
        targetOpening: config.targetOpening,
      },
      warnings,
    };
  }

  return { valve, warnings };
}

export function interpolateValveTiming(
  sequence: ValveControlSequence,
  currentTime: number
): number {
  const { timingPoints, repeat } = sequence;

  if (timingPoints.length === 0) return 0;

  let adjustedTime = currentTime;
  if (repeat && timingPoints.length > 1) {
    const cycleDuration = timingPoints[timingPoints.length - 1].time;
    adjustedTime = currentTime % cycleDuration;
  }

  for (let i = 0; i < timingPoints.length - 1; i++) {
    const t1 = timingPoints[i].time;
    const t2 = timingPoints[i + 1].time;

    if (adjustedTime >= t1 && adjustedTime <= t2) {
      const fraction = (adjustedTime - t1) / (t2 - t1);
      return timingPoints[i].opening + fraction * (timingPoints[i + 1].opening - timingPoints[i].opening);
    }
  }

  return timingPoints[timingPoints.length - 1].opening;
}

export function createRampSequence(
  valveId: string,
  initialOpening: number,
  finalOpening: number,
  duration: number,
  startTime: number = 0
): ValveControlSequence {
  return {
    valveId,
    timingPoints: [
      { time: startTime, opening: initialOpening },
      { time: startTime + duration, opening: finalOpening },
    ],
    repeat: false,
  };
}

export function createStepSequence(
  valveId: string,
  steps: { time: number; opening: number }[]
): ValveControlSequence {
  return {
    valveId,
    timingPoints: [...steps],
    repeat: false,
  };
}

export function calculateClosurePressureSurge(
  initialVelocity: number,
  waveSpeed: number,
  closureTime: number,
  pipeLength: number,
  fluidDensity: number
): { maxPressure: number; surgeType: 'fast' | 'slow' | 'medium' } {
  const criticalTime = (2 * pipeLength) / waveSpeed;
  const JoukowskyPressure = fluidDensity * waveSpeed * initialVelocity;

  let maxPressure: number;
  let surgeType: 'fast' | 'slow' | 'medium';

  if (closureTime <= criticalTime) {
    maxPressure = JoukowskyPressure;
    surgeType = 'fast';
  } else {
    maxPressure = JoukowskyPressure * (criticalTime / closureTime);
    surgeType = closureTime > 4 * criticalTime ? 'slow' : 'medium';
  }

  return { maxPressure, surgeType };
}

export function optimizeValveClosure(
  initialOpening: number,
  targetOpening: number,
  maxAllowedPressure: number,
  initialPressure: number,
  pipeLength: number,
  waveSpeed: number,
  initialVelocity: number,
  fluidDensity: number
): { duration: number; timingPoints: ValveTimingPoint[] } {
  const pressureMargin = maxAllowedPressure - initialPressure;
  const JoukowskyPressure = fluidDensity * waveSpeed * initialVelocity;

  const criticalTime = (2 * pipeLength) / waveSpeed;
  let requiredTime = criticalTime * (JoukowskyPressure / pressureMargin);

  requiredTime = Math.max(criticalTime, requiredTime);

  const numSteps = 5;
  const timingPoints: ValveTimingPoint[] = [];

  for (let i = 0; i <= numSteps; i++) {
    const fraction = i / numSteps;
    const opening = initialOpening - fraction * (initialOpening - targetOpening);
    const time = fraction * requiredTime;
    timingPoints.push({ time, opening });
  }

  return {
    duration: requiredTime,
    timingPoints,
  };
}
