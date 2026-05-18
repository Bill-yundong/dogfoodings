import type { PipelineSegment, MOCGrid } from '../types';

export interface WaveFront {
  id: string;
  segmentId: string;
  position: number;
  direction: 1 | -1;
  amplitude: number;
  speed: number;
  creationTime: number;
}

export interface WaveReflection {
  type: 'positive' | 'negative';
  coefficient: number;
  atNode: string;
  time: number;
}

export function calculateWaveSpeedFormula(
  fluidBulkModulus: number,
  fluidDensity: number,
  pipeDiameter: number,
  pipeThickness: number,
  youngsModulus: number,
  poissonsRatio: number = 0.3
): number {
  const K = fluidBulkModulus;
  const rho = fluidDensity;
  const D = pipeDiameter;
  const e = pipeThickness;
  const E = youngsModulus;
  const nu = poissonsRatio;
  const correction = 1 - nu * nu / 2;
  const a = Math.sqrt((K / rho) / (1 + correction * (K * D) / (E * e)));
  return a;
}

export function calculateReflectionCoefficient(
  impedanceA: number,
  impedanceB: number
): number {
  return (impedanceB - impedanceA) / (impedanceB + impedanceA);
}

export function calculateTransmissionCoefficient(
  impedanceA: number,
  impedanceB: number
): number {
  return (2 * impedanceB) / (impedanceB + impedanceA);
}

export function calculateCharacteristicImpedance(
  waveSpeed: number,
  crossSectionArea: number,
  fluidDensity: number,
  gravity: number
): number {
  return (fluidDensity * gravity * waveSpeed) / crossSectionArea;
}

export function trackWaveFronts(
  currentFronts: WaveFront[],
  segments: PipelineSegment[],
  timeStep: number,
  currentTime: number
): { updated: WaveFront[]; reflections: WaveReflection[] } {
  const reflections: WaveReflection[] = [];
  const updated: WaveFront[] = [];

  for (const front of currentFronts) {
    const segment = segments.find((s) => s.id === front.segmentId);
    if (!segment) continue;

    const newPosition = front.position + front.direction * front.speed * timeStep;

    if (newPosition >= segment.length) {
      reflections.push({
        type: front.direction === 1 ? 'positive' : 'negative',
        coefficient: -0.8,
        atNode: segment.toNodeId,
        time: currentTime,
      });
      updated.push({
        ...front,
        position: segment.length,
        direction: -1,
      });
    } else if (newPosition <= 0) {
      reflections.push({
        type: front.direction === 1 ? 'positive' : 'negative',
        coefficient: 0.9,
        atNode: segment.fromNodeId,
        time: currentTime,
      });
      updated.push({
        ...front,
        position: 0,
        direction: 1,
      });
    } else {
      updated.push({
        ...front,
        position: newPosition,
      });
    }
  }

  return { updated, reflections };
}

export function generatePressureWave(
  grid: MOCGrid,
  segment: PipelineSegment,
  amplitude: number,
  origin: number = 0
): number[] {
  const nx = grid.nx;
  const pressure: number[] = new Array(nx).fill(0);
  const sigma = nx / 10;

  for (let i = 0; i < nx; i++) {
    const x = i - origin;
    pressure[i] = amplitude * Math.exp(-(x * x) / (2 * sigma * sigma));
  }

  return pressure;
}

export function interpolatePressure(
  grid: MOCGrid,
  position: number
): number {
  const dx = grid.dx;
  const idx = Math.floor(position / dx);
  const fraction = (position % dx) / dx;

  if (idx < 0) return grid.points[0][0].H;
  if (idx >= grid.nx - 1) return grid.points[0][grid.nx - 1].H;

  const H1 = grid.points[0][idx].H;
  const H2 = grid.points[0][idx + 1].H;

  return H1 + fraction * (H2 - H1);
}

export function calculatePressureGradient(
  pressureProfile: number[],
  dx: number
): number[] {
  const gradient: number[] = new Array(pressureProfile.length).fill(0);

  for (let i = 1; i < pressureProfile.length - 1; i++) {
    gradient[i] = (pressureProfile[i + 1] - pressureProfile[i - 1]) / (2 * dx);
  }

  gradient[0] = (pressureProfile[1] - pressureProfile[0]) / dx;
  gradient[pressureProfile.length - 1] =
    (pressureProfile[pressureProfile.length - 1] - pressureProfile[pressureProfile.length - 2]) / dx;

  return gradient;
}

export function detectWaveFronts(
  pressureProfile: number[],
  threshold: number = 0.1
): number[] {
  const frontPositions: number[] = [];
  const gradient = calculatePressureGradient(pressureProfile, 1);

  for (let i = 0; i < gradient.length; i++) {
    if (Math.abs(gradient[i]) > threshold) {
      if (frontPositions.length === 0 || i - frontPositions[frontPositions.length - 1] > 5) {
        frontPositions.push(i);
      }
    }
  }

  return frontPositions;
}

export function estimateArrivalTime(
  distance: number,
  waveSpeed: number,
  currentTime: number
): number {
  return currentTime + distance / waveSpeed;
}

export function calculateMaxPressureReached(
  initialPressure: number,
  waveAmplitude: number,
  reflectionCoefficients: number[]
): number {
  let maxPressure = initialPressure;
  let currentAmplitude = waveAmplitude;

  for (const coeff of reflectionCoefficients) {
    currentAmplitude *= Math.abs(coeff);
    maxPressure = Math.max(maxPressure, initialPressure + currentAmplitude);
    maxPressure = Math.max(maxPressure, initialPressure - currentAmplitude);
  }

  return maxPressure;
}

export interface WaveEnergy {
  kinetic: number;
  potential: number;
  total: number;
}

export function calculateWaveEnergy(
  pressureProfile: number[],
  velocityProfile: number[],
  segment: PipelineSegment,
  fluidDensity: number
): WaveEnergy {
  const A = Math.PI * segment.diameter * segment.diameter / 4;
  let kinetic = 0;
  let potential = 0;

  for (let i = 0; i < pressureProfile.length; i++) {
    const v = velocityProfile[i] || 0;
    const p = pressureProfile[i];
    kinetic += 0.5 * fluidDensity * v * v * A * segment.length / pressureProfile.length;
    potential += p * p / (2 * fluidDensity * 1000) * A * segment.length / pressureProfile.length;
  }

  return {
    kinetic,
    potential,
    total: kinetic + potential,
  };
}
