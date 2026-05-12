import { createStore, produce } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { Door, DoorStatus, FaultSignal, CycleStats, DoorState } from '../../core/domain';
import { createDoor, DoorState as DoorStateEnum } from '../../core/domain';
import { DOOR_IDS } from '../../core/constants/app.constants';
import { semanticSynchronizer } from '../../application/services/SemanticSynchronizer';
import { faultChainSimulator } from '../../application/services/FaultChainSimulator';
import type { SyncStatus } from '../../application/services/SemanticSynchronizer';

const generateId = () => Math.random().toString(36).substr(2, 9);

export interface AppState {
  doors: Map<string, Door>;
  faultSignals: FaultSignal[];
  cycleCount: number;
  isSimulationRunning: boolean;
  isInitialized: boolean;
  cycleStats: CycleStats | null;
}

const initialDoors = new Map<string, Door>();
Array.from(DOOR_IDS).forEach(id => {
  initialDoors.set(id, createDoor(id));
});

const [store, setStore] = createStore<AppState>({
  doors: initialDoors,
  faultSignals: [],
  cycleCount: 0,
  isSimulationRunning: false,
  isInitialized: false,
  cycleStats: null
});

const [syncStats, setSyncStats] = createSignal<{
  maintenance: SyncStatus;
  operation: SyncStatus;
  totalSynced: number;
}>(semanticSynchronizer.getStats());

const [chainStates, setChainStates] = createSignal(faultChainSimulator.getAllChainStates());

export const appState = store;
export const getSyncStats = syncStats;
export const getChainStates = chainStates;

export const actions = {
  initialize(): void {
    faultChainSimulator.setFaultCallback((fault) => {
      actions.addFaultSignal(fault);
    });

    semanticSynchronizer.onStatusChange(() => {
      setSyncStats(semanticSynchronizer.getStats());
    });

    setStore('isInitialized', true);
  },

  updateDoorStatus(doorId: string, updates: Partial<Door>): void {
    setStore('doors', produce(doors => {
      const existing = doors.get(doorId);
      if (existing) {
        doors.set(doorId, { ...existing, ...updates, lastUpdated: Date.now() });
      }
    }));
  },

  updateDoorState(doorId: string, state: DoorState): void {
    setStore('doors', produce(doors => {
      const existing = doors.get(doorId);
      if (existing) {
        doors.set(doorId, {
          ...existing,
          state,
          position: state === DoorStateEnum.OPEN ? 100 : state === DoorStateEnum.CLOSED ? 0 : existing.position,
          lastUpdated: Date.now()
        });
      }
    }));
  },

  async addFaultSignal(fault: Omit<FaultSignal, 'id' | 'timestamp' | 'acknowledged'>): Promise<void> {
    const newFault: FaultSignal = {
      ...fault,
      id: generateId(),
      timestamp: Date.now(),
      acknowledged: false
    };
    
    setStore('faultSignals', produce(signals => {
      signals.unshift(newFault);
      if (signals.length > 100) signals.pop();
    }));

    await semanticSynchronizer.syncSignal(newFault);
  },

  acknowledgeFault(faultId: string): void {
    setStore('faultSignals', produce(signals => {
      const fault = signals.find(f => f.id === faultId);
      if (fault) {
        fault.acknowledged = true;
      }
    }));
  },

  clearFaults(): void {
    setStore('faultSignals', []);
  },

  incrementCycleCount(): void {
    setStore('cycleCount', c => c + 1);
  },

  setCycleStats(stats: CycleStats): void {
    setStore('cycleStats', stats);
  },

  startSimulation(): void {
    faultChainSimulator.startSimulation(3000);
    setStore('isSimulationRunning', true);
  },

  stopSimulation(): void {
    faultChainSimulator.stopSimulation();
    setStore('isSimulationRunning', false);
  },

  toggleSimulation(): void {
    if (store.isSimulationRunning) {
      actions.stopSimulation();
    } else {
      actions.startSimulation();
    }
  },

  triggerFault(chainId: string, gateId: string): void {
    faultChainSimulator.triggerFault(chainId, gateId);
    actions.refreshChainStates();
  },

  triggerRandomFault(): void {
    faultChainSimulator.triggerRandomFault();
    actions.refreshChainStates();
  },

  resetAllChains(): void {
    faultChainSimulator.resetAll();
    actions.refreshChainStates();
  },

  refreshChainStates(): void {
    setChainStates(faultChainSimulator.getAllChainStates());
  },

  isSignalSynced(signalId: string, module: 'maintenance' | 'operation_control'): boolean {
    return semanticSynchronizer.isSignalSynced(signalId, module);
  },

  getDoorArray(): Door[] {
    return Array.from(store.doors.values());
  },

  convertToDoorStatus(door: Door): DoorStatus {
    return {
      doorId: door.id,
      state: door.state,
      position: door.position,
      speed: door.speed,
      motorCurrent: door.motorCurrent,
      timestamp: door.lastUpdated
    };
  }
};
