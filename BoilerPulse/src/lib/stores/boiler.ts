import { writable, derived } from 'svelte/store';
import type { OxygenData, EfficiencyData, FanControl, MPCPrediction, SystemStatus, ControlMode } from '$lib/types';
import { dataSimulator } from '$lib/services/mock';
import { syncEngine } from '$lib/services/sync';
import { mpcController } from '$lib/services/mpc';
import { anomalyDetector, type AnomalyEvent } from '$lib/services/detector';
import { saveSnapshot } from '$lib/db/snapshot';

class BoilerStore {
  oxygenData = writable<OxygenData[]>([]);
  efficiencyData = writable<EfficiencyData[]>([]);
  fanControlData = writable<FanControl[]>([]);
  mpcPrediction = writable<MPCPrediction | null>(null);
  anomalies = writable<AnomalyEvent[]>([]);
  systemStatus = writable<SystemStatus>('offline');
  controlMode = writable<ControlMode>('manual');
  isRunning = writable(false);

  private updateInterval: number | null = null;
  private oxygenBuffer: OxygenData[] = [];
  private efficiencyBuffer: EfficiencyData[] = [];
  private fanBuffer: FanControl[] = [];
  private readonly maxBufferSize = 3600;

  readonly currentOxygen = derived(this.oxygenData, ($oxygenData) => {
    return $oxygenData.length > 0 ? $oxygenData[$oxygenData.length - 1] : null;
  });

  readonly currentEfficiency = derived(this.efficiencyData, ($efficiencyData) => {
    return $efficiencyData.length > 0 ? $efficiencyData[$efficiencyData.length - 1] : null;
  });

  readonly currentFanControl = derived(this.fanControlData, ($fanControlData) => {
    return $fanControlData.length > 0 ? $fanControlData[$fanControlData.length - 1] : null;
  });

  readonly averageEfficiency = derived(this.efficiencyData, ($efficiencyData) => {
    if ($efficiencyData.length === 0) return 0;
    const recent = $efficiencyData.slice(-60);
    return recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
  });

  readonly averageOxygen = derived(this.oxygenData, ($oxygenData) => {
    if ($oxygenData.length === 0) return 0;
    const recent = $oxygenData.slice(-60);
    return recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
  });

  constructor() {
    anomalyDetector.addAnomalyListener((event) => {
      this.handleAnomaly(event);
    });
  }

  start(): void {
    this.isRunning.update(() => true);
    this.systemStatus.update(() => 'running');
    this.updateInterval = window.setInterval(() => this.tick(), 1000);
  }

  stop(): void {
    this.isRunning.update(() => false);
    this.systemStatus.update(() => 'offline');
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  setControlMode(mode: ControlMode): void {
    this.controlMode.update(() => mode);
  }

  setFanControl(control: Partial<FanControl>): void {
    dataSimulator.setFanControl(control);
  }

  setOxygenSetpoint(value: number): void {
    dataSimulator.setOxygenSetpoint(value);
    mpcController.updateConfig({ oxygenSetpoint: value });
  }

  triggerAnomaly(): void {
    dataSimulator.triggerAnomaly(15);
  }

  private tick(): void {
    const oxygen = dataSimulator.generateOxygenData('DCS');
    const efficiency = dataSimulator.generateEfficiencyData();
    const fanControl = dataSimulator.generateFanControl();

    syncEngine.processOxygenData(oxygen);
    syncEngine.processEfficiencyData(efficiency);
    syncEngine.processFanControl(fanControl);

    this.oxygenData.update((arr) => {
      arr.push(oxygen);
      if (arr.length > this.maxBufferSize) arr.shift();
      return arr;
    });

    this.efficiencyData.update((arr) => {
      arr.push(efficiency);
      if (arr.length > this.maxBufferSize) arr.shift();
      return arr;
    });

    this.fanControlData.update((arr) => {
      arr.push(fanControl);
      if (arr.length > this.maxBufferSize) arr.shift();
      return arr;
    });

    this.oxygenBuffer.push(oxygen);
    this.efficiencyBuffer.push(efficiency);
    this.fanBuffer.push(fanControl);

    const anomaly1 = anomalyDetector.processOxygenData(oxygen);
    const anomaly2 = anomalyDetector.processEfficiencyData(efficiency);
    const anomaly3 = anomalyDetector.processFanControl(fanControl);

    if (anomaly1 || anomaly2 || anomaly3) {
      this.systemStatus.update(() => 'warning');
    } else {
      this.systemStatus.update(() => 'running');
    }

    mpcController.addHistoricalData(oxygen, efficiency, fanControl);

    this.fanControlData.subscribe(($fanControlData) => {
      if ($fanControlData.length % 5 === 0) {
        const prediction = mpcController.predict(fanControl);
        this.mpcPrediction.update(() => prediction);

        this.controlMode.subscribe(($controlMode) => {
          if ($controlMode === 'auto') {
            dataSimulator.setFanControl({
              forcedDraftSpeed: prediction.optimizedParams.forcedDraftSpeed,
              inducedDraftSpeed: prediction.optimizedParams.inducedDraftSpeed,
              damperOpening: prediction.optimizedParams.damperOpening
            });
          }
        })();
      }
    })();
  }

  private handleAnomaly(event: AnomalyEvent): void {
    this.anomalies.update((arr) => {
      arr.push(event);
      if (arr.length > 100) arr.shift();
      return arr;
    });

    const now = Date.now();
    const startTime = now - 30000;

    const oxygenSnapshot = this.oxygenBuffer.filter((d) => d.timestamp >= startTime);
    const efficiencySnapshot = this.efficiencyBuffer.filter((d) => d.timestamp >= startTime);
    const fanSnapshot = this.fanBuffer.filter((d) => d.timestamp >= startTime);

    if (oxygenSnapshot.length > 0) {
      const snapshot = anomalyDetector.createSnapshot(
        startTime,
        now,
        event.type,
        oxygenSnapshot,
        efficiencySnapshot,
        fanSnapshot
      );
      saveSnapshot(snapshot).catch(console.error);
    }

    this.systemStatus.update(() => (event.severity === 'error' ? 'error' : 'warning'));
  }

  reset(): void {
    this.stop();
    this.oxygenData.set([]);
    this.efficiencyData.set([]);
    this.fanControlData.set([]);
    this.anomalies.set([]);
    this.oxygenBuffer = [];
    this.efficiencyBuffer = [];
    this.fanBuffer = [];
    this.mpcPrediction.set(null);
    dataSimulator.reset();
    mpcController.reset();
    anomalyDetector.reset();
  }
}

export const boilerStore = new BoilerStore();
