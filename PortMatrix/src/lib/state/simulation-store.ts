import { create } from 'zustand';
import type {
  CompactAgentState,
  SimulationMetrics,
  FlowSnapshot,
  FlightWave,
  PassengerType,
  AgentStatus,
  SocialForceParams,
} from '@/types';

interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  speedMultiplier: number;
  currentWaveId: string | null;
  agents: CompactAgentState[];
  metrics: SimulationMetrics | null;
  snapshots: FlowSnapshot[];
  waves: FlightWave[];
  selectedAgentId: string | null;
  showVectors: boolean;
  showHeatmap: boolean;
  showTrails: boolean;
  filterTypes: PassengerType[];
  filterStatuses: AgentStatus[];
  socialForceParams: SocialForceParams;
  worker: Worker | null;

  setWorker: (worker: Worker | null) => void;
  setRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: number) => void;
  setCurrentWave: (waveId: string | null) => void;
  setAgents: (agents: CompactAgentState[]) => void;
  setMetrics: (metrics: SimulationMetrics) => void;
  addSnapshot: (snapshot: FlowSnapshot) => void;
  setSnapshots: (snapshots: FlowSnapshot[]) => void;
  addWave: (wave: FlightWave) => void;
  setWaves: (waves: FlightWave[]) => void;
  deleteWave: (waveId: string) => void;
  setSelectedAgent: (id: string | null) => void;
  setShowVectors: (show: boolean) => void;
  setShowHeatmap: (show: boolean) => void;
  setShowTrails: (show: boolean) => void;
  toggleFilterType: (type: PassengerType) => void;
  toggleFilterStatus: (status: AgentStatus) => void;
  setSocialForceParams: (params: Partial<SocialForceParams>) => void;
  reset: () => void;
}

const defaultSocialForceParams: SocialForceParams = {
  selfDrivingCoeff: 2.0,
  socialRepulsionCoeff: 15.0,
  socialRepulsionRange: 2.5,
  boundaryRepulsionCoeff: 10.0,
  attractionCoeff: 0.5,
  maxSpeed: 3.0,
  relaxationTime: 0.5,
};

const defaultMetrics: SimulationMetrics = {
  simulationTime: 0,
  realTime: 0,
  speedMultiplier: 1,
  totalPassengers: 0,
  activePassengers: 0,
  completedPassengers: 0,
  throughput: 0,
  avgTotalTime: 0,
  avgWaitTime: {},
  queueLengths: {},
  zoneDensities: {},
  bottlenecks: [],
  fps: 60,
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  isRunning: false,
  isPaused: false,
  speedMultiplier: 1,
  currentWaveId: null,
  agents: [],
  metrics: null,
  snapshots: [],
  waves: [],
  selectedAgentId: null,
  showVectors: false,
  showHeatmap: true,
  showTrails: false,
  filterTypes: ['business', 'tourist', 'transfer', 'special'],
  filterStatuses: [
    'arriving',
    'in_checkin_queue',
    'at_checkin',
    'in_security_queue',
    'at_security',
    'walking',
    'shopping',
    'waiting_gate',
    'boarding',
  ],
  socialForceParams: defaultSocialForceParams,
  worker: null,

  setWorker: (worker) => set({ worker }),

  setRunning: (running) => set({ isRunning: running }),

  setPaused: (paused) => set({ isPaused: paused }),

  setSpeed: (speed) => {
    set({ speedMultiplier: speed });
    const { worker } = get();
    if (worker) {
      worker.postMessage({ type: 'speed_change', data: { speed } });
    }
  },

  setCurrentWave: (waveId) => set({ currentWaveId: waveId }),

  setAgents: (agents) => set({ agents }),

  setMetrics: (metrics) => set({ metrics }),

  addSnapshot: (snapshot) =>
    set((state) => ({ snapshots: [...state.snapshots, snapshot] })),

  setSnapshots: (snapshots) => set({ snapshots }),

  addWave: (wave) =>
    set((state) => ({ waves: [...state.waves, wave] })),

  setWaves: (waves) => set({ waves }),

  deleteWave: (waveId) =>
    set((state) => ({
      waves: state.waves.filter((w) => w.id !== waveId),
      snapshots: state.snapshots.filter((s) => s.waveId !== waveId),
      currentWaveId: state.currentWaveId === waveId ? null : state.currentWaveId,
    })),

  setSelectedAgent: (id) => set({ selectedAgentId: id }),

  setShowVectors: (show) => set({ showVectors: show }),

  setShowHeatmap: (show) => set({ showHeatmap: show }),

  setShowTrails: (show) => set({ showTrails: show }),

  toggleFilterType: (type) =>
    set((state) => ({
      filterTypes: state.filterTypes.includes(type)
        ? state.filterTypes.filter((t) => t !== type)
        : [...state.filterTypes, type],
    })),

  toggleFilterStatus: (status) =>
    set((state) => ({
      filterStatuses: state.filterStatuses.includes(status)
        ? state.filterStatuses.filter((s) => s !== status)
        : [...state.filterStatuses, status],
    })),

  setSocialForceParams: (params) => {
    const newParams = { ...get().socialForceParams, ...params };
    set({ socialForceParams: newParams });
    const { worker } = get();
    if (worker) {
      worker.postMessage({ type: 'params_update', data: newParams });
    }
  },

  reset: () => {
    const { worker } = get();
    if (worker) {
      worker.postMessage({ type: 'reset' });
    }
    set({
      isRunning: false,
      isPaused: false,
      speedMultiplier: 1,
      currentWaveId: null,
      agents: [],
      metrics: defaultMetrics,
      snapshots: [],
      selectedAgentId: null,
    });
  },
}));
