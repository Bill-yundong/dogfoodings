import { create } from "zustand";
import type { 
  Station, 
  CrowdPressure, 
  TrainSchedule, 
  CapacityPrediction, 
  TrafficSnapshot,
  SyncMessage 
} from "@/types";

interface SubwayState {
  stations: Station[];
  selectedStationId: string | null;
  crowdPressures: Map<string, CrowdPressure>;
  trainSchedules: Map<string, TrainSchedule[]>;
  capacityPredictions: Map<string, CapacityPrediction>;
  recentSnapshots: TrafficSnapshot[];
  isSyncing: boolean;
  lastSyncTime: number | null;
  
  setStations: (stations: Station[]) => void;
  selectStation: (stationId: string) => void;
  updateCrowdPressure: (pressure: CrowdPressure) => void;
  updateTrainSchedules: (stationId: string, schedules: TrainSchedule[]) => void;
  updateCapacityPrediction: (prediction: CapacityPrediction) => void;
  addSnapshot: (snapshot: TrafficSnapshot) => void;
  setSyncing: (syncing: boolean) => void;
  syncFromMessage: (message: SyncMessage) => void;
  getSelectedStation: () => Station | null;
  getSelectedCrowdPressure: () => CrowdPressure | null;
  getSelectedTrainSchedules: () => TrainSchedule[];
  getSelectedCapacityPrediction: () => CapacityPrediction | null;
}

export const useSubwayStore = create<SubwayState>((set, get) => ({
  stations: [],
  selectedStationId: null,
  crowdPressures: new Map(),
  trainSchedules: new Map(),
  capacityPredictions: new Map(),
  recentSnapshots: [],
  isSyncing: false,
  lastSyncTime: null,
  
  setStations: (stations) => set({ stations }),
  
  selectStation: (stationId) => set({ selectedStationId: stationId }),
  
  updateCrowdPressure: (pressure) => {
    const newPressures = new Map(get().crowdPressures);
    newPressures.set(pressure.stationId, pressure);
    set({ crowdPressures: newPressures });
  },
  
  updateTrainSchedules: (stationId, schedules) => {
    const newSchedules = new Map(get().trainSchedules);
    newSchedules.set(stationId, schedules);
    set({ trainSchedules: newSchedules });
  },
  
  updateCapacityPrediction: (prediction) => {
    const newPredictions = new Map(get().capacityPredictions);
    newPredictions.set(prediction.stationId, prediction);
    set({ capacityPredictions: newPredictions });
  },
  
  addSnapshot: (snapshot) => {
    const snapshots = [...get().recentSnapshots, snapshot];
    if (snapshots.length > 100) {
      snapshots.shift();
    }
    set({ recentSnapshots: snapshots });
  },
  
  setSyncing: (syncing) => set({ isSyncing: syncing, lastSyncTime: Date.now() }),
  
  syncFromMessage: (message) => {
    set({ isSyncing: true, lastSyncTime: Date.now() });
    
    switch (message.type) {
      case "crowd-pressure":
        get().updateCrowdPressure(message.data as CrowdPressure);
        break;
      case "train-schedule":
        const schedules = message.data as TrainSchedule[];
        if (schedules.length > 0) {
          get().updateTrainSchedules(schedules[0].stationId, schedules);
        }
        break;
      case "capacity-prediction":
        get().updateCapacityPrediction(message.data as CapacityPrediction);
        break;
      case "snapshot":
        get().addSnapshot(message.data as TrafficSnapshot);
        break;
    }
    
    set({ isSyncing: false });
  },
  
  getSelectedStation: () => {
    const { stations, selectedStationId } = get();
    return stations.find(s => s.id === selectedStationId) || null;
  },
  
  getSelectedCrowdPressure: () => {
    const { crowdPressures, selectedStationId } = get();
    return selectedStationId ? crowdPressures.get(selectedStationId) || null : null;
  },
  
  getSelectedTrainSchedules: () => {
    const { trainSchedules, selectedStationId } = get();
    return selectedStationId ? trainSchedules.get(selectedStationId) || [] : [];
  },
  
  getSelectedCapacityPrediction: () => {
    const { capacityPredictions, selectedStationId } = get();
    return selectedStationId ? capacityPredictions.get(selectedStationId) || null : null;
  },
}));
