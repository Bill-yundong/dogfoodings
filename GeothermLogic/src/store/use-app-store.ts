import { create } from 'zustand';
import type { Borehole, SystemStats, HealthStatus, SemanticMapping } from '@/types';
import { generateSystemStats, generateHealthStatus, generateSemanticMappings } from '@/lib/mock-data';

interface AppState {
  systemStats: SystemStats;
  healthStatuses: HealthStatus[];
  semanticMappings: SemanticMapping[];
  boreholes: Borehole[];
  selectedBorehole: Borehole | null;
  isLoading: boolean;
  dbInitialized: boolean;
  setSystemStats: (stats: SystemStats) => void;
  setHealthStatuses: (statuses: HealthStatus[]) => void;
  setSemanticMappings: (mappings: SemanticMapping[]) => void;
  setBoreholes: (boreholes: Borehole[]) => void;
  setSelectedBorehole: (borehole: Borehole | null) => void;
  setIsLoading: (loading: boolean) => void;
  setDbInitialized: (initialized: boolean) => void;
  refreshSystemStats: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  systemStats: generateSystemStats(),
  healthStatuses: generateHealthStatus(),
  semanticMappings: generateSemanticMappings(),
  boreholes: [],
  selectedBorehole: null,
  isLoading: false,
  dbInitialized: false,
  setSystemStats: (stats) => set({ systemStats: stats }),
  setHealthStatuses: (statuses) => set({ healthStatuses: statuses }),
  setSemanticMappings: (mappings) => set({ semanticMappings: mappings }),
  setBoreholes: (boreholes) => set({ boreholes }),
  setSelectedBorehole: (borehole) => set({ selectedBorehole: borehole }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setDbInitialized: (initialized) => set({ dbInitialized: initialized }),
  refreshSystemStats: () => set({ systemStats: generateSystemStats() }),
}));
