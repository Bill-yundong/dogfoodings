import type { OxygenData, EfficiencyData, FanControl, WaveformSnapshot, WaveformChannel } from '$lib/types';
import { generateUUID } from '../sync';

export interface DetectionThresholds {
  oxygenMin: number;
  oxygenMax: number;
  efficiencyMin: number;
  oxygenRateOfChange: number;
  fanSpeedDeviation: number;
}

export const DEFAULT_THRESHOLDS: DetectionThresholds = {
  oxygenMin: 1.5,
  oxygenMax: 7.0,
  efficiencyMin: 85,
  oxygenRateOfChange: 0.5,
  fanSpeedDeviation: 10
};

export interface AnomalyEvent {
  id: string;
  type: string;
  severity: 'warning' | 'error';
  timestamp: number;
  description: string;
  value: number;
  threshold: number;
  channel: string;
}

export class AnomalyDetector {
  private thresholds: DetectionThresholds;
  private oxygenHistory: { value: number; timestamp: number }[];
  private anomalyListeners: ((event: AnomalyEvent) => void)[];
  private ewma: number;
  private ewmaLambda: number;
  private cusumPos: number;
  private cusumNeg: number;
  private cusumThreshold: number;

  constructor(thresholds: DetectionThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
    this.oxygenHistory = [];
    this.anomalyListeners = [];
    this.ewma = 3.5;
    this.ewmaLambda = 0.3;
    this.cusumPos = 0;
    this.cusumNeg = 0;
    this.cusumThreshold = 3;
  }

  addAnomalyListener(callback: (event: AnomalyEvent) => void): void {
    this.anomalyListeners.push(callback);
  }

  removeAnomalyListener(callback: (event: AnomalyEvent) => void): void {
    const index = this.anomalyListeners.indexOf(callback);
    if (index > -1) {
      this.anomalyListeners.splice(index, 1);
    }
  }

  updateThresholds(thresholds: Partial<DetectionThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  getThresholds(): DetectionThresholds {
    return { ...this.thresholds };
  }

  processOxygenData(data: OxygenData): AnomalyEvent | null {
    const { value, timestamp } = data;
    const { oxygenMin, oxygenMax, oxygenRateOfChange } = this.thresholds;

    this.oxygenHistory.push({ value, timestamp });
    if (this.oxygenHistory.length > 100) {
      this.oxygenHistory.shift();
    }

    this.ewma = this.ewmaLambda * value + (1 - this.ewmaLambda) * this.ewma;
    const deviation = value - this.ewma;
    this.cusumPos = Math.max(0, this.cusumPos + deviation - 0.5);
    this.cusumNeg = Math.max(0, this.cusumNeg - deviation - 0.5);

    if (value < oxygenMin) {
      return this.createAnomaly(
        'oxygen_low',
        'error',
        timestamp,
        `烟气氧含量过低: ${value.toFixed(2)}%`,
        value,
        oxygenMin,
        'oxygen'
      );
    }

    if (value > oxygenMax) {
      return this.createAnomaly(
        'oxygen_high',
        'warning',
        timestamp,
        `烟气氧含量过高: ${value.toFixed(2)}%`,
        value,
        oxygenMax,
        'oxygen'
      );
    }

    if (this.oxygenHistory.length > 1) {
      const prev = this.oxygenHistory[this.oxygenHistory.length - 2];
      const dt = (timestamp - prev.timestamp) / 1000;
      if (dt > 0) {
        const rate = Math.abs((value - prev.value) / dt);
        if (rate > oxygenRateOfChange) {
          return this.createAnomaly(
            'oxygen_rapid_change',
            'warning',
            timestamp,
            `氧含量变化过快: ${rate.toFixed(3)}%/s`,
            rate,
            oxygenRateOfChange,
            'oxygen'
          );
        }
      }
    }

    if (this.cusumPos > this.cusumThreshold || this.cusumNeg > this.cusumThreshold) {
      return this.createAnomaly(
        'oxygen_drift',
        'warning',
        timestamp,
        `氧含量漂移检测`,
        this.cusumPos > this.cusumThreshold ? this.cusumPos : -this.cusumNeg,
        this.cusumThreshold,
        'oxygen'
      );
    }

    return null;
  }

  processEfficiencyData(data: EfficiencyData): AnomalyEvent | null {
    const { value, timestamp } = data;
    const { efficiencyMin } = this.thresholds;

    if (value < efficiencyMin) {
      return this.createAnomaly(
        'efficiency_low',
        'error',
        timestamp,
        `热效率过低: ${value.toFixed(2)}%`,
        value,
        efficiencyMin,
        'efficiency'
      );
    }

    return null;
  }

  processFanControl(control: FanControl): AnomalyEvent | null {
    const { forcedDraftSpeed, inducedDraftSpeed, timestamp } = control;
    const { fanSpeedDeviation } = this.thresholds;

    const speedDiff = Math.abs(forcedDraftSpeed - inducedDraftSpeed);
    if (speedDiff > fanSpeedDeviation) {
      return this.createAnomaly(
        'fan_mismatch',
        'warning',
        timestamp,
        `送引风机转速偏差过大: ${speedDiff.toFixed(2)}%`,
        speedDiff,
        fanSpeedDeviation,
        'fan'
      );
    }

    return null;
  }

  createSnapshot(
    startTime: number,
    endTime: number,
    triggerType: string,
    oxygenData: OxygenData[],
    efficiencyData: EfficiencyData[],
    fanData: FanControl[]
  ): WaveformSnapshot {
    const oxygenChannel: WaveformChannel = {
      name: '烟气氧含量',
      unit: '%',
      data: oxygenData.map((d) => d.value),
      timestamps: oxygenData.map((d) => d.timestamp)
    };

    const efficiencyChannel: WaveformChannel = {
      name: '热效率',
      unit: '%',
      data: efficiencyData.map((d) => d.value),
      timestamps: efficiencyData.map((d) => d.timestamp)
    };

    const fdChannel: WaveformChannel = {
      name: '送风机转速',
      unit: '%',
      data: fanData.map((d) => d.forcedDraftSpeed),
      timestamps: fanData.map((d) => d.timestamp)
    };

    const idChannel: WaveformChannel = {
      name: '引风机转速',
      unit: '%',
      data: fanData.map((d) => d.inducedDraftSpeed),
      timestamps: fanData.map((d) => d.timestamp)
    };

    return {
      id: generateUUID(),
      startTime,
      endTime,
      triggerType,
      channels: [oxygenChannel, efficiencyChannel, fdChannel, idChannel],
      tags: [],
      notes: '',
      createdAt: Date.now()
    };
  }

  private createAnomaly(
    type: string,
    severity: 'warning' | 'error',
    timestamp: number,
    description: string,
    value: number,
    threshold: number,
    channel: string
  ): AnomalyEvent {
    const event: AnomalyEvent = {
      id: generateUUID(),
      type,
      severity,
      timestamp,
      description,
      value,
      threshold,
      channel
    };

    this.anomalyListeners.forEach((cb) => cb(event));
    return event;
  }

  reset(): void {
    this.oxygenHistory = [];
    this.ewma = 3.5;
    this.cusumPos = 0;
    this.cusumNeg = 0;
  }
}

export const anomalyDetector = new AnomalyDetector();
