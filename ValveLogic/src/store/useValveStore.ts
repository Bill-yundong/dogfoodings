import { create } from 'zustand';
import type { Valve } from '../types';
import { updateValveOpening, emergencyShutdown } from '../engine/valve-controller';
import type { EmergencyShutdownConfig, ValveControlSequence } from '../engine/valve-controller';

interface ValveState {
  valves: Valve[];
  controlSequences: Map<string, ValveControlSequence>;
  emergencyConfig: EmergencyShutdownConfig;
  autoProtectionEnabled: boolean;

  setValves: (valves: Valve[]) => void;
  addValve: (valve: Valve) => void;
  updateValve: (id: string, updates: Partial<Valve>) => void;
  removeValve: (id: string) => void;
  setTargetOpening: (id: string, target: number) => void;
  openValve: (id: string) => void;
  closeValve: (id: string) => void;
  toggleValve: (id: string) => void;
  openAllValves: () => void;
  closeAllValves: () => void;
  triggerEmergencyShutdown: (timeStep: number) => void;
  updateValvesStep: (timeStep: number) => void;
  addControlSequence: (sequence: ValveControlSequence) => void;
  removeControlSequence: (valveId: string) => void;
  setEmergencyConfig: (config: Partial<EmergencyShutdownConfig>) => void;
  loadDemoValves: () => void;
}

const defaultEmergencyConfig: EmergencyShutdownConfig = {
  enabled: true,
  pressureThreshold: 8000000,
  closingTime: 2,
  targetOpening: 0,
};

export const useValveStore = create<ValveState>((set, get) => ({
  valves: [],
  controlSequences: new Map(),
  emergencyConfig: defaultEmergencyConfig,
  autoProtectionEnabled: true,

  setValves: (valves) => set({ valves }),

  addValve: (valve) => set((state) => ({ valves: [...state.valves, valve] })),

  updateValve: (id, updates) =>
    set((state) => ({
      valves: state.valves.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    })),

  removeValve: (id) =>
    set((state) => ({
      valves: state.valves.filter((v) => v.id !== id),
    })),

  setTargetOpening: (id, target) =>
    set((state) => ({
      valves: state.valves.map((v) =>
        v.id === id ? { ...v, targetOpening: Math.max(0, Math.min(1, target)) } : v
      ),
    })),

  openValve: (id) =>
    set((state) => ({
      valves: state.valves.map((v) => (v.id === id ? { ...v, targetOpening: 1 } : v)),
    })),

  closeValve: (id) =>
    set((state) => ({
      valves: state.valves.map((v) => (v.id === id ? { ...v, targetOpening: 0 } : v)),
    })),

  toggleValve: (id) =>
    set((state) => ({
      valves: state.valves.map((v) =>
        v.id === id
          ? { ...v, targetOpening: v.targetOpening > 0.5 ? 0 : 1 }
          : v
      ),
    })),

  openAllValves: () =>
    set((state) => ({
      valves: state.valves.map((v) => ({ ...v, targetOpening: 1 })),
    })),

  closeAllValves: () =>
    set((state) => ({
      valves: state.valves.map((v) => ({ ...v, targetOpening: 0 })),
    })),

  triggerEmergencyShutdown: (timeStep) => {
    const { valves, emergencyConfig } = get();
    const updatedValves = valves.map((valve) => {
      const { valve: updated } = emergencyShutdown(valve, emergencyConfig.closingTime, timeStep);
      return updated;
    });
    set({ valves: updatedValves });
  },

  updateValvesStep: (timeStep) => {
    const { valves } = get();
    const updatedValves = valves.map((valve) => {
      const { valve: updated } = updateValveOpening(valve, timeStep);
      return updated;
    });
    set({ valves: updatedValves });
  },

  addControlSequence: (sequence) =>
    set((state) => {
      const newSequences = new Map(state.controlSequences);
      newSequences.set(sequence.valveId, sequence);
      return { controlSequences: newSequences };
    }),

  removeControlSequence: (valveId) =>
    set((state) => {
      const newSequences = new Map(state.controlSequences);
      newSequences.delete(valveId);
      return { controlSequences: newSequences };
    }),

  setEmergencyConfig: (config) =>
    set((state) => ({
      emergencyConfig: { ...state.emergencyConfig, ...config },
    })),

  loadDemoValves: () => {
    const demoValves: Valve[] = [
      { id: 'valve-v1', nodeId: 'valve-1', type: 'gate', opening: 1, targetOpening: 1, maxFlowRate: 1.0, responseTime: 3, status: 'normal', autoProtection: true },
      { id: 'valve-v2', nodeId: 'valve-2', type: 'ball', opening: 0.6, targetOpening: 0.6, maxFlowRate: 0.8, responseTime: 2, status: 'normal', autoProtection: true },
      { id: 'valve-v3', nodeId: 'valve-3', type: 'butterfly', opening: 0.8, targetOpening: 0.8, maxFlowRate: 0.9, responseTime: 2.5, status: 'normal', autoProtection: true },
    ];
    set({ valves: demoValves });
  },
}));
