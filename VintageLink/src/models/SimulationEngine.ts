import type {
  SensorReading,
  CellarZone,
  WineBottle,
  WineLabel,
  MaturationModel,
  DrinkingWindow,
  Alert,
} from '@/types';
import { db } from '@/db';
import { semanticEngine } from '@/models/SemanticAlignment';
import { drinkingWindowPredictor } from '@/models/DrinkingWindowPredictor';

export type SimulationSpeed = 'paused' | '1x' | '5x' | '20x' | '100x';

export interface SimulationState {
  isRunning: boolean;
  speed: SimulationSpeed;
  elapsedHours: number;
  totalSimulatedDays: number;
  eventLog: SimulationEvent[];
  stats: SimulationStats;
}

export interface SimulationEvent {
  id: string;
  timestamp: number;
  simulatedTime: number;
  type: 'sensor' | 'alert' | 'maturation' | 'drinking_window' | 'zone_change' | 'system';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data?: Record<string, unknown>;
}

export interface SimulationStats {
  totalSensorReadings: number;
  totalAlerts: number;
  maturationUpdates: number;
  predictionsRun: number;
  anomaliesDetected: number;
  winesEnteringPeak: number;
}

interface SensorProfile {
  driftRate: number;
  noiseLevel: number;
  anomalyProbability: number;
  seasonOffset: number;
}

export class SimulationEngine {
  private state: SimulationState;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(state: SimulationState) => void> = new Set();
  private sensorProfiles: Map<string, SensorProfile> = new Map();
  private currentSimTimestamp: number;
  private readonly TICK_BASE_MS = 2000;
  private onSensorReading?: (reading: SensorReading) => void;
  private onAlert?: (alert: Alert) => void;
  private onMaturationUpdate?: (model: MaturationModel) => void;
  private onDrinkingWindowUpdate?: (window: DrinkingWindow) => void;

  constructor() {
    this.currentSimTimestamp = Date.now();
    this.state = {
      isRunning: false,
      speed: 'paused',
      elapsedHours: 0,
      totalSimulatedDays: 0,
      eventLog: [],
      stats: {
        totalSensorReadings: 0,
        totalAlerts: 0,
        maturationUpdates: 0,
        predictionsRun: 0,
        anomaliesDetected: 0,
        winesEnteringPeak: 0,
      },
    };
  }

  get simulationTime(): number {
    return this.currentSimTimestamp;
  }

  getState(): SimulationState {
    return { ...this.state };
  }

  subscribe(listener: (state: SimulationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setCallbacks(callbacks: {
    onSensorReading?: (reading: SensorReading) => void;
    onAlert?: (alert: Alert) => void;
    onMaturationUpdate?: (model: MaturationModel) => void;
    onDrinkingWindowUpdate?: (window: DrinkingWindow) => void;
  }) {
    this.onSensorReading = callbacks.onSensorReading;
    this.onAlert = callbacks.onAlert;
    this.onMaturationUpdate = callbacks.onMaturationUpdate;
    this.onDrinkingWindowUpdate = callbacks.onDrinkingWindowUpdate;
  }

  private notify() {
    const snapshot = this.getState();
    this.listeners.forEach(fn => fn(snapshot));
  }

  private addEvent(event: Omit<SimulationEvent, 'id' | 'timestamp' | 'simulatedTime'>) {
    const full: SimulationEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      simulatedTime: this.currentSimTimestamp,
    };
    this.state.eventLog = [full, ...this.state.eventLog].slice(0, 200);
  }

  private getSpeedMultiplier(): number {
    switch (this.state.speed) {
      case 'paused': return 0;
      case '1x': return 1;
      case '5x': return 5;
      case '20x': return 20;
      case '100x': return 100;
      default: return 1;
    }
  }

  private getHoursPerTick(): number {
    return this.getSpeedMultiplier();
  }

  private initSensorProfiles(zones: CellarZone[]) {
    this.sensorProfiles.clear();
    zones.forEach(zone => {
      zone.sensorIds.forEach(sensorId => {
        this.sensorProfiles.set(sensorId, {
          driftRate: (Math.random() - 0.5) * 0.02,
          noiseLevel: 0.3 + Math.random() * 0.4,
          anomalyProbability: 0.02 + Math.random() * 0.03,
          seasonOffset: Math.random() * Math.PI * 2,
        });
      });
    });
  }

  async initialize(zones: CellarZone[], bottles: WineBottle[], labels: WineLabel[]) {
    this.initSensorProfiles(zones);

    if (bottles.length > 0) {
      const latestBottle = bottles.reduce((a, b) =>
        a.purchaseDate > b.purchaseDate ? a : b
      );
      const latestLabel = labels.find(l => l.id === latestBottle.labelId);
      if (latestLabel) {
        this.currentSimTimestamp = Date.now();
      }
    }

    this.addEvent({
      type: 'system',
      severity: 'info',
      message: `仿真引擎初始化完成，${zones.length} 个区域，${bottles.length} 瓶藏酒`,
    });
    this.notify();
  }

  start(speed: SimulationSpeed = '1x') {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.state.speed = speed;
    this.state.isRunning = speed !== 'paused';

    if (this.state.isRunning) {
      this.addEvent({
        type: 'system',
        severity: 'info',
        message: `仿真启动，速度 ${speed}`,
      });

      this.intervalId = setInterval(() => {
        this.tick();
      }, this.TICK_BASE_MS);
    }

    this.notify();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.state.isRunning = false;
    this.state.speed = 'paused';

    this.addEvent({
      type: 'system',
      severity: 'info',
      message: '仿真暂停',
    });
    this.notify();
  }

  setSpeed(speed: SimulationSpeed) {
    const wasRunning = this.state.isRunning;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.state.speed = speed;
    this.state.isRunning = speed !== 'paused';

    if (this.state.isRunning) {
      this.intervalId = setInterval(() => {
        this.tick();
      }, this.TICK_BASE_MS);
      if (wasRunning) {
        this.addEvent({
          type: 'system',
          severity: 'info',
          message: `仿真速度调整为 ${speed}`,
        });
      }
    }

    this.notify();
  }

  private async tick() {
    const hoursDelta = this.getHoursPerTick();
    if (hoursDelta <= 0) return;

    this.currentSimTimestamp += hoursDelta * 3600000;
    this.state.elapsedHours += hoursDelta;
    this.state.totalSimulatedDays = Math.floor(this.state.elapsedHours / 24);

    const zones = await db.getAllCellarZones();
    const bottles = await db.getAllWineBottles();
    const labels = await db.getAllWineLabels();

    await this.generateSensorData(zones, hoursDelta);
    await this.runMaturationCycle(bottles, labels, zones, hoursDelta);
    await this.checkAlerts(zones);
    await this.checkDrinkingWindows(bottles, labels);

    this.notify();
  }

  private async generateSensorData(zones: CellarZone[], hoursDelta: number) {
    const steps = Math.max(1, Math.min(hoursDelta, 6));

    for (const zone of zones) {
      for (const sensorId of zone.sensorIds) {
        const profile = this.sensorProfiles.get(sensorId);
        if (!profile) continue;

        for (let step = 0; step < steps; step++) {
          const isAnomaly = Math.random() < profile.anomalyProbability;
          const seasonalFactor = Math.sin(
            (this.state.elapsedHours / 8760) * Math.PI * 2 + profile.seasonOffset
          ) * 0.5;

          let temperature = zone.targetTemperature.optimal
            + profile.driftRate * this.state.elapsedHours
            + seasonalFactor * 0.3
            + (Math.random() - 0.5) * profile.noiseLevel;

          let humidity = zone.targetHumidity.optimal
            + (Math.random() - 0.5) * profile.noiseLevel * 5
            - seasonalFactor * 2;

          if (isAnomaly) {
            temperature += (Math.random() - 0.3) * 8;
            humidity += (Math.random() - 0.3) * 15;
            this.state.stats.anomaliesDetected++;
            this.addEvent({
              type: 'sensor',
              severity: temperature > zone.targetTemperature.max + 3 ? 'critical' : 'warning',
              message: `${zone.name} 传感器 ${sensorId} 检测到异常：温度 ${temperature.toFixed(1)}°C，湿度 ${humidity.toFixed(0)}%`,
              data: { sensorId, temperature, humidity, zoneId: zone.id },
            });
          }

          temperature = Math.round(temperature * 100) / 100;
          humidity = Math.round(Math.max(30, Math.min(95, humidity)) * 100) / 100;

          const reading: SensorReading = {
            id: `sim-${this.state.stats.totalSensorReadings}-${sensorId}`,
            timestamp: this.currentSimTimestamp - (steps - step) * 600000,
            zoneId: zone.id,
            temperature,
            humidity,
            lightIntensity: Math.max(0, 5 + Math.random() * 20 + (isAnomaly ? 30 : 0)),
            vibration: Math.max(0, Math.random() * 0.2 + (isAnomaly ? 0.5 : 0)),
          };

          await db.addSensorReading(reading);
          this.state.stats.totalSensorReadings++;

          if (this.onSensorReading) {
            this.onSensorReading(reading);
          }
        }
      }
    }
  }

  private async runMaturationCycle(
    bottles: WineBottle[],
    labels: WineLabel[],
    zones: CellarZone[],
    hoursDelta: number
  ) {
    const daysDelta = hoursDelta / 24;
    if (daysDelta < 1) return;

    let updateCount = 0;

    for (const bottle of bottles) {
      const label = labels.find(l => l.id === bottle.labelId);
      if (!label) continue;

      const zone = zones.find(z => z.id === bottle.location.zoneId);
      if (!zone) continue;

      const existingModel = await db.getMaturationModel(bottle.id);

      const readings = await db.getSensorReadingsByZone(
        zone.id,
        this.currentSimTimestamp - 86400000 * 30,
        this.currentSimTimestamp
      );

      if (readings.length === 0) continue;

      let impactScore = 80;
      if (readings.length >= 5) {
        const impact = semanticEngine.calculateMaturationImpact(readings, zone);
        impactScore = impact.impactScore;
      }

      const ageProgress = daysDelta / 365;
      const adjustedModel = existingModel
        ? semanticEngine.generateMaturationAdjustment(existingModel, impactScore, daysDelta)
        : null;

      if (adjustedModel) {
        adjustedModel.currentAge += ageProgress;
        adjustedModel.lastUpdated = this.currentSimTimestamp;
        adjustedModel.maturityScore = Math.max(0, Math.min(100,
          adjustedModel.maturityScore + (impactScore > 75 ? ageProgress * 0.5 : -ageProgress * 0.3)
        ));

        await db.addMaturationModel(adjustedModel);
        this.state.stats.maturationUpdates++;

        if (this.onMaturationUpdate) {
          this.onMaturationUpdate(adjustedModel);
        }

        updateCount++;
      }
    }

    if (updateCount > 0) {
      this.addEvent({
        type: 'maturation',
        severity: 'info',
        message: `完成 ${updateCount} 瓶酒的熟化模型更新（仿真 ${daysDelta.toFixed(0)} 天）`,
      });
    }
  }

  private async checkAlerts(zones: CellarZone[]) {
    for (const zone of zones) {
      const latest = await db.getLatestSensorReading(zone.id);
      if (!latest) continue;

      const isTempHigh = latest.temperature > zone.targetTemperature.max + 2;
      const isTempLow = latest.temperature < zone.targetTemperature.min - 2;
      const isHumidityLow = latest.humidity < zone.targetHumidity.min - 5;
      const isHumidityHigh = latest.humidity > zone.targetHumidity.max + 5;

      if (isTempHigh || isTempLow) {
        const alert: Alert = {
          id: `alert-temp-${this.currentSimTimestamp}-${zone.id}`,
          type: 'temperature',
          severity: Math.abs(latest.temperature - zone.targetTemperature.optimal) > 5 ? 'critical' : 'warning',
          message: `${zone.name}温度${isTempHigh ? '过高' : '过低'}：${latest.temperature.toFixed(1)}°C，目标范围 ${zone.targetTemperature.min}-${zone.targetTemperature.max}°C`,
          timestamp: this.currentSimTimestamp,
          zoneId: zone.id,
          resolved: false,
        };
        await db.addAlert(alert);
        this.state.stats.totalAlerts++;
        this.addEvent({
          type: 'alert',
          severity: alert.severity,
          message: alert.message,
        });
        if (this.onAlert) this.onAlert(alert);
      }

      if (isHumidityLow || isHumidityHigh) {
        const alert: Alert = {
          id: `alert-hum-${this.currentSimTimestamp}-${zone.id}`,
          type: 'humidity',
          severity: 'warning',
          message: `${zone.name}湿度${isHumidityLow ? '过低' : '过高'}：${latest.humidity.toFixed(0)}%，目标范围 ${zone.targetHumidity.min}-${zone.targetHumidity.max}%`,
          timestamp: this.currentSimTimestamp,
          zoneId: zone.id,
          resolved: false,
        };
        await db.addAlert(alert);
        this.state.stats.totalAlerts++;
        this.addEvent({
          type: 'alert',
          severity: alert.severity,
          message: alert.message,
        });
        if (this.onAlert) this.onAlert(alert);
      }
    }
  }

  private async checkDrinkingWindows(bottles: WineBottle[], labels: WineLabel[]) {
    if (this.state.totalSimulatedDays % 7 !== 0) return;

    let newPeakCount = 0;

    for (const bottle of bottles.slice(0, 20)) {
      const label = labels.find(l => l.id === bottle.labelId);
      if (!label) continue;

      const zone = await db.getAllCellarZones().then(z => z.find(z2 => z2.id === bottle.location.zoneId));
      if (!zone) continue;

      const maturation = await db.getMaturationModel(bottle.id);
      if (!maturation) continue;

      const readings = await db.getSensorReadingsByZone(
        zone.id,
        this.currentSimTimestamp - 86400000 * 7,
        this.currentSimTimestamp
      );

      try {
        const window = await drinkingWindowPredictor.predictWindow(
          label, bottle, maturation, readings, zone, { scenario: 'optimal' }
        );

        const existingWindow = await db.getDrinkingWindow(bottle.id);
        const wasBeforePeak = existingWindow
          ? this.currentSimTimestamp < existingWindow.peakDate
          : this.currentSimTimestamp < window.peakDate;
        const isNowAtPeak = this.currentSimTimestamp >= window.peakDate;

        if (wasBeforePeak && isNowAtPeak) {
          newPeakCount++;
          this.addEvent({
            type: 'drinking_window',
            severity: 'info',
            message: `${label.chateau} ${label.vintage} 已进入巅峰适饮期！`,
            data: { wineId: bottle.id, chateau: label.chateau, vintage: label.vintage },
          });
        }

        await db.addDrinkingWindow(window);
        this.state.stats.predictionsRun++;

        if (this.onDrinkingWindowUpdate) {
          this.onDrinkingWindowUpdate(window);
        }
      } catch {
        // skip prediction failures
      }
    }

    this.state.stats.winesEnteringPeak += newPeakCount;
  }

  async reset() {
    this.stop();
    this.currentSimTimestamp = Date.now();
    this.state = {
      isRunning: false,
      speed: 'paused',
      elapsedHours: 0,
      totalSimulatedDays: 0,
      eventLog: [],
      stats: {
        totalSensorReadings: 0,
        totalAlerts: 0,
        maturationUpdates: 0,
        predictionsRun: 0,
        anomaliesDetected: 0,
        winesEnteringPeak: 0,
      },
    };
    this.addEvent({
      type: 'system',
      severity: 'info',
      message: '仿真引擎已重置',
    });
    this.notify();
  }

  destroy() {
    this.stop();
    this.listeners.clear();
  }
}

export const simulationEngine = new SimulationEngine();
