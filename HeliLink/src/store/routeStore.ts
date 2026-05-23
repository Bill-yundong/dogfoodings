import { create } from 'zustand';
import type { LandingWindow, RoutePlan, DWAParams, PlatformMetadata } from '@/types';
import { defaultDWAParams } from '@/types';
import { DWASolver } from '@/services/dwaEngine';
import { api } from '@/services/api';

interface RouteState {
  dwaParams: DWAParams;
  landingWindows: LandingWindow[];
  routePlans: RoutePlan[];
  selectedRouteId: string | null;
  originPlatformId: string;
  destinationPlatformId: string;
  isCalculating: boolean;
  isPlanning: boolean;
  error: string | null;

  setDWAParams: (params: Partial<DWAParams>) => void;
  calculateLandingWindows: (platform: PlatformMetadata) => Promise<void>;
  setOrigin: (id: string) => void;
  setDestination: (id: string) => void;
  planRoutes: () => Promise<void>;
  selectRoute: (id: string | null) => void;
  reset: () => void;
}

export const useRouteStore = create<RouteState>((set, get) => ({
  dwaParams: { ...defaultDWAParams },
  landingWindows: [],
  routePlans: [],
  selectedRouteId: null,
  originPlatformId: 'plat-006',
  destinationPlatformId: 'plat-001',
  isCalculating: false,
  isPlanning: false,
  error: null,

  setDWAParams: (params: Partial<DWAParams>) => {
    set(state => ({
      dwaParams: { ...state.dwaParams, ...params },
    }));
  },

  calculateLandingWindows: async (platform: PlatformMetadata) => {
    set({ isCalculating: true, error: null });
    try {
      const solver = new DWASolver(get().dwaParams);
      const windows = await solver.solveForPlatform(platform.id, platform);
      set({ landingWindows: windows, isCalculating: false });
    } catch (e) {
      set({ error: '计算着陆窗口失败', isCalculating: false });
      console.error(e);
    }
  },

  setOrigin: (id: string) => set({ originPlatformId: id }),

  setDestination: (id: string) => set({ destinationPlatformId: id }),

  planRoutes: async () => {
    const { originPlatformId, destinationPlatformId, dwaParams } = get();
    if (!originPlatformId || !destinationPlatformId) return;

    set({ isPlanning: true, error: null });
    try {
      const routes = await api.planRoute(originPlatformId, destinationPlatformId, dwaParams);
      set({
        routePlans: routes,
        selectedRouteId: routes.find(r => r.isRecommended)?.id || routes[0]?.id || null,
        isPlanning: false,
      });
    } catch (e) {
      set({ error: '航线规划失败', isPlanning: false });
      console.error(e);
    }
  },

  selectRoute: (id: string | null) => set({ selectedRouteId: id }),

  reset: () => {
    set({
      landingWindows: [],
      routePlans: [],
      selectedRouteId: null,
      error: null,
    });
  },
}));
