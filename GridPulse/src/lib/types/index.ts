export interface GridSystem {
  id: string;
  name: string;
  baseFrequency: number;
  totalCapacity: number;
  generators: Generator[];
  loads: Load[];
  buses: Bus[];
}

export interface Generator {
  id: string;
  systemId: string;
  type: 'synchronous' | 'inverter-based' | 'wind' | 'solar';
  ratedPower: number;
  inertia: number;
  damping: number;
  droop: number;
  status: 'online' | 'offline' | 'derated';
}

export interface Load {
  id: string;
  systemId: string;
  basePower: number;
  category: 'residential' | 'commercial' | 'industrial' | 'ev';
  voltageDependency: number;
  frequencyDependency: number;
  isControllable: boolean;
}

export interface Bus {
  id: string;
  systemId: string;
  baseVoltage: number;
  busType: 1 | 2 | 3;
}

export interface SimulationParameters {
  timeSpan: [number, number];
  timeStep: number;
  integrationMethod: 'rk4' | 'euler' | 'trapezoidal';
  disturbance: DisturbanceConfig;
}

export interface DisturbanceConfig {
  type: 'load-jump' | 'generator-loss' | 'fault';
  time: number;
  magnitude: number;
  duration?: number;
}

export interface SimulationTask {
  id: string;
  systemId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  parameters: SimulationParameters;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SimulationResult {
  id: string;
  taskId: string;
  timeSeries: Float64Array;
  frequencySeries: Float64Array;
  deltaSeries: Float64Array;
  omegaSeries: Float64Array;
  stabilityMargin: StabilityAnalysis;
  createdAt: Date;
}

export interface StabilityAnalysis {
  margin: number;
  maxDeviation: number;
  nadir: number;
  recoveryTime: number;
  isStable: boolean;
  rocof: number;
  settlingFrequency: number;
}

export interface UserSnapshot {
  id: string;
  userId: string;
  timestamp: Date;
  loadFeatures: LoadFeatures;
  flexibilityScore: number;
  patternType: LoadPatternType;
}

export interface LoadFeatures {
  hourlyConsumption: number[];
  peakLoad: number;
  averageLoad: number;
  loadFactor: number;
  maxDailyVariation: number;
  temperatureSensitivity: number;
}

export type LoadPatternType = 'morning-peak' | 'evening-peak' | 'flat' | 'night-owl' | 'industrial';

export interface DispatchCommand {
  id: string;
  source: 'dispatch-center' | 'load-controller';
  target: string;
  controlSignal: ControlSignal;
  issuedAt: Date;
  status: 'pending' | 'sent' | 'acknowledged' | 'executed';
}

export interface ControlSignal {
  type: 'load-shed' | 'load-increase' | 'frequency-support';
  powerAdjustment: number;
  duration: number;
  priority: number;
}

export interface Alert {
  id: string;
  type: 'frequency' | 'stability' | 'equipment' | 'communication';
  severity: 'info' | 'warning' | 'danger';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  value?: number;
  threshold?: number;
}

export interface SystemStatus {
  currentFrequency: number;
  frequencyDeviation: number;
  totalGeneration: number;
  totalLoad: number;
  spinningReserve: number;
  stabilityMargin: number;
  systemState: 'normal' | 'alert' | 'emergency' | 'restoration';
  lastUpdate: Date;
}

export interface SwingEquationParams {
  M: number;
  D: number;
  Pm: number;
  Pl: number;
  E: number;
  V: number;
  X: number;
  delta0: number;
  omega0: number;
}

export interface SolverConfig {
  method: 'rk4' | 'euler' | 'trapezoidal';
  dt: number;
  tEnd: number;
  tolerance?: number;
  maxIterations?: number;
}

export interface DBSchema {
  user_snapshots: UserSnapshot;
  simulation_tasks: SimulationTask;
  simulation_results: SimulationResult;
  system_settings: { key: string; value: unknown };
}
