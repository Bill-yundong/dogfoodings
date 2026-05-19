import { writable, get, derived, type Readable, type Writable } from 'svelte/store';
import type { AlertRecord, AlertSeverity, AlertStatus } from '@/types';
import { realtimeStore } from './realtime';
import { insertAlert, getAlerts, updateAlertStatus as dbUpdateAlertStatus } from '@/db/alerts';

export interface AlertStore {
  alerts: Writable<AlertRecord[]>;
  unreadCount: Readable<number>;
  isLoading: Writable<boolean>;
  updateAlertStatus: (alertId: string, status: AlertStatus, acknowledgedBy?: string) => Promise<void>;
  loadMore: (limit?: number) => Promise<void>;
  getAlertsByStatus: (status: AlertStatus) => AlertRecord[];
  getAlertsBySeverity: (severity: AlertSeverity) => AlertRecord[];
  destroy: () => void;
}

function createAlertStore(): AlertStore {
  const alerts = writable<AlertRecord[]>([]);
  const isLoading = writable(false);

  const unreadCount = derived(alerts, $alerts => {
    return $alerts.filter(a => a.status === 'active').length;
  });

  let checkInterval: number | null = null;
  let lastCheckTime = 0;

  async function loadInitialAlerts(): Promise<void> {
    isLoading.set(true);
    try {
      const alertList = await getAlerts({ limit: 50 });
      alerts.set(alertList);
    } catch (e) {
      console.error('Failed to load alerts:', e);
    } finally {
      isLoading.set(false);
    }
  }

  function startAlertChecking(): void {
    checkInterval = window.setInterval(() => {
      checkForAlerts();
    }, 2000);
  }

  function checkForAlerts(): void {
    const now = Date.now();
    const cableParams = get(realtimeStore.cableParams);
    const sensorData = get(realtimeStore.sensorData);

    for (const point of sensorData) {
      const tempRatio = point.temperature / cableParams.maxTemperature;
      const currentRatio = point.current / cableParams.maxCurrent;

      let severity: AlertSeverity | null = null;
      let alertType: 'overheat' | 'overcurrent' | 'abnormal' | null = null;
      let message = '';

      if (point.temperature > cableParams.maxTemperature * 0.95) {
        severity = 'danger';
        alertType = 'overheat';
        message = `温度严重超限: ${point.temperature.toFixed(1)}°C / ${cableParams.maxTemperature}°C`;
      } else if (point.temperature > cableParams.maxTemperature * 0.85) {
        severity = 'warning';
        alertType = 'overheat';
        message = `温度接近阈值: ${point.temperature.toFixed(1)}°C`;
      } else if (point.temperature > cableParams.maxTemperature * 0.75) {
        severity = 'info';
        alertType = 'overheat';
        message = `温度升高预警: ${point.temperature.toFixed(1)}°C`;
      }

      if (point.current > cableParams.maxCurrent * 0.95) {
        severity = 'danger';
        alertType = 'overcurrent';
        message = `电流严重超限: ${point.current.toFixed(0)}A / ${cableParams.maxCurrent}A`;
      } else if (point.current > cableParams.maxCurrent * 0.85 && !severity) {
        severity = 'warning';
        alertType = 'overcurrent';
        message = `电流接近阈值: ${point.current.toFixed(0)}A`;
      }

      if (tempRatio > 0.8 && currentRatio > 0.8 && !severity) {
        severity = 'warning';
        alertType = 'abnormal';
        message = '温度电流协同异常，可能存在热击穿风险';
      }

      if (severity && alertType && now - lastCheckTime > 5000) {
        const currentAlerts = get(alerts);
        const recentAlert = currentAlerts.find((a: AlertRecord) =>
          a.sensorId === point.sensorId &&
          a.type === alertType &&
          now - a.timestamp < 30000
        );

        if (!recentAlert) {
          createAlert({
            id: `alert-${now}-${point.sensorId}`,
            timestamp: now,
            type: alertType,
            severity,
            sensorId: point.sensorId,
            position: point.position,
            value: alertType === 'overheat' ? point.temperature : point.current,
            threshold: alertType === 'overheat' ? cableParams.maxTemperature : cableParams.maxCurrent,
            status: 'active',
            message
          });
        }
      }
    }

    lastCheckTime = now;
  }

  async function createAlert(alert: AlertRecord): Promise<void> {
    try {
      await insertAlert(alert);
      alerts.update(current => [alert, ...current].slice(0, 100));
    } catch (e) {
      console.error('Failed to create alert:', e);
    }
  }

  async function updateAlertStatusFunc(alertId: string, status: AlertStatus, acknowledgedBy?: string): Promise<void> {
    try {
      await dbUpdateAlertStatus(alertId, status, acknowledgedBy);
      alerts.update(current =>
        current.map((a: AlertRecord) =>
          a.id === alertId
            ? { ...a, status, acknowledgedBy, resolvedAt: status === 'resolved' ? Date.now() : a.resolvedAt }
            : a
        )
      );
    } catch (e) {
      console.error('Failed to update alert status:', e);
    }
  }

  async function loadMoreFunc(limit: number = 20): Promise<void> {
    if (get(isLoading)) return;
    isLoading.set(true);
    try {
      const currentAlerts = get(alerts);
      const olderAlerts = await getAlerts({
        limit,
        offset: currentAlerts.length
      });
      alerts.update(current => [...current, ...olderAlerts]);
    } catch (e) {
      console.error('Failed to load more alerts:', e);
    } finally {
      isLoading.set(false);
    }
  }

  function getAlertsByStatus(status: AlertStatus): AlertRecord[] {
    return get(alerts).filter((a: AlertRecord) => a.status === status);
  }

  function getAlertsBySeverity(severity: AlertSeverity): AlertRecord[] {
    return get(alerts).filter((a: AlertRecord) => a.severity === severity);
  }

  function destroyFunc(): void {
    if (checkInterval !== null) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }

  loadInitialAlerts();
  startAlertChecking();

  return {
    alerts,
    unreadCount,
    isLoading,
    updateAlertStatus: updateAlertStatusFunc,
    loadMore: loadMoreFunc,
    getAlertsByStatus,
    getAlertsBySeverity,
    destroy: destroyFunc
  };
}

export const alertStore = createAlertStore();
