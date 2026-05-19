import { createStore } from 'solid-js/store';
import type { LBMConfig, MoldGeometry, FlowFieldData, Defect, PressureWaveData } from '../types';

interface SimulationState {
  config: LBMConfig;
  geometry: MoldGeometry | null;
  flowField: FlowFieldData | null;
  defects: Defect[];
  pressureWaves: PressureWaveData[];
  currentStep: number;
  fillPercentage: number;
  isRunning: boolean;
  isPaused: boolean;
  fps: number;
  maxPressure: number;
  avgTemperature: number;
}

const defaultConfig: LBMConfig = {
  gridWidth: 128,
  gridHeight: 96,
  relaxationTime: 0.7,
  initialDensity: 1.0,
  maxSteps: 5000,
  timeStep: 0.01,
};

const defaultGeometry: MoldGeometry = {
  width: 100,
  height: 80,
  depth: 5,
  obstacles: [
    { id: 'obs1', type: 'circle', x: 60, y: 40, radius: 12 },
    { id: 'obs2', type: 'rectangle', x: 90, y: 50, width: 20, height: 30 },
    { id: 'obs3', type: 'circle', x: 40, y: 65, radius: 8 },
  ],
  gates: [
    { id: 'gate1', x: 5, y: 40, width: 4, height: 20, injectionDirection: 0 },
  ],
};

const initialState: SimulationState = {
  config: defaultConfig,
  geometry: defaultGeometry,
  flowField: null,
  defects: [],
  pressureWaves: [],
  currentStep: 0,
  fillPercentage: 0,
  isRunning: false,
  isPaused: false,
  fps: 0,
  maxPressure: 0,
  avgTemperature: 0,
};

const [state, setState] = createStore<SimulationState>(initialState);

export function useSimulationStore() {
  return {
    state,
    setState,
    setConfig: (config: Partial<LBMConfig>) => setState('config', config),
    setGeometry: (geometry: MoldGeometry) => setState('geometry', geometry),
    setFlowField: (flowField: FlowFieldData | null) => setState('flowField', flowField),
    setDefects: (defects: Defect[]) => setState('defects', defects),
    setPressureWaves: (waves: PressureWaveData[]) => setState('pressureWaves', waves),
    setCurrentStep: (step: number) => setState('currentStep', step),
    setFillPercentage: (percent: number) => setState('fillPercentage', percent),
    setIsRunning: (running: boolean) => setState('isRunning', running),
    setIsPaused: (paused: boolean) => setState('isPaused', paused),
    setFps: (fps: number) => setState('fps', fps),
    setMaxPressure: (pressure: number) => setState('maxPressure', pressure),
    setAvgTemperature: (temp: number) => setState('avgTemperature', temp),
    reset: () => {
      setState('currentStep', 0);
      setState('fillPercentage', 0);
      setState('flowField', null);
      setState('defects', []);
      setState('pressureWaves', []);
      setState('isRunning', false);
      setState('isPaused', false);
      setState('fps', 0);
      setState('maxPressure', 0);
      setState('avgTemperature', 0);
    },
  };
}
