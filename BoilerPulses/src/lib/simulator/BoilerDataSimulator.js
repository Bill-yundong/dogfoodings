import { boilerState, systemStatus, efficiencyTrend, oxygenHistory } from '../stores/boilerStore.js';
import { BOILER_CONSTANTS, ANOMALY_THRESHOLDS } from '../constants/boilerConstants.js';

export class BoilerDataSimulator {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.dataPointCount = 0;
    this.anomalyMode = null;
    this.anomalyDuration = 0;
  }

  start(intervalMs = 1000) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.interval = setInterval(() => this.generateData(), intervalMs);
  }

  stop() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  generateData() {
    boilerState.update(state => {
      const baseOxygen = BOILER_CONSTANTS.OXYGEN_OPTIMAL_RANGE.target;
      const baseTemp = BOILER_CONSTANTS.TEMPERATURE_OPTIMAL_RANGE.target;
      const basePressure = BOILER_CONSTANTS.PRESSURE_OPTIMAL_RANGE.target;
      let oxygen = baseOxygen + (Math.random() - 0.5) * 0.8;
      let temperature = baseTemp + (Math.random() - 0.5) * 30;
      let pressure = basePressure + (Math.random() - 0.5) * 2;
      let co = 20 + Math.random() * 20;
      let nox = 50 + Math.random() * 40;
      if (this.anomalyMode) {
        const anomalyEffect = this.applyAnomaly(oxygen, temperature, pressure);
        oxygen = anomalyEffect.oxygen;
        temperature = anomalyEffect.temperature;
        pressure = anomalyEffect.pressure;
        co = anomalyEffect.co;
        nox = anomalyEffect.nox;
        this.anomalyDuration--;
        if (this.anomalyDuration <= 0) {
          this.anomalyMode = null;
        }
      }
      const fuelFactor = state.fuelFlow / 75;
      const airRatio = (state.primaryAir + state.secondaryAir) / (state.fuelFlow * 1.5);
      oxygen = oxygen * (1.5 / airRatio);
      temperature = temperature * fuelFactor * 0.9 + 100;
      const draftBalance = state.forcedDraft - state.inducedDraft;
      pressure = 12 + draftBalance * 0.15;
      const excessAir = airRatio;
      const efficiency = this.calculateEfficiency(oxygen, temperature, co, nox, excessAir);
      const anomalyDetected = this.detectAnomaly(oxygen, temperature, pressure, co, nox, efficiency);
      this.dataPointCount++;
      const newState = {
        ...state,
        timestamp: Date.now(),
        oxygen: Math.max(0, Math.min(10, oxygen)),
        temperature: Math.max(700, Math.min(1100, temperature)),
        pressure: Math.max(5, Math.min(25, pressure)),
        co: Math.max(0, co),
        nox: Math.max(0, nox),
        efficiency: Math.max(70, Math.min(98, efficiency)),
        excessAir,
        anomalyDetected: anomalyDetected.detected,
        anomalyType: anomalyDetected.type
      };
      this.updateHistory(newState);
      return newState;
    });
    systemStatus.update(status => ({
      ...status,
      lastUpdate: Date.now(),
      dataPoints: this.dataPointCount,
      uptime: status.uptime + 1
    }));
  }

  calculateEfficiency(oxygen, temperature, co, nox, excessAir) {
    const oxyLoss = Math.abs(oxygen - 4.2) * 1.2;
    const tempLoss = Math.abs(temperature - 900) * 0.02;
    const coLoss = co * 0.15;
    const noxLoss = nox * 0.05;
    const airLoss = Math.abs(excessAir - 1.25) * 8;
    return 97 - oxyLoss - tempLoss - coLoss - noxLoss - airLoss;
  }

  detectAnomaly(oxygen, temperature, pressure, co, nox, efficiency) {
    if (oxygen > ANOMALY_THRESHOLDS.oxygenHigh) {
      return { detected: true, type: 'oxygen_high' };
    }
    if (oxygen < ANOMALY_THRESHOLDS.oxygenLow) {
      return { detected: true, type: 'oxygen_low' };
    }
    if (temperature > ANOMALY_THRESHOLDS.tempHigh) {
      return { detected: true, type: 'temperature_high' };
    }
    if (temperature < ANOMALY_THRESHOLDS.tempLow) {
      return { detected: true, type: 'temperature_low' };
    }
    if (pressure > ANOMALY_THRESHOLDS.pressureHigh || pressure < ANOMALY_THRESHOLDS.pressureLow) {
      return { detected: true, type: 'pressure_abnormal' };
    }
    if (co > 100 || nox > 200) {
      return { detected: true, type: 'emission_exceed' };
    }
    return { detected: false, type: null };
  }

  applyAnomaly(oxygen, temperature, pressure) {
    switch (this.anomalyMode) {
      case 'oxygen_high':
        return {
          oxygen: oxygen + 3 + Math.random() * 2,
          temperature: temperature - 20 + Math.random() * 10,
          pressure: pressure + 1,
          co: 80 + Math.random() * 40,
          nox: 120 + Math.random() * 60
        };
      case 'oxygen_low':
        return {
          oxygen: Math.max(0.5, oxygen - 2 - Math.random()),
          temperature: temperature + 30 + Math.random() * 20,
          pressure: pressure - 2,
          co: 150 + Math.random() * 100,
          nox: 180 + Math.random() * 80
        };
      case 'temperature_spike':
        return {
          oxygen: oxygen + 1,
          temperature: temperature + 100 + Math.random() * 50,
          pressure: pressure + 3,
          co: 60 + Math.random() * 30,
          nox: 200 + Math.random() * 100
        };
      case 'instability':
        return {
          oxygen: oxygen + (Math.random() - 0.5) * 4,
          temperature: temperature + (Math.random() - 0.5) * 80,
          pressure: pressure + (Math.random() - 0.5) * 6,
          co: 40 + Math.random() * 80,
          nox: 80 + Math.random() * 120
        };
      default:
        return { oxygen, temperature, pressure, co: 25, nox: 65 };
    }
  }

  triggerAnomaly(type, duration = 30) {
    this.anomalyMode = type;
    this.anomalyDuration = duration;
  }

  updateHistory(state) {
    const point = {
      timestamp: state.timestamp,
      value: state.oxygen,
      temperature: state.temperature,
      efficiency: state.efficiency,
      pressure: state.pressure,
      co: state.co,
      nox: state.nox
    };
    oxygenHistory.update(history => {
      const updated = [...history, point];
      return updated.slice(-300);
    });
    efficiencyTrend.update(trend => {
      const updated = [...trend, { timestamp: state.timestamp, value: state.efficiency }];
      return updated.slice(-300);
    });
  }

  setControlParameter(param, value) {
    boilerState.update(state => ({
      ...state,
      [param]: value
    }));
  }

  applyMPCOptimization(controls) {
    boilerState.update(state => ({
      ...state,
      ...controls
    }));
  }
}

export const boilerSimulator = new BoilerDataSimulator();
