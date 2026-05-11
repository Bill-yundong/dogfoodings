/// <reference lib="webworker" />

import {
  WorkerMessage,
  PowerDensityPayload,
  ArrayOutputPayload,
  LayoutOptimizationPayload,
  PowerDensityResult,
  ArrayLayout,
  Turbine,
} from '../types/tidal';
import { calculatePowerDensity, calculateTurbinePower } from '../utils/tidalMath';

const ctx: Worker = self as unknown as Worker;

interface PowerDensityCalculationResult {
  results: PowerDensityResult[];
  maxPowerDensity: number;
  avgPowerDensity: number;
}

interface ArrayOutputCalculationResult {
  totalPower: number[];
  timestamps: number[];
  efficiency: number;
  totalEnergy: number;
}

interface LayoutOptimizationResult {
  bestLayout: ArrayLayout;
  maxOutput: number;
  iterations: number;
  convergenceHistory: number[];
}

const calculatePowerDensitySeries = (
  payload: PowerDensityPayload
): PowerDensityCalculationResult => {
  const { tidalData, location } = payload;
  const results: PowerDensityResult[] = [];
  let totalPower = 0;
  let maxPower = 0;

  tidalData.forEach((data, index) => {
    const powerDensity = calculatePowerDensity(data.velocity.magnitude);
    totalPower += powerDensity;
    maxPower = Math.max(maxPower, powerDensity);

    results.push({
      timestamp: data.timestamp,
      powerDensity,
      location,
    });

    if (index % 100 === 0) {
      ctx.postMessage({
        success: true,
        progress: index / tidalData.length,
      });
    }
  });

  return {
    results,
    maxPowerDensity: maxPower,
    avgPowerDensity: totalPower / tidalData.length,
  };
};

const calculateArrayOutput = (
  payload: ArrayOutputPayload
): ArrayOutputCalculationResult => {
  const { layout, tidalData } = payload;
  const totalPower: number[] = [];
  const timestamps: number[] = [];
  let totalEnergy = 0;
  let maxTheoreticalEnergy = 0;

  tidalData.forEach((data, index) => {
    let arrayPower = 0;
    let maxTheoretical = 0;

    layout.turbines.forEach((turbine, turbineIndex) => {
      const wakeEffect = Math.exp(-turbineIndex * 0.1);
      const effectiveVelocity = data.velocity.magnitude * wakeEffect;
      const power = calculateTurbinePower(effectiveVelocity, turbine);
      
      arrayPower += power;
      maxTheoretical += turbine.ratedPower;
    });

    totalPower.push(arrayPower);
    timestamps.push(data.timestamp);
    totalEnergy += arrayPower;
    maxTheoreticalEnergy += maxTheoretical;

    if (index % 100 === 0) {
      ctx.postMessage({
        success: true,
        progress: index / tidalData.length,
      });
    }
  });

  return {
    totalPower,
    timestamps,
    efficiency: maxTheoreticalEnergy > 0 ? totalEnergy / maxTheoreticalEnergy : 0,
    totalEnergy,
  };
};

const optimizeLayout = (
  payload: LayoutOptimizationPayload
): LayoutOptimizationResult => {
  const { siteLocation, tidalData, turbineCount, constraints } = payload;
  const convergenceHistory: number[] = [];
  const iterations = 100;
  
  const baseTurbine: Omit<Turbine, 'id' | 'location'> = {
    ratedPower: 1000,
    efficiency: 0.4,
    rotorDiameter: 20,
    cutInSpeed: 0.8,
    cutOutSpeed: 4.5,
  };

  let bestLayout: ArrayLayout = {
    turbines: [],
    centerLocation: siteLocation,
    spacing: {
      longitudinal: constraints.minSpacing,
      lateral: constraints.minSpacing,
    },
  };

  let bestOutput = 0;

  for (let iter = 0; iter < iterations; iter++) {
    const turbines: Turbine[] = [];
    const cols = Math.ceil(Math.sqrt(turbineCount));
    const rows = Math.ceil(turbineCount / cols);
    
    const spacingFactor = 1 + (iter / iterations) * 2;
    const longSpacing = constraints.minSpacing * spacingFactor;
    const latSpacing = constraints.minSpacing * spacingFactor * 0.8;

    for (let i = 0; i < turbineCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const offsetX = (col - cols / 2 + 0.5) * longSpacing;
      const offsetY = (row - rows / 2 + 0.5) * latSpacing;
      
      const latPerMeter = 1 / 111000;
      const lonPerMeter = 1 / (111000 * Math.cos(siteLocation.latitude * Math.PI / 180));

      turbines.push({
        id: `turbine-${i}`,
        location: {
          latitude: siteLocation.latitude + offsetY * latPerMeter,
          longitude: siteLocation.longitude + offsetX * lonPerMeter,
        },
        ...baseTurbine,
      });
    }

    const layout: ArrayLayout = {
      turbines,
      centerLocation: siteLocation,
      spacing: {
        longitudinal: longSpacing,
        lateral: latSpacing,
      },
    };

    let totalOutput = 0;
    tidalData.forEach((data) => {
      layout.turbines.forEach((turbine, idx) => {
        const wakeEffect = Math.exp(-idx * 0.05);
        const effectiveVelocity = data.velocity.magnitude * wakeEffect;
        totalOutput += calculateTurbinePower(effectiveVelocity, turbine);
      });
    });

    if (totalOutput > bestOutput) {
      bestOutput = totalOutput;
      bestLayout = layout;
    }

    convergenceHistory.push(bestOutput);

    if (iter % 20 === 0) {
      ctx.postMessage({
        success: true,
        progress: iter / iterations,
      });
    }
  }

  return {
    bestLayout,
    maxOutput: bestOutput,
    iterations,
    convergenceHistory,
  };
};

ctx.onmessage = (e: MessageEvent<WorkerMessage>) => {
  try {
    const { type, payload } = e.data;

    switch (type) {
      case 'CALCULATE_POWER_DENSITY':
        const powerResult = calculatePowerDensitySeries(payload as PowerDensityPayload);
        ctx.postMessage({ success: true, data: powerResult, progress: 1 });
        break;

      case 'CALCULATE_ARRAY_OUTPUT':
        const arrayResult = calculateArrayOutput(payload as ArrayOutputPayload);
        ctx.postMessage({ success: true, data: arrayResult, progress: 1 });
        break;

      case 'OPTIMIZE_LAYOUT':
        const layoutResult = optimizeLayout(payload as LayoutOptimizationPayload);
        ctx.postMessage({ success: true, data: layoutResult, progress: 1 });
        break;

      default:
        ctx.postMessage({ success: false, error: `Unknown message type: ${type}` });
    }
  } catch (error) {
    ctx.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};