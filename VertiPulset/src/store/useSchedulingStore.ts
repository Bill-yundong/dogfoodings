import { create } from 'zustand';
import type { Flight, RunwayAllocation, MDPState, TurnoverPrediction, ScheduleOptimizationResult } from '@/types';
import { MDPSolver } from '@/lib/mdp/solver';

interface SchedulingState {
  mdpSolver: MDPSolver | null;
  currentState: MDPState | null;
  predictions: TurnoverPrediction[];
  allocations: RunwayAllocation[];
  optimizationResult: ScheduleOptimizationResult | null;
  isOptimizing: boolean;
  initMDP: () => void;
  setCurrentState: (state: MDPState) => void;
  predictTurnover: (horizonMinutes: number) => void;
  optimizeSchedule: (flights: Flight[]) => void;
  setAllocations: (allocations: RunwayAllocation[]) => void;
  clearData: () => void;
}

export const useSchedulingStore = create<SchedulingState>((set, get) => ({
  mdpSolver: null,
  currentState: null,
  predictions: [],
  allocations: [],
  optimizationResult: null,
  isOptimizing: false,

  initMDP: () => {
    const solver = new MDPSolver();
    set({ mdpSolver: solver });
  },

  setCurrentState: (state) => set({ currentState: state }),

  predictTurnover: (horizonMinutes) => {
    const { mdpSolver, currentState } = get();
    if (!mdpSolver || !currentState) return;

    const prediction = mdpSolver.predictTurnover(currentState, horizonMinutes, []);
    set((state) => ({
      predictions: [...state.predictions, prediction].slice(-10)
    }));
  },

  optimizeSchedule: (flights) => {
    const { mdpSolver, currentState, allocations } = get();
    if (!mdpSolver || !currentState) return;

    set({ isOptimizing: true });
    
    setTimeout(() => {
      const runways = get().allocations[0]?.runwayId ? [] : [];
      const availableRunways = get().allocations.map(a => ({ id: a.runwayId, available: true }));
      
      const flightData = flights.slice(0, 20).map(f => ({
        id: f.id,
        priority: f.priority,
        earliestTime: f.scheduledDeparture
      }));

      const result = mdpSolver.optimizeSchedule(
        flightData,
        availableRunways.length > 0 ? availableRunways : [{ id: 'rwy_1', available: true }],
        currentState
      );

      set({ optimizationResult: result, isOptimizing: false });
    }, 500);
  },

  setAllocations: (allocations) => set({ allocations }),

  clearData: () => set({
    predictions: [],
    optimizationResult: null
  })
}));
