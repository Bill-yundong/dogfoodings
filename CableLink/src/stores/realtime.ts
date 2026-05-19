
import type { TemperaturePoint, ThermalFieldData, PredictionResult, CableParameters } from '@/types';
import { calculateTemperatureDistribution } from '@/engine/thermal';
import { insertSensorDataBatch } from '@/db/sensor';

export class RealtimeDataStore {
  sensorData = $state<TemperaturePoint[]>([]);
  thermalField = $state<ThermalFieldData | null>(null);
  latestPrediction = $state<PredictionResult | null>(null);
  cableParams = $state<CableParameters>({
    id: 'cable-001',
    name: '跨海能源链路A段',
    length: 5000,
    maxCurrent: 1200,
    maxTemperature: 90,
    thermalResistance: 0.35,
    ambientTemperature: 12,
    conductorResistance: 0.02,
    dielectricLoss: 0.001
  });
  systemStatus = $state<'connected' | 'disconnected' | 'error'>('connected');
  updateRate = $state(1000);

  private sensorCount = 20;
  private animationFrameId: number | null = null;
  private lastUpdateTime = 0;

  constructor() {
    this.initializeSensorData();
    this.startSimulation();
  }

  private initializeSensorData(): void {
    const now = Date.now();
    const data: TemperaturePoint[] = [];

    for (let i = 0; i < this.sensorCount; i++) {
      const distance = (i / (this.sensorCount - 1)) * this.cableParams.length;
      const baseTemp = this.cableParams.ambientTemperature + 25 + Math.sin(distance / 500) * 10;

      data.push({
        timestamp: now,
        sensorId: `SNS-${String(i + 1).padStart(3, '0')}`,
        position: {
          distance,
          depth: 50 + Math.sin(distance / 800) * 20
        },
        temperature: baseTemp + (Math.random() - 0.5) * 2,
        current: 800 + Math.sin(distance / 600) * 150 + (Math.random() - 0.5) * 50,
        voltage: 220 + (Math.random() - 0.5) * 5,
        ambientTemp: this.cableParams.ambientTemperature + (Math.random() - 0.5) * 2
      });
    }

    this.sensorData = data;
    this.updateThermalField();
  }

  private startSimulation(): void {
    const update = () => {
      const now = Date.now();
      if (now - this.lastUpdateTime >= this.updateRate) {
        this.updateSensorData();
        this.lastUpdateTime = now;
      }
      this.animationFrameId = requestAnimationFrame(update);
    };
    this.animationFrameId = requestAnimationFrame(update);
  }

  private updateSensorData(): void {
    const now = Date.now();
    const timeFactor = now / 10000;

    this.sensorData = this.sensorData.map((point: TemperaturePoint, i: number) => {
      const distance = point.position.distance;
      const loadVariation = 0.8 + 0.2 * Math.sin(timeFactor + distance / 1000);
      const baseCurrent = 800 + Math.sin(timeFactor * 0.5 + distance / 600) * 200;
      const current = baseCurrent * loadVariation;

      const resistiveHeating = (current / 1000) ** 2 * this.cableParams.conductorResistance * 100;
      const baseTemp = this.cableParams.ambientTemperature + 20 + resistiveHeating + Math.sin(timeFactor + distance / 400) * 8;
      const noise = (Math.random() - 0.5) * 1.5;

      const hotspotEffect = i === 10 || i === 11 ? 8 + Math.sin(timeFactor * 0.8) * 3 : 0;

      return {
        ...point,
        timestamp: now,
        temperature: Math.max(this.cableParams.ambientTemperature, baseTemp + noise + hotspotEffect),
        current,
        voltage: 220 + (Math.random() - 0.5) * 3
      };
    });

    this.updateThermalField();

    if (Math.random() < 0.1) {
      this.persistData();
    }
  }

  private updateThermalField(): void {
    this.thermalField = calculateTemperatureDistribution(this.sensorData, this.cableParams, 0.1);
  }

  private async persistData(): Promise<void> {
    try {
      await insertSensorDataBatch(this.sensorData);
    } catch (e) {
      console.warn('Failed to persist sensor data:', e);
    }
  }

  setUpdateRate(rate: number): void {
    this.updateRate = Math.max(100, Math.min(5000, rate));
  }

  setCableParams(params: Partial<CableParameters>): void {
    this.cableParams = { ...this.cableParams, ...params };
  }

  getMaxTemperature(): number {
    return Math.max(...this.sensorData.map((d: TemperaturePoint) => d.temperature));
  }

  getAvgTemperature(): number {
    return this.sensorData.reduce((sum: number, d: TemperaturePoint) => sum + d.temperature, 0) / this.sensorData.length;
  }

  getTotalCurrent(): number {
    return this.sensorData.reduce((sum: number, d: TemperaturePoint) => sum + d.current, 0) / this.sensorData.length;
  }

  getHotspotLocation(): { distance: number; temperature: number } | null {
    if (this.sensorData.length === 0) return null;
    const maxPoint = this.sensorData.reduce((max: TemperaturePoint, d: TemperaturePoint) =>
      d.temperature > max.temperature ? d : max
    );
    return {
      distance: maxPoint.position.distance,
      temperature: maxPoint.temperature
    };
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

export const realtimeStore = new RealtimeDataStore();
