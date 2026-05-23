'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ViewMode = 'list' | 'grid' | 'map';
type ThemeMode = 'light' | 'dark' | 'system';
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface UIState {
  viewMode: ViewMode;
  themeMode: ThemeMode;
  sidebarOpen: boolean;
  mapVisible: boolean;
  showOptimizationPanel: boolean;
  showSyncStatus: boolean;
  toasts: Toast[];
  activeTab: string;
  
  setViewMode: (mode: ViewMode) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMapVisible: () => void;
  setMapVisible: (visible: boolean) => void;
  toggleOptimizationPanel: () => void;
  setShowOptimizationPanel: (show: boolean) => void;
  setShowSyncStatus: (show: boolean) => void;
  setActiveTab: (tab: string) => void;
  
  showToast: (type: ToastType, message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  
  reset: () => void;
}

const initialState = {
  viewMode: 'list' as ViewMode,
  themeMode: 'system' as ThemeMode,
  sidebarOpen: true,
  mapVisible: true,
  showOptimizationPanel: false,
  showSyncStatus: true,
  toasts: [],
  activeTab: 'trips',
};

const applyTheme = (mode: ThemeMode) => {
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else if (mode === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setViewMode: (mode) => set({ viewMode: mode }),
      setThemeMode: (mode) => {
        set({ themeMode: mode });
        applyTheme(mode);
        if (typeof window !== 'undefined') {
          localStorage.setItem('trip-nexus-theme', mode);
        }
      },
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleMapVisible: () => set((state) => ({ mapVisible: !state.mapVisible })),
      setMapVisible: (visible) => set({ mapVisible: visible }),
      toggleOptimizationPanel: () => set((state) => ({ showOptimizationPanel: !state.showOptimizationPanel })),
      setShowOptimizationPanel: (show) => set({ showOptimizationPanel: show }),
      setShowSyncStatus: (show) => set({ showSyncStatus: show }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      showToast: (type, message, duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        const toast: Toast = { id, type, message, duration };
        
        set((state) => ({
          toasts: [...state.toasts, toast],
        }));

        if (duration > 0) {
          setTimeout(() => {
            get().dismissToast(id);
          }, duration);
        }
      },

      dismissToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      clearToasts: () => set({ toasts: [] }),

      reset: () => set(initialState),
    }),
    {
      name: 'trip-nexus-ui-store',
      partialize: (state) => ({
        themeMode: state.themeMode,
        viewMode: state.viewMode,
        sidebarOpen: state.sidebarOpen,
        activeTab: state.activeTab,
      }),
      onRehydrateStorage: () => (state) => {
        if (typeof window !== 'undefined') {
          const savedTheme = localStorage.getItem('trip-nexus-theme') as ThemeMode | null;
          const themeToApply = savedTheme || state?.themeMode || 'system';
          applyTheme(themeToApply);
          if (state) {
            state.themeMode = themeToApply;
          }
        }
      },
    }
  )
);
