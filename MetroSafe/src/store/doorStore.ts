import { createStore, produce } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { DoorStatus, FaultSignal, CycleData } from '../types';
import { DoorState, FaultType, SemanticLevel } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export interface DoorStore {
  doors: Map<string, DoorStatus>;
  faultSignals: FaultSignal[];
  cycleCount: number;
  isSimulationRunning: boolean;
}

const initialDoors = new Map<string, DoorStatus>();
['PSD-01', 'PSD-02', 'PSD-03', 'PSD-04', 'PSD-05', 'PSD-06'].forEach(id => {
  initialDoors.set(id, {
    doorId: id,
    state: DoorState.CLOSED,
    position: 0,
    speed: 0,
    motorCurrent: 0,
    timestamp: Date.now()
  });
});

const [store, setStore] = createStore<DoorStore>({
  doors: initialDoors,
  faultSignals: [],
  cycleCount: 0,
  isSimulationRunning: false
});

const [maintenanceSynced, setMaintenanceSynced] = createSignal<Map<string, boolean>>(new Map());
const [controlSynced, setControlSynced] = createSignal<Map<string, boolean>>(new Map());

export const doorStore = store;
export const maintenanceSyncStatus = maintenanceSynced;
export const controlSyncStatus = controlSynced;

export const updateDoorStatus = (doorId: string, updates: Partial<DoorStatus>) => {
  setStore('doors', produce(doors => {
    const existing = doors.get(doorId);
    if (existing) {
      doors.set(doorId, { ...existing, ...updates, timestamp: Date.now() });
    }
  }));
};

export const addFaultSignal = (fault: Omit<FaultSignal, 'id' | 'timestamp' | 'acknowledged'>) => {
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
  
  syncFaultSignal(newFault);
};

export const acknowledgeFault = (faultId: string) => {
  setStore('faultSignals', produce(signals => {
    const fault = signals.find(f => f.id === faultId);
    if (fault) {
      fault.acknowledged = true;
    }
  }));
};

export const clearFaults = () => {
  setStore('faultSignals', []);
};

export const incrementCycleCount = () => {
  setStore('cycleCount', c => c + 1);
};

export const setSimulationRunning = (running: boolean) => {
  setStore('isSimulationRunning', running);
};

const syncFaultSignal = async (fault: FaultSignal) => {
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
  setMaintenanceSynced(produce(map => {
    map.set(fault.id, true);
  }));
  
  await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
  setControlSynced(produce(map => {
    map.set(fault.id, true);
  }));
};

export const getDoorArray = () => Array.from(store.doors.values());
