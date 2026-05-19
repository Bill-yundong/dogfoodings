
import type { AlertRecord, AlertSeverity, AlertStatus } from '@/types';
import { realtimeStore } from './realtime';
import { insertAlert, getAlerts, updateAlertStatus as dbUpdateAlertStatus } from '@/db/alerts';

export class AlertStore {
  alerts = $state<AlertRecord[]>([]);
  unreadCount = $state(0);
  isLoading = $state(false);

  private checkInterval: number | null = null;
  private lastCheckTime = 0;

  constructor() {
    this.loadInitialAlerts();
    this.startAlertChecking();
  }

  async loadInitialAlerts(): Promise<void> {
    this.isLoading = true;
    try {
      const alerts = await getAlerts({ limit: 50 });
      this.alerts = alerts;
      this.updateUnreadCount();
    } catch (e) {
      console.error('Failed to load alerts:', e);
    } finally {
      this.isLoading = false;
    }
  }

  private startAlertChecking(): void {
    this.checkInterval = window.setInterval(() => {
      this.checkForAlerts();
    }, 2000);
  }

  private checkForAlerts(): void {
    const now = Date.now();
    const cableParams = realtimeStore.cableParams;

    for (const point of realtimeStore.sensorData) {
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

      if (severity && alertType && now - this.lastCheckTime > 5000) {
        const recentAlert = this.alerts.find((a: AlertRecord) =>
          a.sensorId === point.sensorId &&
          a.type === alertType &&
          now - a.timestamp < 30000
        );

        if (!recentAlert) {
          this.createAlert({
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

    this.lastCheckTime = now;
  }

  private async createAlert(alert: AlertRecord): Promise<void> {
    try {
      await insertAlert(alert);
      this.alerts = [alert, ...this.alerts].slice(0, 100);
      this.updateUnreadCount();
    } catch (e) {
      console.error('Failed to create alert:', e);
    }
  }

  private updateUnreadCount(): void {
    this.unreadCount = this.alerts.filter((a: AlertRecord) => a.status === 'active').length;
  }

  async updateAlertStatus(alertId: string, status: AlertStatus, acknowledgedBy?: string): Promise<void> {
    try {
      await dbUpdateAlertStatus(alertId, status, acknowledgedBy);
      this.alerts = this.alerts.map((a: AlertRecord) =>
        a.id === alertId
          ? { ...a, status, acknowledgedBy, resolvedAt: status === 'resolved' ? Date.now() : a.resolvedAt }
          : a
      );
      this.updateUnreadCount();
    } catch (e) {
      console.error('Failed to update alert status:', e);
    }
  }

  async loadMore(limit: number = 20): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    try {
      const olderAlerts = await getAlerts({
        limit,
        offset: this.alerts.length
      });
      this.alerts = [...this.alerts, ...olderAlerts];
    } catch (e) {
      console.error('Failed to load more alerts:', e);
    } finally {
      this.isLoading = false;
    }
  }

  getAlertsByStatus(status: AlertStatus): AlertRecord[] {
    return this.alerts.filter((a: AlertRecord) => a.status === status);
  }

  getAlertsBySeverity(severity: AlertSeverity): AlertRecord[] {
    return this.alerts.filter((a: AlertRecord) => a.severity === severity);
  }

  destroy(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const alertStore = new AlertStore();
