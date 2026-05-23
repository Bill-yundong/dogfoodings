import { create } from 'zustand';
import type { Alert, HelicopterPosition } from '@/types';
import { api } from '@/services/api';
import { mockWebSocket } from '@/services/websocket';

interface AlertState {
  alerts: Alert[];
  helicopterPositions: Record<string, HelicopterPosition>;
  isLoading: boolean;
  unreadCount: number;
  unsubscribeWs?: () => void;

  init: () => Promise<void>;
  loadAlerts: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => void;
  setAlerts: (alerts: Alert[]) => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  helicopterPositions: {},
  isLoading: false,
  unreadCount: 0,

  init: async () => {
    set({ isLoading: true });
    try {
      await get().loadAlerts();
    } finally {
      set({ isLoading: false });
    }
  },

  loadAlerts: async () => {
    try {
      const alerts = await api.getAlerts();
      const unreadCount = alerts.filter(a => !a.acknowledged).length;
      set({ alerts, unreadCount });
    } catch (e) {
      console.error('Failed to load alerts:', e);
    }
  },

  acknowledgeAlert: async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId);
      set(state => ({
        alerts: state.alerts.map(a => (a.id === alertId ? { ...a, acknowledged: true } : a)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (e) {
      console.error('Failed to acknowledge alert:', e);
    }
  },

  addAlert: (alert) => {
    const newAlert: Alert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      acknowledged: false,
    };
    mockWebSocket.sendAlert(newAlert);
    set(state => ({
      alerts: [newAlert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    }));
  },

  setAlerts: (alerts: Alert[]) => {
    const unreadCount = alerts.filter(a => !a.acknowledged).length;
    set({ alerts, unreadCount });
  },

  connectWebSocket: () => {
    if (get().unsubscribeWs) return;

    const unsubscribe = mockWebSocket.subscribe(message => {
      if (message.type === 'alert') {
        const alert = message.data as Alert;
        set(state => ({
          alerts: [alert, ...state.alerts],
          unreadCount: state.unreadCount + (alert.acknowledged ? 0 : 1),
        }));
      }
      if (message.type === 'helicopter') {
        const heli = message.data as HelicopterPosition;
        set(state => ({
          helicopterPositions: {
            ...state.helicopterPositions,
            [heli.id]: heli,
          },
        }));
      }
    });

    set({ unsubscribeWs: unsubscribe });
  },

  disconnectWebSocket: () => {
    get().unsubscribeWs?.();
    set({ unsubscribeWs: undefined });
  },
}));
