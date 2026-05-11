import { createStore, produce } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { DoorStatus, FaultSignal } from '../core/types';
import { DoorState, DOOR_IDS } from '../core/constants';
import { semanticSynchronizer } from '../domain/services/SemanticSynchronizer';
import { faultChainSimulator } from '../domain/services/FaultChainSimulator';

const generateId = () => Math.random().toString(36).substr(2, 9);

export interface AppState {
  doors: Map<string, DoorStatus>;
  faultSignals: FaultSignal[];
  cycleCount: number;
  isSimulationRunning: boolean;
  isInitialized: boolean;
}

const initialDoors = new Map<string, DoorStatus>();
Array.from(DOOR_IDS).forEach(id => {
  initialDoors.set(id, {
    doorId: id,
    state: DoorState.CLOSED,
    position: 0,
    speed: 0,
    motorCurrent: 0,
    timestamp: Date.now()
  });
});

const [store, setStore] = createStore<AppState>({
  doors: initialDoors,
  faultSignals: [],
  cycleCount: 0,
  isSimulationRunning: false,
  isInitialized: false
});

const [syncStats, setSyncStats] = createSignal(semanticSynchronizer.getStats());
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

  updateDoorStatus(doorId: string, updates: Partial<DoorStatus>): void {
    setStore('doors', produce(doors => {
      const existing = doors.get(doorId);
      if (existing) {
        doors.set(doorId, { ...existing, ...updates, timestamp: Date.now() });
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
    setChainStates(faultChainSimulator.getAllChainStates());
  },

  triggerRandomFault(): void {
    faultChainSimulator.triggerRandomFault();
    setChainStates(faultChainSimulator.getAllChainStates());
  },

  resetAllChains(): void {
    faultChainSimulator.resetAll();
    setChainStates(faultChainSimulator.getAllChainStates());
  },

  refreshChainStates(): void {
    setChainStates(faultChainSimulator.getAllChainStates());
  },

  isSignalSynced(signalId: string, module: 'maintenance' | 'operation_control'): boolean {
    return semanticSynchronizer.isSignalSynced(signalId, module);
  },

  getDoorArray(): DoorStatus[] {
    return Array.from(store.doors.values());
  }
};
