import type { SwingEquationParams, SolverConfig, StabilityAnalysis } from '$lib/types';

export interface SolverResult {
  time: Float64Array;
  delta: Float64Array;
  omega: Float64Array;
  frequency: Float64Array;
  pe: Float64Array;
}

export function solveSwingEquation(
  params: SwingEquationParams,
  config: SolverConfig,
  onProgress?: (progress: number) => void
): SolverResult {
  const { M, D, Pm, Pl, E, V, X, delta0, omega0 } = params;
  const { dt, tEnd, method } = config;
  
  const nSteps = Math.ceil(tEnd / dt);
  const time = new Float64Array(nSteps);
  const delta = new Float64Array(nSteps);
  const omega = new Float64Array(nSteps);
  const frequency = new Float64Array(nSteps);
  const pe = new Float64Array(nSteps);
  
  delta[0] = delta0;
  omega[0] = omega0;
  frequency[0] = 50 * (1 + omega0 / (2 * Math.PI * 50));
  time[0] = 0;
  pe[0] = (E * V / X) * Math.sin(delta0);
  
  const basePe = (E * V / X) * Math.sin(delta0);
  const perturbationTime = 1.0;
  
  for (let i = 0; i < nSteps - 1; i++) {
    const t = time[i];
    const currentPl = t >= perturbationTime ? Pl : Pl * 0.8;
    
    if (method === 'rk4') {
      const result = rk4Step(delta[i], omega[i], t, dt, M, D, Pm, currentPl, E, V, X);
      delta[i + 1] = result.delta;
      omega[i + 1] = result.omega;
    } else if (method === 'euler') {
      const result = eulerStep(delta[i], omega[i], t, dt, M, D, Pm, currentPl, E, V, X);
      delta[i + 1] = result.delta;
      omega[i + 1] = result.omega;
    } else {
      const result = trapezoidalStep(delta[i], omega[i], t, dt, M, D, Pm, currentPl, E, V, X);
      delta[i + 1] = result.delta;
      omega[i + 1] = result.omega;
    }
    
    time[i + 1] = t + dt;
    frequency[i + 1] = 50 * (1 + omega[i + 1] / (2 * Math.PI * 50));
    pe[i + 1] = (E * V / X) * Math.sin(delta[i + 1]);
    
    if (onProgress && i % 100 === 0) {
      onProgress((i / nSteps) * 100);
    }
  }
  
  if (onProgress) {
    onProgress(100);
  }
  
  return { time, delta, omega, frequency, pe };
}

function rk4Step(
  delta0: number,
  omega0: number,
  t0: number,
  dt: number,
  M: number,
  D: number,
  Pm: number,
  Pl: number,
  E: number,
  V: number,
  X: number
): { delta: number; omega: number } {
  const f = (delta: number, omega: number, t: number) => {
    const Pe = (E * V / X) * Math.sin(delta);
    const Pacc = Pm - Pl - Pe;
    return [omega, (Pacc - D * omega) / M];
  };
  
  const [k1d, k1w] = f(delta0, omega0, t0);
  const [k2d, k2w] = f(delta0 + 0.5 * dt * k1d, omega0 + 0.5 * dt * k1w, t0 + 0.5 * dt);
  const [k3d, k3w] = f(delta0 + 0.5 * dt * k2d, omega0 + 0.5 * dt * k2w, t0 + 0.5 * dt);
  const [k4d, k4w] = f(delta0 + dt * k3d, omega0 + dt * k3w, t0 + dt);
  
  return {
    delta: delta0 + (dt / 6) * (k1d + 2 * k2d + 2 * k3d + k4d),
    omega: omega0 + (dt / 6) * (k1w + 2 * k2w + 2 * k3w + k4w)
  };
}

function eulerStep(
  delta0: number,
  omega0: number,
  t0: number,
  dt: number,
  M: number,
  D: number,
  Pm: number,
  Pl: number,
  E: number,
  V: number,
  X: number
): { delta: number; omega: number } {
  const Pe = (E * V / X) * Math.sin(delta0);
  const Pacc = Pm - Pl - Pe;
  const dOmega = (Pacc - D * omega0) / M;
  
  return {
    delta: delta0 + dt * omega0,
    omega: omega0 + dt * dOmega
  };
}

function trapezoidalStep(
  delta0: number,
  omega0: number,
  t0: number,
  dt: number,
  M: number,
  D: number,
  Pm: number,
  Pl: number,
  E: number,
  V: number,
  X: number
): { delta: number; omega: number } {
  const Pe0 = (E * V / X) * Math.sin(delta0);
  const Pacc0 = Pm - Pl - Pe0;
  const dOmega0 = (Pacc0 - D * omega0) / M;
  
  let delta1 = delta0 + dt * omega0;
  let omega1 = omega0 + dt * dOmega0;
  
  for (let iter = 0; iter < 10; iter++) {
    const Pe1 = (E * V / X) * Math.sin(delta1);
    const Pacc1 = Pm - Pl - Pe1;
    const dOmega1 = (Pacc1 - D * omega1) / M;
    
    const newDelta = delta0 + 0.5 * dt * (omega0 + omega1);
    const newOmega = omega0 + 0.5 * dt * (dOmega0 + dOmega1);
    
    const deltaErr = Math.abs(newDelta - delta1);
    const omegaErr = Math.abs(newOmega - omega1);
    
    delta1 = newDelta;
    omega1 = newOmega;
    
    if (deltaErr < 1e-8 && omegaErr < 1e-8) break;
  }
  
  return { delta: delta1, omega: omega1 };
}

export function analyzeStability(
  frequency: Float64Array,
  time: Float64Array,
  fn: number = 50
): StabilityAnalysis {
  const n = frequency.length;
  
  let maxDeviation = 0;
  let nadir = fn;
  let nadirIndex = 0;
  let maxRocof = 0;
  
  for (let i = 0; i < n; i++) {
    const deviation = Math.abs(frequency[i] - fn);
    if (deviation > maxDeviation) {
      maxDeviation = deviation;
    }
    if (frequency[i] < nadir) {
      nadir = frequency[i];
      nadirIndex = i;
    }
    if (i > 0) {
      const rocof = Math.abs((frequency[i] - frequency[i - 1]) / (time[i] - time[i - 1]));
      if (rocof > maxRocof) {
        maxRocof = rocof;
      }
    }
  }
  
  const threshold = 0.001;
  let recoveryTime = time[n - 1];
  let settlingFrequency = frequency[n - 1];
  
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(frequency[i] - fn) > threshold) {
      recoveryTime = i < n - 1 ? time[i + 1] : time[i];
      break;
    }
    settlingFrequency = frequency[i];
  }
  
  const steadyStateDeviation = Math.abs(settlingFrequency - fn);
  const isStable = steadyStateDeviation < 0.05 && nadir > fn - 0.5;
  const margin = Math.min(nadir - (fn - 0.5), (fn + 0.5) - Math.max(...frequency));
  
  return {
    margin: Math.max(0, margin),
    maxDeviation,
    nadir,
    recoveryTime,
    isStable,
    rocof: maxRocof,
    settlingFrequency
  };
}

export function generateDefaultParams(): SwingEquationParams {
  return {
    M: 4.0,
    D: 1.5,
    Pm: 1.0,
    Pl: 1.0,
    E: 1.05,
    V: 1.0,
    X: 0.5,
    delta0: 0.5236,
    omega0: 0
  };
}

export function generateDefaultConfig(): SolverConfig {
  return {
    method: 'rk4',
    dt: 0.001,
    tEnd: 20
  };
}
