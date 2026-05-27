import type { EnergyReading, DeviceReading, Device } from '@/lib/types/energy';
import { mean, stdDev, exponentialMovingAverage } from '@/lib/utils/math';
import { eventBus } from '@/lib/bus/eventBus';
import { dbService } from '@/lib/db/indexedDB';
class StandbyTracker {
  private baselineWindow: number = 0;
  private historyWindow: EnergyReading[] = [];
  private standbyThresholds: Map<string, number> = new Map();
  private deviceStandbyDurations: Map<string, number> = new Map();
  private updateInterval: number = 2000;
  private maxHistorySize: number = 300;
  private isRunning: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private devices: Device[] = [];
  async init(devices: Device[]): Promise<void> {
    this.devices = devices;
    
    devices.forEach(device => {
      this.standbyThresholds.set(device.id, device.standbyPower * 1.5);
      this.deviceStandbyDurations.set(device.id, 0);
    });

    const savedBaseline = await dbService.getMetadata<number>('standbyBaseline');
    if (savedBaseline) {
      this.baselineWindow = savedBaseline;
    }

    this.start();
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    eventBus.subscribe('energy:reading', this.handleReading.bind(this));
    
    this.intervalId = setInterval(() => {
      this.analyzeReadings();
    }, this.updateInterval);

    eventBus.send('engine:status', { engine: 'standby-tracker', status: 'running' }, 'engine');
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    eventBus.unsubscribe('energy:reading', this.handleReading);
  }

  private handleReading(event: { type: string; payload: unknown }): void {
    const reading = event.payload as EnergyReading;
    if (!reading) return;

    this.historyWindow.push(reading);
    
    if (this.historyWindow.length > this.maxHistorySize) {
      this.historyWindow.shift();
    }

    this.updateStandbyDurations(reading.devices);
    this.calculateBaseline();
  }

  private updateStandbyDurations(devices: DeviceReading[]): void {
    devices.forEach(device => {
      const currentDuration = this.deviceStandbyDurations.get(device.deviceId) || 0;
      
      if (device.isStandby) {
        this.deviceStandbyDurations.set(
          device.deviceId,
          currentDuration + this.updateInterval / 1000
        );
      } else {
        this.deviceStandbyDurations.set(device.deviceId, 0);
      }
    });
  }

  private calculateBaseline(): void {
    if (this.historyWindow.length < 10) return;

    const recentReadings = this.historyWindow.slice(-30);
    const standbyPowers = recentReadings.map(r => r.standbyPower);
    
    this.baselineWindow = mean(standbyPowers);
    
    dbService.setMetadata('standbyBaseline', this.baselineWindow);
  }

  private analyzeReadings(): void {
    if (this.historyWindow.length < 10) return;

    const currentReading = this.historyWindow[this.historyWindow.length - 1];
    
    const recentReadings = this.historyWindow.slice(-30);
    const powers = recentReadings.map(r => r.totalPower);
    exponentialMovingAverage(
      recentReadings.map(r => r.totalPower),
      0.3
    );

    currentReading.devices.forEach(device => {
      const duration = this.deviceStandbyDurations.get(device.deviceId) || 0;
      const threshold = this.standbyThresholds.get(device.deviceId) || 10;

      if (device.isStandby && device.power > threshold && duration > 3600) {
        this.detectWaste(device, duration, recentReadings);
      }
    });

    const totalStdDev = stdDev(powers);
    const recentMean = mean(powers);
    
    if (totalStdDev > recentMean * 0.5 && this.baselineWindow > 0) {
      eventBus.send('waste:detected', {
        type: 'systemic',
        description: '系统待机能耗波动异常',
        severity: 'medium',
        timestamp: Date.now(),
      }, 'engine', 'detection');
    }
  }

  private detectWaste(
    device: DeviceReading,
    duration: number,
    readings: EnergyReading[]
  ): void {
    const recentDeviceData = readings.map(r => r.devices.find(d => d.deviceId === device.deviceId))
    .filter(Boolean) as DeviceReading[];
    
    const powers = recentDeviceData.map(d => d.power);
    const avgPower = mean(powers);
    const std = stdDev(powers);

    eventBus.send('waste:detected', {
      deviceId: device.deviceId,
      deviceName: device.name,
      type: 'standby',
      description: `${device.name} 已待机 ${Math.floor(duration / 3600)}小时`,
      power: avgPower,
      duration,
      severity: this.calculateSeverity(duration, avgPower),
      stats: {
        averagePower: avgPower,
        stdDev: std,
        estimatedWaste: (avgPower * duration) / 1000,
      },
    }, 'engine', 'detection', 'high');
  }

  private calculateSeverity(duration: number, power: number): 'low' | 'medium' | 'high' | 'critical' {
    const wasteKwh = (power * duration) / 1000;
    const cost = wasteKwh * 0.56;
    
    if (cost > 5) return 'critical';
    if (cost > 2) return 'high';
    if (cost > 0.5) return 'medium';
    return 'low';
  }

  getStandbyDuration(deviceId: string): number {
    return this.deviceStandbyDurations.get(deviceId) || 0;
  }

  getBaseline(): number {
    return this.baselineWindow;
  }

  getTotalStandbyWaste(): number {
    let totalWaste = 0;
    this.deviceStandbyDurations.forEach((duration, deviceId) => {
      const device = this.devices.find(d => d.id === deviceId);
      if (device) {
        totalWaste += (device.standbyPower * duration) / 1000;
      }
    });
    return totalWaste;
  }

  getDeviceStandbyReport(): Array<{
    deviceId: string;
    deviceName: string;
    duration: number;
    waste: number;
  }> {
    const report: Array<{
      deviceId: string;
      deviceName: string;
      duration: number;
      waste: number;
    }> = [];

    this.deviceStandbyDurations.forEach((duration, deviceId) => {
      const device = this.devices.find(d => d.id === deviceId);
      if (device && duration > 0) {
        report.push({
          deviceId,
          deviceName: device.name,
          duration,
          waste: (device.standbyPower * duration) / 1000,
        });
      }
    });

    return report.sort((a, b) => b.waste - a.waste);
  }

  getTrendData(): { timestamp: number; standby: number }[] {
    return this.historyWindow.map(r => ({
      timestamp: r.timestamp,
      standby: r.standbyPower,
    }));
  }

  clear(): void {
    this.historyWindow = [];
    this.deviceStandbyDurations.clear();
  }

  destroy(): void {
    this.stop();
    this.clear();
  }
}

export const standbyTracker = new StandbyTracker();

export function useStandbyTracker() {
  return standbyTracker;
}
