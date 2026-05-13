import { createSignal } from 'solid-js';
import type { Alert, AlertType } from '../@types';
import { generateId } from '../lib/utils/traffic';

export function createAlertStore() {
  const [alerts, setAlerts] = createSignal<Alert[]>([]);

  const addAlert = (message: string, type: AlertType = 'info') => {
    const alert: Alert = {
      id: generateId('alert'),
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
