import { createSignal } from 'solid-js';
import type { Alert } from '../../core/types';

export function createAlertStore() {
  const [alerts, setAlerts] = createSignal<Alert[]>([]);

  const addAlert = (message: string, type: Alert['type'] = 'info') => {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      timestamp: Date.now(),
    };
    setAlerts(prev => [alert, ...prev.slice(-49)]);
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  return {
    alerts,
    addAlert,
    removeAlert,
    clearAlerts,
  };
}

export type AlertStore = ReturnType<typeof createAlertStore>;
