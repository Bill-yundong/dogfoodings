import type { EnergyReading, Device, EnergySnapshot, DeviceSnapshot } from '@/lib/types/energy';
import { eventBus } from '@/lib/bus/eventBus';
import { dbService } from '@/lib/db/indexedDB';
import { generateEnergyReading } from '@/lib/utils/mockData';

class DataCollector {
  private devices: Device[] = [];
  private readings: EnergyReading[] = [];
  private isRunning: boolean = false;
  private collectionInterval: number = 2000;
  private snapshotInterval: number = 3600000;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private snapshotIntervalId: ReturnType<typeof setInterval> | null = null;
  private maxReadings: number = 300;
  private hourlyAccumulator: {
    totalConsumption: number;
    standbyConsumption: number;
    deviceData: Map<string, { consumption: number; runTime: number; standbyTime: number }>;
    startTime: number;
  } | null = null;
  private electricityRate: number = 0.56;

  async init(devices: Device[]): Promise<void> {
    this.devices = devices;
    this.resetAccumulator();
    
    const lastSnapshot = await dbService.getLatestSnapshot();
    if (lastSnapshot) {
      const now = Date.now();
      if (now - lastSnapshot.timestamp < this.snapshotInterval) {
        this.hourlyAccumulator = {
          totalConsumption: lastSnapshot.totalConsumption * 0.1,
          standbyConsumption: lastSnapshot.standbyConsumption * 0.1,
          deviceData: new Map(),
          startTime: now,
        };
        
        lastSnapshot.deviceBreakdown.forEach(d => {
          this.hourlyAccumulator!.deviceData.set(d.deviceId, {
            consumption: d.consumption * 0.1,
            runTime: d.runHours * 360,
            standbyTime: d.standbyHours * 360,
          });
        });
      }
    }

    this.start();
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    this.collectReading();
    
    this.intervalId = setInterval(() => {
      this.collectReading();
    }, this.collectionInterval);

    this.snapshotIntervalId = setInterval(() => {
      this.createSnapshot();
    }, this.snapshotInterval);

    eventBus.send('engine:status', { engine: 'data-collector', status: 'running' }, 'engine');
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.snapshotIntervalId) {
      clearInterval(this.snapshotIntervalId);
      this.snapshotIntervalId = null;
    }
  }

  private resetAccumulator(): void {
    this.hourlyAccumulator = {
      totalConsumption: 0,
      standbyConsumption: 0,
      deviceData: new Map(),
      startTime: Date.now(),
    };
    
    this.devices.forEach(device => {
      this.hourlyAccumulator!.deviceData.set(device.id, {
        consumption: 0,
        runTime: 0,
        standbyTime: 0,
      });
    });
  }

  private collectReading(): void {
    const reading = generateEnergyReading(this.devices);
    
    this.readings.push(reading);
    
    if (this.readings.length > this.maxReadings) {
      this.readings.shift();
    }

    this.accumulateReading(reading);
    
    eventBus.send('energy:reading', reading, 'engine', undefined, 'normal');
  }

  private accumulateReading(reading: EnergyReading): void {
    if (!this.hourlyAccumulator) return;

    const intervalHours = this.collectionInterval / (1000 * 3600);
    
    this.hourlyAccumulator.totalConsumption += (reading.totalPower / 1000) * intervalHours;
    this.hourlyAccumulator.standbyConsumption += (reading.standbyPower / 1000) * intervalHours;

    reading.devices.forEach(deviceReading => {
      const deviceData = this.hourlyAccumulator!.deviceData.get(deviceReading.deviceId);
      if (deviceData) {
        deviceData.consumption += (deviceReading.power / 1000) * intervalHours;
        
        if (deviceReading.isOn && !deviceReading.isStandby) {
          deviceData.runTime += this.collectionInterval / 1000;
        } else if (deviceReading.isStandby) {
          deviceData.standbyTime += this.collectionInterval / 1000;
        }
      }
    });
  }

  private async createSnapshot(): Promise<string | null> {
    if (!this.hourlyAccumulator || this.hourlyAccumulator.totalConsumption < 0.01) {
      this.resetAccumulator();
      return null;
    }

    const now = Date.now();
    const date = new Date(now);
    const dateStr = date.toISOString().split('T')[0];
    const hour = date.getHours();

    const deviceBreakdown: DeviceSnapshot[] = [];
    
    for (const [deviceId, data] of this.hourlyAccumulator.deviceData) {
      const device = this.devices.find(d => d.id === deviceId);
      if (device) {
        deviceBreakdown.push({
          deviceId,
          name: device.name,
          consumption: data.consumption,
          runHours: data.runTime / 3600,
          standbyHours: data.standbyTime / 3600,
          category: device.category,
        });
      }
    }

    const efficiencyScore = this.calculateEfficiencyScore(this.hourlyAccumulator);

    const snapshot: Omit<EnergySnapshot, 'id'> = {
      timestamp: now,
      date: dateStr,
      hour,
      totalConsumption: this.hourlyAccumulator.totalConsumption,
      standbyConsumption: this.hourlyAccumulator.standbyConsumption,
      cost: this.hourlyAccumulator.totalConsumption * this.electricityRate,
      efficiencyScore,
      deviceBreakdown,
      detectedWastePoints: [],
      weather: {
        temperature: 18 + Math.random() * 10,
        humidity: 40 + Math.random() * 40,
      },
    };

    const snapshotId = await dbService.addSnapshot(snapshot);
    
    eventBus.send('snapshot:created', { ...snapshot, id: snapshotId }, 'engine', undefined, 'normal');
    
    this.resetAccumulator();
    
    return snapshotId;
  }

  private calculateEfficiencyScore(accumulator: typeof this.hourlyAccumulator): number {
    if (!accumulator) return 0;

    const standbyRatio = accumulator.standbyConsumption / Math.max(accumulator.totalConsumption, 0.001);
    const deviceEfficiencyScores: number[] = [];
    
    for (const [, data] of accumulator.deviceData) {
      const totalTime = data.runTime + data.standbyTime;
      if (totalTime > 0) {
        const runRatio = data.runTime / totalTime;
        deviceEfficiencyScores.push(runRatio);
      }
    }

    const avgDeviceEfficiency = deviceEfficiencyScores.length > 0
      ? deviceEfficiencyScores.reduce((a, b) => a + b, 0) / deviceEfficiencyScores.length
      : 0.5;

    const standbyScore = Math.max(0, 100 - standbyRatio * 200);
    const usageScore = avgDeviceEfficiency * 100;
    
    return Math.min(100, standbyScore * 0.4 + usageScore * 0.6);
  }

  toggleDevice(deviceId: string, isOn: boolean): void {
    const device = this.devices.find(d => d.id === deviceId);
    if (device) {
      device.isOn = isOn;
      dbService.updateDevice(deviceId, { isOn });
      
      eventBus.send('device:state-change', {
        deviceId,
        isOn,
        timestamp: Date.now(),
      }, 'engine', undefined, 'high');

      this.collectReading();
    }
  }

  getLatestReading(): EnergyReading | null {
    if (this.readings.length === 0) return null;
    return this.readings[this.readings.length - 1];
  }

  getReadings(limit?: number): EnergyReading[] {
    if (limit) {
      return this.readings.slice(-limit);
    }
    return [...this.readings];
  }

  getTrendData(): { timestamp: number; total: number; standby: number }[] {
    return this.readings.map(r => ({
      timestamp: r.timestamp,
      total: r.totalPower,
      standby: r.standbyPower,
    }));
  }

  getDeviceTrend(deviceId: string): { timestamp: number; power: number; isOn: boolean; isStandby: boolean }[] {
    return this.readings.map(r => {
      const device = r.devices.find(d => d.deviceId === deviceId);
      return {
        timestamp: r.timestamp,
        power: device?.power || 0,
        isOn: device?.isOn || false,
        isStandby: device?.isStandby || false,
      };
    });
  }

  getAccumulatorData(): {
    totalConsumption: number;
    standbyConsumption: number;
    elapsedTime: number;
  } | null {
    if (!this.hourlyAccumulator) return null;
    
    return {
      totalConsumption: this.hourlyAccumulator.totalConsumption,
      standbyConsumption: this.hourlyAccumulator.standbyConsumption,
      elapsedTime: (Date.now() - this.hourlyAccumulator.startTime) / 1000,
    };
  }

  setCollectionInterval(interval: number): void {
    if (interval < 500) return;
    this.collectionInterval = interval;
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  clear(): void {
    this.readings = [];
    this.resetAccumulator();
  }

  destroy(): void {
    this.stop();
    this.clear();
  }
}

export const dataCollector = new DataCollector();

export function useDataCollector() {
  return dataCollector;
}
