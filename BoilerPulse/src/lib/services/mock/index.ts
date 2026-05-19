import type { OxygenData, EfficiencyData, FanControl } from '$lib/types';

export class DataSimulator {
  private baseTime: number;
  private oxygenLevel: number;
  private efficiency: number;
  private forcedDraftSpeed: number;
  private inducedDraftSpeed: number;
  private damperOpening: number;
  private oxygenSetpoint: number;
  private load: number;
  private coalConsumption: number;
  private steamOutput: number;
  private anomalyMode: boolean;
  private anomalyTimer: number;

  constructor() {
    this.baseTime = Date.now();
    this.oxygenLevel = 3.5;
    this.efficiency = 92.5;
    this.forcedDraftSpeed = 75;
    this.inducedDraftSpeed = 72;
    this.damperOpening = 65;
    this.oxygenSetpoint = 3.5;
    this.load = 80;
    this.coalConsumption = 45;
    this.steamOutput = 180;
    this.anomalyMode = false;
    this.anomalyTimer = 0;
  }

  setOxygenSetpoint(value: number): void {
    this.oxygenSetpoint = value;
  }

  setFanControl(control: Partial<FanControl>): void {
    if (control.forcedDraftSpeed !== undefined) {
      this.forcedDraftSpeed = control.forcedDraftSpeed;
    }
    if (control.inducedDraftSpeed !== undefined) {
      this.inducedDraftSpeed = control.inducedDraftSpeed;
    }
    if (control.damperOpening !== undefined) {
      this.damperOpening = control.damperOpening;
    }
    if (control.oxygenSetpoint !== undefined) {
      this.oxygenSetpoint = control.oxygenSetpoint;
    }
  }

  triggerAnomaly(duration: number = 10): void {
    this.anomalyMode = true;
    this.anomalyTimer = duration;
  }

  generateOxygenData(source: 'DCS' | 'FSSS' = 'DCS'): OxygenData {
    const noise = (Math.random() - 0.5) * 0.1;
    const controlEffect = (this.forcedDraftSpeed - 75) * 0.02;
    const setpointEffect = (this.oxygenSetpoint - this.oxygenLevel) * 0.1;

    let anomalyEffect = 0;
    if (this.anomalyMode && this.anomalyTimer > 0) {
      anomalyEffect = Math.sin(Date.now() * 0.01) * 2;
      this.anomalyTimer--;
      if (this.anomalyTimer <= 0) {
        this.anomalyMode = false;
      }
    }

    this.oxygenLevel += noise + controlEffect + setpointEffect + anomalyEffect;
    this.oxygenLevel = Math.max(1.0, Math.min(8.0, this.oxygenLevel));

    return {
      timestamp: Date.now(),
      value: parseFloat(this.oxygenLevel.toFixed(3)),
      deviceId: `O2-${source}-001`,
      quality: 'good',
      source
    };
  }

  generateEfficiencyData(): EfficiencyData {
    const oxygenDeviation = Math.abs(this.oxygenLevel - this.oxygenSetpoint);
    const efficiencyPenalty = oxygenDeviation * 0.5;
    const noise = (Math.random() - 0.5) * 0.2;

    this.efficiency = 95 - efficiencyPenalty + noise;
    this.efficiency = Math.max(80, Math.min(98, this.efficiency));

    this.coalConsumption = 40 + (100 - this.efficiency) * 0.8;
    this.steamOutput = 150 + this.load * 0.5;

    return {
      timestamp: Date.now(),
      value: parseFloat(this.efficiency.toFixed(2)),
      coalConsumption: parseFloat(this.coalConsumption.toFixed(2)),
      steamOutput: parseFloat(this.steamOutput.toFixed(2))
    };
  }

  generateFanControl(): FanControl {
    const fdNoise = (Math.random() - 0.5) * 0.5;
    const idNoise = (Math.random() - 0.5) * 0.5;
    const damperNoise = (Math.random() - 0.5) * 0.3;

    return {
      timestamp: Date.now(),
      forcedDraftSpeed: parseFloat((this.forcedDraftSpeed + fdNoise).toFixed(2)),
      inducedDraftSpeed: parseFloat((this.inducedDraftSpeed + idNoise).toFixed(2)),
      damperOpening: parseFloat((this.damperOpening + damperNoise).toFixed(2)),
      oxygenSetpoint: this.oxygenSetpoint
    };
  }

  generateHistoricalData(startTime: number, endTime: number, interval: number = 1000): {
    oxygenData: OxygenData[];
    efficiencyData: EfficiencyData[];
    fanData: FanControl[];
  } {
    const oxygenData: OxygenData[] = [];
    const efficiencyData: EfficiencyData[] = [];
    const fanData: FanControl[] = [];

    for (let t = startTime; t <= endTime; t += interval) {
      const savedTime = this.baseTime;
      this.baseTime = t;
      oxygenData.push(this.generateOxygenData());
      efficiencyData.push(this.generateEfficiencyData());
      fanData.push(this.generateFanControl());
      this.baseTime = savedTime;
    }

    return { oxygenData, efficiencyData, fanData };
  }

  reset(): void {
    this.oxygenLevel = 3.5;
    this.efficiency = 92.5;
    this.forcedDraftSpeed = 75;
    this.inducedDraftSpeed = 72;
    this.damperOpening = 65;
    this.anomalyMode = false;
    this.anomalyTimer = 0;
  }
}

export const dataSimulator = new DataSimulator();
