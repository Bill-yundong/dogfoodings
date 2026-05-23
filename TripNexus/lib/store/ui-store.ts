'use client';

import { create } from 'zustand';

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

export const useUIStore = create<UIState>((set, get) => ({
  ...initialState,

  setViewMode: (mode) => set({ viewMode: mode }),
  setThemeMode: (mode) => {
    set({ themeMode: mode });
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
}));
