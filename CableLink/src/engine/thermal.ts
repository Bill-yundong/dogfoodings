import type { CableParameters, TemperaturePoint, ThermalFieldData } from '@/types';

const SPECIFIC_HEAT = 880;
const DENSITY = 8960;
const THERMAL_CONDUCTIVITY = 401;

export function calculateJouleHeating(current: number, resistance: number): number {
  return current * current * resistance;
}

export function calculateSkinEffect(current: number, frequency: number, conductorRadius: number): number {
  const skinDepth = Math.sqrt(2 * THERMAL_CONDUCTIVITY / (2 * Math.PI * frequency * 4e-7 * Math.PI));
  const effectiveRadius = Math.min(conductorRadius, skinDepth);
  const areaRatio = (effectiveRadius * effectiveRadius) / (conductorRadius * conductorRadius);
  return current / Math.sqrt(areaRatio);
}

export function calculateHeatTransfer(
  coreTemp: number,
  ambientTemp: number,
  thermalResistance: number,
  area: number
): number {
  return (coreTemp - ambientTemp) / (thermalResistance / area);
}

export function solveHeatEquationFD(
  initialTemps: number[],
  heatSources: number[],
  ambientTemp: number,
  thermalResistance: number,
  timeStep: number,
  spatialStep: number,
  iterations: number
): number[] {
  const n = initialTemps.length;
  let temps = [...initialTemps];
  const alpha = THERMAL_CONDUCTIVITY / (SPECIFIC_HEAT * DENSITY);
  const stabilityFactor = alpha * timeStep / (spatialStep * spatialStep);

  if (stabilityFactor > 0.5) {
    console.warn('Time step too large for numerical stability');
  }

  for (let iter = 0; iter < iterations; iter++) {
    const newTemps = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      let laplacian = 0;

      if (i === 0) {
        laplacian = (temps[1] - 2 * temps[i] + ambientTemp) / (spatialStep * spatialStep);
      } else if (i === n - 1) {
        laplacian = (ambientTemp - 2 * temps[i] + temps[i - 1]) / (spatialStep * spatialStep);
      } else {
        laplacian = (temps[i + 1] - 2 * temps[i] + temps[i - 1]) / (spatialStep * spatialStep);
      }

      const heatGeneration = heatSources[i] / (SPECIFIC_HEAT * DENSITY);
      const heatLoss = (temps[i] - ambientTemp) / (thermalResistance * SPECIFIC_HEAT * DENSITY);

      newTemps[i] = temps[i] + timeStep * (alpha * laplacian + heatGeneration - heatLoss);
    }

    temps = newTemps;
  }

  return temps;
}

export function calculateTemperatureDistribution(
  points: TemperaturePoint[],
  cable: CableParameters,
  timeStep: number = 1
): ThermalFieldData {
  const n = points.length;
  const spatialStep = cable.length / n;

  const initialTemps = points.map(p => p.temperature);
  const heatSources = points.map(p => calculateJouleHeating(p.current, cable.conductorResistance / n));

  const temperatures = solveHeatEquationFD(
    initialTemps,
    heatSources,
    cable.ambientTemperature,
    cable.thermalResistance,
    timeStep,
    spatialStep,
    10
  );

  const gridPoints = points.map((p, i) => ({
    x: p.position.distance,
    y: p.position.depth,
    temperature: temperatures[i],
    heatFlux: -THERMAL_CONDUCTIVITY * (temperatures[i] - (i > 0 ? temperatures[i - 1] : cable.ambientTemperature)) / spatialStep
  }));

  return {
    timestamp: Date.now(),
    gridPoints,
    maxTemperature: Math.max(...temperatures),
    avgTemperature: temperatures.reduce((a, b) => a + b, 0) / n
  };
}

export function calculateSafeCurrent(
  maxTemp: number,
  ambientTemp: number,
  cable: CableParameters
): number {
  const tempMargin = maxTemp - ambientTemp;
  const maxPowerLoss = tempMargin / cable.thermalResistance;
  return Math.sqrt(maxPowerLoss / cable.conductorResistance);
}

export function estimateRemainingLife(
  currentTemp: number,
  maxTemp: number,
  baselineLifeHours: number = 87600
): number {
  const arrheniusFactor = Math.exp((1 / (currentTemp + 273.15) - 1 / (maxTemp + 273.15)) * 12000);
  return baselineLifeHours * arrheniusFactor;
}
