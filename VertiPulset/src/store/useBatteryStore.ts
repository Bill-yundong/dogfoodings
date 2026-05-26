import { create } from 'zustand';
import type { Battery, BatterySnapshot, BatteryHealthPrediction, BatteryAlert } from '@/types';
import { dbOperations } from '@/db/operations';

interface BatteryState {
  batteries: Battery[];
  snapshots: BatterySnapshot[];
  healthPredictions: BatteryHealthPrediction[];
  alerts: BatteryAlert[];
  isLoading: boolean;
  selectedBattery: Battery | null;
  setBatteries: (batteries: Battery[]) => void;
  setSnapshots: (snapshots: BatterySnapshot[]) => void;
  setHealthPredictions: (predictions: BatteryHealthPrediction[]) => void;
  setAlerts: (alerts: BatteryAlert[]) => void;
  setSelectedBattery: (battery: Battery | null) => void;
  loadSnapshots: (batteryId: string, limit?: number) => Promise<void>;
  addSnapshot: (snapshot: BatterySnapshot) => Promise<void>;
  generateHealthPrediction: (battery: Battery) => void;
}

export const useBatteryStore = create<BatteryState>((set, get) => ({
  batteries: [],
  snapshots: [],
  healthPredictions: [],
  alerts: [],
  isLoading: false,
  selectedBattery: null,

  setBatteries: (batteries) => set({ batteries }),
  setSnapshots: (snapshots) => set({ snapshots }),
  setHealthPredictions: (predictions) => set({ healthPredictions: predictions }),
  setAlerts: (alerts) => set({ alerts }),
  setSelectedBattery: (battery) => set({ selectedBattery: battery }),

  loadSnapshots: async (batteryId, limit = 1000) => {
    set({ isLoading: true });
    try {
      const snapshots = await dbOperations.getBatterySnapshotsByBattery(batteryId, limit);
      set({ snapshots, isLoading: false });
    } catch (error) {
      console.error('Failed to load snapshots:', error);
      set({ isLoading: false });
    }
  },

  addSnapshot: async (snapshot) => {
    try {
      await dbOperations.addBatterySnapshot(snapshot);
      set((state) => ({
        snapshots: [snapshot, ...state.snapshots].slice(0, 10000),
      }));
    } catch (error) {
      console.error('Failed to add snapshot:', error);
    }
  },

  generateHealthPrediction: (battery) => {
    const { snapshots } = get();
    const batterySnapshots = snapshots.filter((s) => s.batteryId === battery.id);
  },
}));
