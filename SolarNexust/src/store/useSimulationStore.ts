import { create } from 'zustand';
import type {
  SolarPanel,
  Building,
  Region,
  RayTracingResult,
  PowerGeneration,
  SimulationConfig,
  SolarPosition,
} from '@/types/solar';
import type { SimulationState } from '@/types/simulation';

interface SimulationStore {
  regions: Region[];
  currentRegionId: string | null;
  panels: SolarPanel[];
  buildings: Building[];
  rayTracingResults: RayTracingResult[];
  powerGenerations: PowerGeneration[];
  solarPosition: SolarPosition | null;
  simulationState: SimulationState;
  config: SimulationConfig;
  selectedPanelId: string | null;
  isWorkerReady: boolean;
  lastTraceDuration: number;
  
  setRegions: (regions: Region[]) => void;
  setCurrentRegionId: (id: string | null) => void;
  setPanels: (panels: SolarPanel[]) => void;
  setBuildings: (buildings: Building[]) => void;
  setRayTracingResults: (results: RayTracingResult[]) => void;
  setPowerGenerations: (generations: PowerGeneration[]) => void;
  setSolarPosition: (pos: SolarPosition | null) => void;
  setSimulationState: (state: Partial<SimulationState>) => void;
  setConfig: (config: Partial<SimulationConfig>) => void;
  setSelectedPanelId: (id: string | null) => void;
  setIsWorkerReady: (ready: boolean) => void;
  setLastTraceDuration: (duration: number) => void;
  
  toggleSimulation: () => void;
  togglePause: () => void;
  resetSimulation: () => void;
  addPanel: (panel: SolarPanel) => void;
  removePanel: (id: string) => void;
  addBuilding: (building: Building) => void;
  removeBuilding: (id: string) => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  regions: [],
  currentRegionId: null,
  panels: [],
  buildings: [],
  rayTracingResults: [],
  powerGenerations: [],
  solarPosition: null,
  simulationState: {
    isRunning: false,
    isPaused: false,
    currentTime: Date.now(),
    speed: 1,
    quality: 'medium',
    showWireframe: false,
    showShadows: true,
    autoRotate: false,
  },
  config: {
    latitude: 31.2304,
    longitude: 121.4737,
    startTime: Date.now(),
    endTime: Date.now() + 24 * 60 * 60 * 1000,
    timeStep: 60000,
    rayCount: 100,
    ambientTemperature: 25,
  },
  selectedPanelId: null,
  isWorkerReady: false,
  lastTraceDuration: 0,
  
  setRegions: (regions) => set({ regions }),
  setCurrentRegionId: (id) => set({ currentRegionId: id }),
  setPanels: (panels) => set({ panels }),
  setBuildings: (buildings) => set({ buildings }),
  setRayTracingResults: (results) => set({ rayTracingResults: results }),
  setPowerGenerations: (generations) => set({ powerGenerations: generations }),
  setSolarPosition: (pos) => set({ solarPosition: pos }),
  setSimulationState: (state) =>
    set((prev) => ({ simulationState: { ...prev.simulationState, ...state } })),
  setConfig: (config) => set((prev) => ({ config: { ...prev.config, ...config } })),
  setSelectedPanelId: (id) => set({ selectedPanelId: id }),
  setIsWorkerReady: (ready) => set({ isWorkerReady: ready }),
  setLastTraceDuration: (duration) => set({ lastTraceDuration: duration }),
  
  toggleSimulation: () =>
    set((prev) => ({
      simulationState: {
        ...prev.simulationState,
        isRunning: !prev.simulationState.isRunning,
        isPaused: false,
      },
    })),
  togglePause: () =>
    set((prev) => ({
      simulationState: {
        ...prev.simulationState,
        isPaused: !prev.simulationState.isPaused,
      },
    })),
  resetSimulation: () =>
    set((prev) => ({
      simulationState: {
        ...prev.simulationState,
        isRunning: false,
        isPaused: false,
        currentTime: Date.now(),
      },
      rayTracingResults: [],
      powerGenerations: [],
    })),
  addPanel: (panel) => set((prev) => ({ panels: [...prev.panels, panel] })),
  removePanel: (id) => set((prev) => ({ panels: prev.panels.filter((p) => p.id !== id) })),
  addBuilding: (building) => set((prev) => ({ buildings: [...prev.buildings, building] })),
  removeBuilding: (id) => set((prev) => ({ buildings: prev.buildings.filter((b) => b.id !== id) })),
}));
