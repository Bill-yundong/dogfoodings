import { createStore } from 'solid-js/store';
import type { User, Simulation, Mold, ParameterSet } from '../types';

interface AppState {
  currentUser: User | null;
  dbReady: boolean;
  currentSimulation: Simulation | null;
  currentMold: Mold | null;
  currentParameters: ParameterSet | null;
  isSimulating: boolean;
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
}

const initialState: AppState = {
  currentUser: {
    id: 'user-001',
    name: '张工程师',
    role: 'process_engineer',
    email: 'zhang@moldnexus.com',
    createdAt: Date.now(),
  },
  dbReady: false,
  currentSimulation: null,
  currentMold: null,
  currentParameters: null,
  isSimulating: false,
  sidebarCollapsed: false,
  theme: 'dark',
};

const [state, setState] = createStore<AppState>(initialState);

export function useAppStore() {
  return {
    state,
    setState,
    setDbReady: (ready: boolean) => setState('dbReady', ready),
    setCurrentSimulation: (sim: Simulation | null) => setState('currentSimulation', sim),
    setCurrentMold: (mold: Mold | null) => setState('currentMold', mold),
    setCurrentParameters: (params: ParameterSet | null) => setState('currentParameters', params),
    setIsSimulating: (simulating: boolean) => setState('isSimulating', simulating),
    toggleSidebar: () => setState('sidebarCollapsed', !state.sidebarCollapsed),
    setTheme: (theme: 'dark' | 'light') => setState('theme', theme),
  };
}
