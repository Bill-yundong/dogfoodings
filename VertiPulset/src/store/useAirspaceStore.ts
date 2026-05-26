import { create } from 'zustand';
import type { Trajectory4D, Conflict, AirspaceSector, TrafficFlowData } from '@/types';

interface AirspaceState {
  trajectories: Trajectory4D[];
  conflicts: Conflict[];
  sectors: AirspaceSector[];
  flowData: TrafficFlowData[];
  selectedTrajectory: Trajectory4D | null;
  isDetectingConflicts: boolean;
  setTrajectories: (trajectories: Trajectory4D[]) => void;
  setConflicts: (conflicts: Conflict[]) => void;
  setSectors: (sectors: AirspaceSector[]) => void;
  setFlowData: (flowData: TrafficFlowData[]) => void;
  setSelectedTrajectory: (trajectory: Trajectory4D | null) => void;
  addTrajectory: (trajectory: Trajectory4D) => void;
  addConflict: (conflict: Conflict) => void;
  resolveConflict: (conflictId: string) => void;
}

export const useAirspaceStore = create<AirspaceState>((set) => ({
  trajectories: [],
  conflicts: [],
  sectors: [],
  flowData: [],
  selectedTrajectory: null,
  isDetectingConflicts: false,

  setTrajectories: (trajectories) => set({ trajectories }),
  setConflicts: (conflicts) => set({ conflicts }),
  setSectors: (sectors) => set({ sectors }),
  setFlowData: (flowData) => set({ flowData }),
  setSelectedTrajectory: (trajectory) => set({ selectedTrajectory: trajectory }),
  addTrajectory: (trajectory) =>
    set((state) => ({
      trajectories: [...state.trajectories, trajectory],
    })),
  addConflict: (conflict) =>
    set((state) => ({
      conflicts: [...state.conflicts, conflict],
    })),
  resolveConflict: (conflictId) =>
    set((state) => ({
      conflicts: state.conflicts.map((c) =>
        c.id === conflictId ? { ...c, status: 'resolved' } : c
      ),
    })),
}));
