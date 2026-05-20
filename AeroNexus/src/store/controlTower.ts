import { create } from 'zustand';
import type { 
  EquipmentState, DispatchCommand, ConflictAlert, NetworkStatus, SystemSnapshot, GateInfo, FlightInfo 
} from '@/types';

interface ControlTowerState {
  equipmentStates: Map<string, EquipmentState>;
  commands: Map<string, DispatchCommand>;
  alerts: Map<string, ConflictAlert>;
  gates: Map<string, GateInfo>;
  flights: Map<string, FlightInfo>;
  networkStatus: NetworkStatus;
  lastUpdateTime: number;
  isSimulationRunning: boolean;
  selectedEquipmentId: string | null;
  selectedCommandId: string | null;
  viewMode: '2d' | '3d';
  showTrails: boolean;
  showLabels: boolean;
  autoRefresh: boolean;
  simulationSpeed: number;
  fps: number;
  latency: number;
  pendingSyncCount: number;
  lastSyncTime: number;
  setEquipmentStates: (states: EquipmentState[]) => void;
  updateEquipmentState: (state: EquipmentState) => void;
  removeEquipmentState: (id: string) => void;
  addCommand: (command: DispatchCommand) => void;
  updateCommand: (command: DispatchCommand) => void;
  removeCommand: (id: string) => void;
  addAlert: (alert: ConflictAlert) => void;
  acknowledgeAlert: (id: string) => void;
  resolveAlert: (id: string) => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  selectEquipment: (id: string | null) => void;
  selectCommand: (id: string | null) => void;
  setViewMode: (mode: '2d' | '3d') => void;
  toggleTrails: () => void;
  toggleLabels: () => void;
  toggleAutoRefresh: () => void;
  setSimulationSpeed: (speed: number) => void;
  setSimulationRunning: (running: boolean) => void;
  updatePerformance: (fps: number, latency: number) => void;
  updateSyncStatus: (pendingCount: number, lastSyncTime: number) => void;
  loadSnapshot: (snapshot: SystemSnapshot) => void;
  clearAll: () => void;
}

export const useControlTowerStore = create<ControlTowerState>((set) => ({
  equipmentStates: new Map(),
  commands: new Map(),
  alerts: new Map(),
  gates: new Map(),
  flights: new Map(),
  networkStatus: 'online',
  lastUpdateTime: Date.now(),
  isSimulationRunning: true,
  selectedEquipmentId: null,
  selectedCommandId: null,
  viewMode: '2d',
  showTrails: true,
  showLabels: true,
  autoRefresh: true,
  simulationSpeed: 1,
  fps: 60,
  latency: 0,
  pendingSyncCount: 0,
  lastSyncTime: Date.now(),

  setEquipmentStates: (states) =>
    set(() => {
      const map = new Map<string, EquipmentState>();
      states.forEach((s) => map.set(s.id, s));
      return { equipmentStates: map, lastUpdateTime: Date.now() };
    }),

  updateEquipmentState: (state) =>
    set((prev) => {
      const newMap = new Map(prev.equipmentStates);
      newMap.set(state.id, state);
      return { equipmentStates: newMap, lastUpdateTime: Date.now() };
    }),

  removeEquipmentState: (id) =>
    set((prev) => {
      const newMap = new Map(prev.equipmentStates);
      newMap.delete(id);
      return { equipmentStates: newMap };
    }),

  addCommand: (command) =>
    set((prev) => {
      const newMap = new Map(prev.commands);
      newMap.set(command.id, command);
      return { commands: newMap };
    }),

  updateCommand: (command) =>
    set((prev) => {
      const newMap = new Map(prev.commands);
      newMap.set(command.id, command);
      return { commands: newMap };
    }),

  removeCommand: (id) =>
    set((prev) => {
      const newMap = new Map(prev.commands);
      newMap.delete(id);
      return { commands: newMap };
    }),

  addAlert: (alert) =>
    set((prev) => {
      const newMap = new Map(prev.alerts);
      newMap.set(alert.id, alert);
      return { alerts: newMap };
    }),

  acknowledgeAlert: (id) =>
    set((prev) => {
      const newMap = new Map(prev.alerts);
      const alert = newMap.get(id);
      if (alert) {
        newMap.set(id, { ...alert, acknowledged: true });
      }
      return { alerts: newMap };
    }),

  resolveAlert: (id) =>
    set((prev) => {
      const newMap = new Map(prev.alerts);
      const alert = newMap.get(id);
      if (alert) {
        newMap.set(id, { ...alert, resolved: true });
      }
      return { alerts: newMap };
    }),

  setNetworkStatus: (status) => set({ networkStatus: status }),
  selectEquipment: (id) => set({ selectedEquipmentId: id }),
  selectCommand: (id) => set({ selectedCommandId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleTrails: () => set((prev) => ({ showTrails: !prev.showTrails })),
  toggleLabels: () => set((prev) => ({ showLabels: !prev.showLabels })),
  toggleAutoRefresh: () => set((prev) => ({ autoRefresh: !prev.autoRefresh })),
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),
  setSimulationRunning: (running) => set({ isSimulationRunning: running }),

  updatePerformance: (fps, latency) => set({ fps, latency }),

  updateSyncStatus: (pendingCount, lastSyncTime) =>
    set({ pendingSyncCount: pendingCount, lastSyncTime }),

  loadSnapshot: (snapshot) =>
    set(() => {
      const equipmentMap = new Map<string, EquipmentState>();
      snapshot.equipmentStates.forEach((s) => equipmentMap.set(s.id, s));
      
      const commandsMap = new Map<string, DispatchCommand>();
      snapshot.activeCommands.forEach((c) => commandsMap.set(c.id, c));
      
      const alertsMap = new Map<string, ConflictAlert>();
      snapshot.activeAlerts.forEach((a) => alertsMap.set(a.id, a));
      
      return {
        equipmentStates: equipmentMap,
        commands: commandsMap,
        alerts: alertsMap,
        networkStatus: snapshot.networkStatus,
        lastUpdateTime: snapshot.timestamp,
      };
    }),

  clearAll: () =>
    set({
      equipmentStates: new Map(),
      commands: new Map(),
      alerts: new Map(),
      gates: new Map(),
      flights: new Map(),
    }),
}));
