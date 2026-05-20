import { create } from 'zustand';
import type { PressureStation, PressureData, Command, Alert, Snapshot, User, SystemSettings } from '@/types';
import { mockStations, generateInitialPressureData, generateInitialFlowData, generateMockAlerts, generateMockCommands, mockUser, defaultSettings } from '@/lib/mockData';
import { calculateNetworkStorage } from '@/lib/flowModel';
import { mockPipeSegments } from '@/lib/mockData';

interface GasMatrixState {
  user: User | null;
  stations: PressureStation[];
  pressureData: Record<string, number>;
  flowData: Record<string, number>;
  temperatureData: Record<string, number>;
  commands: Command[];
  alerts: Alert[];
  snapshots: Snapshot[];
  settings: SystemSettings;
  isConnected: boolean;
  lastUpdate: number;
  totalStorage: number;

  setUser: (user: User | null) => void;
  logout: () => void;
  updatePressureData: (data: PressureData) => void;
  addCommand: (command: Command) => void;
  updateCommandStatus: (commandId: string, status: Command['status']) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (alertId: string, userName: string) => void;
  addSnapshot: (snapshot: Snapshot) => void;
  updateSettings: (settings: Partial<SystemSettings>) => void;
  setConnected: (connected: boolean) => void;
  calculateTotalStorage: () => void;
  getStationById: (id: string) => PressureStation | undefined;
  getUnacknowledgedAlerts: () => Alert[];
  getCommandsByStatus: (status: Command['status']) => Command[];
}

export const useGasMatrixStore = create<GasMatrixState>((set, get) => ({
  user: null,
  stations: mockStations,
  pressureData: generateInitialPressureData(),
  flowData: generateInitialFlowData(),
  temperatureData: {},
  commands: generateMockCommands(),
  alerts: generateMockAlerts(),
  snapshots: [],
  settings: defaultSettings,
  isConnected: false,
  lastUpdate: Date.now(),
  totalStorage: 55000,

  setUser: (user) => set({ user }),
  
  logout: () => set({ user: null }),

  updatePressureData: (data) =>
    set((state) => {
      const station = state.stations.find((s) => s.id === data.stationId);
      let stationStatus: PressureStation['status'] = 'online';
      
      if (station) {
        if (data.pressure < station.minPressure || data.pressure > station.maxPressure) {
          stationStatus = 'danger';
        } else if (data.pressure < station.minPressure * 1.05 || data.pressure > station.maxPressure * 0.95) {
          stationStatus = 'warning';
        }
      }

      return {
        pressureData: {
          ...state.pressureData,
          [data.stationId]: data.pressure,
        },
        flowData: {
          ...state.flowData,
          [data.stationId]: data.flowRate,
        },
        temperatureData: {
          ...state.temperatureData,
          [data.stationId]: data.temperature,
        },
        stations: state.stations.map((s) =>
          s.id === data.stationId ? { ...s, status: stationStatus, lastUpdate: data.timestamp } : s
        ),
        lastUpdate: data.timestamp,
      };
    }),

  addCommand: (command) =>
    set((state) => ({
      commands: [command, ...state.commands],
    })),

  updateCommandStatus: (commandId, status) =>
    set((state) => ({
      commands: state.commands.map((c) =>
        c.id === commandId
          ? {
              ...c,
              status,
              executedAt: status === 'executing' ? Date.now() : c.executedAt,
              completedAt: status === 'completed' ? Date.now() : c.completedAt,
            }
          : c
      ),
    })),

  addAlert: (alert) =>
    set((state) => {
      const exists = state.alerts.some(
        (a) => a.stationId === alert.stationId && a.type === alert.type && !a.acknowledged
      );
      if (exists) return state;
      return {
        alerts: [alert, ...state.alerts].slice(0, 100),
      };
    }),

  acknowledgeAlert: (alertId, userName) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId
          ? { ...a, acknowledged: true, acknowledgedAt: Date.now(), acknowledgedBy: userName }
          : a
      ),
    })),

  addSnapshot: (snapshot) =>
    set((state) => ({
      snapshots: [snapshot, ...state.snapshots].slice(0, 1000),
    })),

  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  setConnected: (connected) => set({ isConnected: connected }),

  calculateTotalStorage: () => {
    const { stations, pressureData } = get();
    const totalStorage = calculateNetworkStorage(stations, mockPipeSegments, pressureData);
    set({ totalStorage: Math.round(totalStorage) });
  },

  getStationById: (id) => get().stations.find((s) => s.id === id),

  getUnacknowledgedAlerts: () => get().alerts.filter((a) => !a.acknowledged),

  getCommandsByStatus: (status) => get().commands.filter((c) => c.status === status),
}));
