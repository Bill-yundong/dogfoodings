import type { CableParameters, TemperaturePoint, ThermalFieldData, PredictionResult } from '@/types';
import { calculateTemperatureDistribution, calculateSafeCurrent, solveHeatEquationFD } from './thermal';

export interface CouplingInput {
  sensorData: TemperaturePoint[];
  cableParams: CableParameters;
  environmentalData: {
    seawaterTemp: number;
    currentSpeed: number;
    soilThermalResistivity: number;
  };
  loadForecast: number[];
}

export interface CouplingResult {
  thermalField: ThermalFieldData;
  electromagneticField: {
    currentDensity: number[];
    powerLoss: number[];
    magneticField: number[];
  };
  stressAnalysis: {
    thermalStress: number[];
    mechanicalStrain: number[];
  };
  timestamp: number;
  computationTime: number;
}

export async function runMultiphysicsCoupling(
  input: CouplingInput
): Promise<CouplingResult> {
  const startTime = performance.now();

  const adjustedAmbient = input.environmentalData.seawaterTemp +
    (input.environmentalData.currentSpeed > 0.5 ? -2 : 0) +
    (input.environmentalData.soilThermalResistivity > 0.8 ? 1 : 0);

  const adjustedCable = {
    ...input.cableParams,
    ambientTemperature: adjustedAmbient,
    thermalResistance: input.cableParams.thermalResistance *
      (1 + (input.environmentalData.soilThermalResistivity - 0.5) * 0.3)
  };

  const thermalField = calculateTemperatureDistribution(input.sensorData, adjustedCable, 0.1);

  const n = input.sensorData.length;
  const electromagneticField = {
    currentDensity: input.sensorData.map(p => p.current / 0.01),
    powerLoss: input.sensorData.map(p => p.current * p.current * adjustedCable.conductorResistance / n),
    magneticField: input.sensorData.map(p => p.current * 2e-7 / 0.1)
  };

  const alpha = 17e-6;
  const e = 110e9;
  const stressAnalysis = {
    thermalStress: thermalField.gridPoints.map(gp =>
      -e * alpha * (gp.temperature - adjustedCable.ambientTemperature)
    ),
    mechanicalStrain: thermalField.gridPoints.map(gp =>
      alpha * (gp.temperature - adjustedCable.ambientTemperature)
    )
  };

  const computationTime = performance.now() - startTime;

  return {
    thermalField,
    electromagneticField,
    stressAnalysis,
    timestamp: Date.now(),
    computationTime
  };
}

export async function runCouplingSimulation(
  initialData: TemperaturePoint[],
  cable: CableParameters,
  durationHours: number,
  timeStepMinutes: number = 5
): Promise<ThermalFieldData[]> {
  const results: ThermalFieldData[] = [];
  const steps = Math.ceil((durationHours * 60) / timeStepMinutes);
  const spatialStep = cable.length / initialData.length;

  let currentTemps = initialData.map(p => p.temperature);
  const baseHeatSources = initialData.map(p => p.current * p.current * cable.conductorResistance / initialData.length);

  for (let i = 0; i < steps; i++) {
    const time = i * timeStepMinutes * 60 * 1000;
    const loadVariation = 0.8 + 0.4 * Math.sin(i / 20);

    const heatSources = baseHeatSources.map(h => h * loadVariation);

    currentTemps = solveHeatEquationFD(
      currentTemps,
      heatSources,
      cable.ambientTemperature,
      cable.thermalResistance,
      timeStepMinutes * 60,
      spatialStep,
      5
    );

    const gridPoints = initialData.map((p, idx) => ({
      x: p.position.distance,
      y: p.position.depth,
      temperature: currentTemps[idx],
      heatFlux: 0
    }));

    results.push({
      timestamp: Date.now() + time,
      gridPoints,
      maxTemperature: Math.max(...currentTemps),
      avgTemperature: currentTemps.reduce((a, b) => a + b, 0) / currentTemps.length
    });
  }

  return results;
}

export async function predictTemperature(
  currentData: TemperaturePoint[],
  cable: CableParameters,
  horizonHours: number,
  loadProfile: number[]
): Promise<PredictionResult> {
  const spatialStep = cable.length / currentData.length;
  const timeStepHours = 0.5;
  const steps = Math.ceil(horizonHours / timeStepHours);

  let temps = currentData.map(p => p.temperature);
  const forecast: Array<{ time: number; temp: number; confidence: number }> = [];

  for (let i = 0; i < steps; i++) {
    const loadIndex = Math.min(i, loadProfile.length - 1);
    const loadFactor = loadProfile[loadIndex] || 1;
    const heatSources = currentData.map(p =>
      p.current * loadFactor * p.current * loadFactor * cable.conductorResistance / currentData.length
    );

    temps = solveHeatEquationFD(
      temps,
      heatSources,
      cable.ambientTemperature,
      cable.thermalResistance,
      timeStepHours * 3600,
      spatialStep,
      3
    );

    const maxTemp = Math.max(...temps);
    const confidence = Math.max(0.3, 1 - i / steps * 0.5);

    forecast.push({
      time: Date.now() + i * timeStepHours * 3600 * 1000,
      temp: maxTemp,
      confidence
    });
  }

  const maxForecastTemp = Math.max(...forecast.map(f => f.temp));
  const safeCurrent = calculateSafeCurrent(maxForecastTemp, cable.ambientTemperature, cable);

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (maxForecastTemp > cable.maxTemperature * 0.9) {
    riskLevel = 'high';
  } else if (maxForecastTemp > cable.maxTemperature * 0.75) {
    riskLevel = 'medium';
  }

  const hotspotProbability = forecast.filter(f => f.temp > cable.maxTemperature * 0.85).length / forecast.length;

  return {
    timestamp: Date.now(),
    horizon: horizonHours,
    temperatureForecast: forecast,
    safeCurrent,
    riskLevel,
    hotspotProbability
  };
}
