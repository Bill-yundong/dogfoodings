import { writable, derived } from 'svelte/store';
import { BOILER_CONSTANTS, ANOMALY_THRESHOLDS } from './boilerConstants.js';

export const boilerState = writable({
  timestamp: Date.now(),
  oxygen: 4.2,
  temperature: 900,
  pressure: 14.2,
  co: 25,
  nox: 65,
  efficiency: 92.5,
  fuelFlow: 75,
  primaryAir: 90,
  secondaryAir: 60,
  inducedDraft: 60,
  forcedDraft: 70,
  excessAir: 1.25,
  load: 75,
  isRunning: true,
  anomalyDetected: false,
  anomalyType: null
});

export const combustionSettings = writable({
  oxygen: BOILER_CONSTANTS
});

export const mpcParams = writable({
  predictionHorizon: 20,
  controlHorizon: 5,
  weights: {
    oxygen: 1.0,
    temperature: 0.8,
    efficiency: 1.2,
    emissions: 0.9
  },
  constraints: {
    fuelFlow: { min: 55, max: 95 },
    airFlow: { min: 70, max: 110 }
  },
  isAutoMode: true,
  lastOptimization: null
});

export const systemStatus = writable({
  isConnected: true,
  lastUpdate: Date.now(),
  dataPoints: 0,
  uptime: 0
});

export const efficiencyTrend = writable([]);
export const oxygenHistory = writable([]);

export const combustionQuality = derived(boilerState, ($state) => {
  const { oxygen, temperature, pressure, co, nox, efficiency } = $state;
  const oxyScore = oxygen >= 3.5 && oxygen <= 5.0 ? 100 : Math.max(0, 100 - Math.abs(oxygen - 4.2) * 20);
  const tempScore = temperature >= 850 && temperature <= 950 ? 100 : Math.max(0, 100 - Math.abs(temperature - 900) * 0.5);
  const effScore = Math.min(100, efficiency * 1.05);
  const emissionScore = Math.max(0, 100 - (co * 0.5) - Math.max(0, (nox - 50) * 0.5));
  const overall = (oxyScore * 0.3 + tempScore * 0.25 + effScore * 0.3 + emissionScore * 0.15);
  return {
    overall: Math.round(overall),
    oxygen: Math.round(oxyScore),
    temperature: Math.round(tempScore),
    efficiency: Math.round(effScore),
    emissions: Math.round(emissionScore)
  };
});

export const semanticSyncState = writable({
  energyMonitor: { lastSync: null, status: 'idle' },
  fanControl: { lastSync: null, status: 'idle' }
});
