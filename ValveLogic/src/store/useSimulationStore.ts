import { create } from 'zustand';
import type {
  SimulationStatus,
  MOCConfig,
  Warning,
  PressureSnapshot,
  PipelineNode,
  PipelineSegment,
  Valve,
} from '../types';
import {
  createMOCGrid,
  initializeSteadyState,
  computeCharacteristicCoefficients,
  solveInteriorPoints,
  solveUpstreamReservoir,
  solveDownstreamValve,
  advanceTimeStep,
  extractPressureProfile,
  checkPressureWarnings,
  calculateWaveSpeed,
} from '../engine/moc-solver';
import type { MOCGrid } from '../types';
import { saveSnapshot } from '../db/snapshot-repository';

interface SimulationState {
  status: SimulationStatus;
  currentTime: number;
  speed: number;
  config: MOCConfig;
  warnings: Warning[];
  grids: MOCGrid[];
  nodePressures: Record<string, number>;
  segmentPressures: Record<string, number[]>;
  valveStates: Record<string, number>;
  currentSimulationId: string | null;
  snapshots: PressureSnapshot[];
  lastSnapshotTime: number;

  setStatus: (status: SimulationStatus) => void;
  setSpeed: (speed: number) => void;
  setConfig: (config: Partial<MOCConfig>) => void;
  addWarning: (warning: Warning) => void;
  clearWarnings: () => void;
  setSimulationId: (id: string | null) => void;

  initializeSimulation: (
    nodes: PipelineNode[],
    segments: PipelineSegment[],
    valves: Valve[]
  ) => void;
  stepSimulation: (
    nodes: PipelineNode[],
    segments: PipelineSegment[],
    valves: Valve[]
  ) => { valves: Valve[]; warnings: Warning[] };
  resetSimulation: () => void;
}

const defaultConfig: MOCConfig = {
  timeStep: 0.01,
  totalTime: 100,
  courantNumber: 1,
  gravity: 9.81,
  fluidDensity: 850,
  fluidViscosity: 0.001,
  pressureMin: 100000,
  pressureMax: 10000000,
  snapInterval: 10,
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  status: 'idle',
  currentTime: 0,
  speed: 1,
  config: defaultConfig,
  warnings: [],
  grids: [],
  nodePressures: {},
  segmentPressures: {},
  valveStates: {},
  currentSimulationId: null,
  snapshots: [],
  lastSnapshotTime: 0,

  setStatus: (status) => set({ status }),
  setSpeed: (speed) => set({ speed }),
  setConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),
  addWarning: (warning) => set((state) => ({ warnings: [...state.warnings, warning] })),
  clearWarnings: () => set({ warnings: [] }),
  setSimulationId: (id) => set({ currentSimulationId: id }),

  initializeSimulation: (nodes, segments, valves) => {
    const config = get().config;
    const grids: MOCGrid[] = [];
    const nodePressures: Record<string, number> = {};
    const segmentPressures: Record<string, number[]> = {};
    const valveStates: Record<string, number> = {};

    segments.forEach((segment) => {
      const waveSpeed = calculateWaveSpeed(segment, 2.2e9, config.fluidDensity);
      const grid = createMOCGrid({ ...segment, waveSpeed }, waveSpeed, config.timeStep);
      initializeSteadyState(grid, 1000000 / (config.fluidDensity * config.gravity), 500000 / (config.fluidDensity * config.gravity), 0.1);
      grids.push(grid);

      segmentPressures[segment.id] = extractPressureProfile(grid);
    });

    nodes.forEach((node) => {
      nodePressures[node.id] = node.pressure;
    });

    valves.forEach((valve) => {
      valveStates[valve.id] = valve.opening;
    });

    set({
      grids,
      nodePressures,
      segmentPressures,
      valveStates,
      currentTime: 0,
      status: 'idle',
      warnings: [],
      lastSnapshotTime: 0,
    });
  },

  stepSimulation: (nodes, segments, valves) => {
    const { config, grids, currentTime, currentSimulationId, lastSnapshotTime } = get();
    const newWarnings: Warning[] = [];
    let updatedValves = [...valves];

    if (grids.length === 0) {
      return { valves, warnings: [] };
    }

    grids.forEach((grid, idx) => {
      const segment = segments[idx];
      if (!segment) return;
      computeCharacteristicCoefficients(grid, config, segment);
    });

    grids.forEach((grid, idx) => {
      const segment = segments[idx];
      if (!segment) return;
      solveInteriorPoints(grid, config, segment);
    });

    grids.forEach((grid, idx) => {
      const segment = segments[idx];
      if (!segment) return;

      const upstreamNode = nodes.find((n) => n.id === segment.fromNodeId);
      const upstreamHead = upstreamNode
        ? upstreamNode.pressure / (config.fluidDensity * config.gravity)
        : 100;

      solveUpstreamReservoir(grid, config, segment, upstreamHead);

      const valve = valves.find((v) => v.nodeId === segment.toNodeId);
      if (valve) {
        const { pressure } = solveDownstreamValve(
          grid,
          config,
          segment,
          valve.opening,
          valve.maxFlowRate
        );

        const warnings = checkPressureWarnings(
          pressure,
          config,
          segment.toNodeId,
          currentTime
        );
        newWarnings.push(...warnings);

        const nodeIdx = nodes.findIndex((n) => n.id === segment.toNodeId);
        if (nodeIdx >= 0) {
          nodes[nodeIdx].pressure = pressure;
        }
      }
    });

    grids.forEach((grid) => advanceTimeStep(grid));

    const segmentPressures: Record<string, number[]> = {};
    grids.forEach((grid, idx) => {
      segmentPressures[segments[idx].id] = extractPressureProfile(grid);
    });

    const nodePressures: Record<string, number> = {};
    nodes.forEach((node) => {
      nodePressures[node.id] = node.pressure;
    });

    const valveStates: Record<string, number> = {};
    valves.forEach((valve) => {
      valveStates[valve.id] = valve.opening;
    });

    const newTime = currentTime + config.timeStep;

    if (currentSimulationId && newTime - lastSnapshotTime >= config.snapInterval * config.timeStep) {
      saveSnapshot(currentSimulationId, {
        timestamp: Date.now(),
        simulationTime: newTime,
        nodePressures,
        segmentPressures,
        valveStates,
        warnings: newWarnings,
      });
    }

    set({
      currentTime: newTime,
      segmentPressures,
      nodePressures,
      valveStates,
      warnings: [...get().warnings, ...newWarnings],
      lastSnapshotTime: newTime - lastSnapshotTime >= config.snapInterval * config.timeStep ? newTime : lastSnapshotTime,
    });

    return { valves: updatedValves, warnings: newWarnings };
  },

  resetSimulation: () => {
    set({
      status: 'idle',
      currentTime: 0,
      warnings: [],
      nodePressures: {},
      segmentPressures: {},
      valveStates: {},
      grids: [],
      lastSnapshotTime: 0,
    });
  },
}));
