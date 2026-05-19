import type { MPCPrediction, FanControl, OxygenData, EfficiencyData } from '$lib/types';

export interface MPCConfig {
  predictionHorizon: number;
  controlHorizon: number;
  oxygenSetpoint: number;
  lambda: number;
  constraints: {
    forcedDraftMin: number;
    forcedDraftMax: number;
    inducedDraftMin: number;
    inducedDraftMax: number;
    damperMin: number;
    damperMax: number;
    oxygenMin: number;
    oxygenMax: number;
    deltaForcedDraftMax: number;
    deltaInducedDraftMax: number;
    deltaDamperMax: number;
  };
}

export const DEFAULT_MPC_CONFIG: MPCConfig = {
  predictionHorizon: 30,
  controlHorizon: 10,
  oxygenSetpoint: 3.5,
  lambda: 0.1,
  constraints: {
    forcedDraftMin: 30,
    forcedDraftMax: 100,
    inducedDraftMin: 30,
    inducedDraftMax: 100,
    damperMin: 20,
    damperMax: 100,
    oxygenMin: 1.0,
    oxygenMax: 8.0,
    deltaForcedDraftMax: 5,
    deltaInducedDraftMax: 5,
    deltaDamperMax: 3
  }
};

export class ARXModel {
  private a: number[];
  private b: number[];
  private na: number;
  private nb: number;

  constructor(na: number = 3, nb: number = 3) {
    this.na = na;
    this.nb = nb;
    this.a = new Array(na).fill(0);
    this.b = new Array(nb).fill(0);
    this.a[0] = 0.8;
    this.b[0] = 0.15;
    this.b[1] = 0.1;
    this.b[2] = 0.05;
  }

  predict(yHistory: number[], uHistory: number[]): number {
    let yPred = 0;
    for (let i = 0; i < this.na && i < yHistory.length; i++) {
      yPred += this.a[i] * yHistory[yHistory.length - 1 - i];
    }
    for (let j = 0; j < this.nb && j < uHistory.length; j++) {
      yPred += this.b[j] * uHistory[uHistory.length - 1 - j];
    }
    return yPred;
  }

  update(yHistory: number[], uHistory: number[], yActual: number, learningRate: number = 0.01): void {
    const yPred = this.predict(yHistory, uHistory);
    const error = yActual - yPred;

    for (let i = 0; i < this.na && i < yHistory.length; i++) {
      this.a[i] += learningRate * error * yHistory[yHistory.length - 1 - i];
    }
    for (let j = 0; j < this.nb && j < uHistory.length; j++) {
      this.b[j] += learningRate * error * uHistory[uHistory.length - 1 - j];
    }
  }
}

export class MPCController {
  private config: MPCConfig;
  private oxygenModel: ARXModel;
  private efficiencyModel: ARXModel;
  private oxygenHistory: number[];
  private efficiencyHistory: number[];
  private controlHistory: number[];
  private predictionCount: number;
  private errorSum: number;

  constructor(config: MPCConfig = DEFAULT_MPC_CONFIG) {
    this.config = config;
    this.oxygenModel = new ARXModel(3, 3);
    this.efficiencyModel = new ARXModel(3, 3);
    this.oxygenHistory = [];
    this.efficiencyHistory = [];
    this.controlHistory = [];
    this.predictionCount = 0;
    this.errorSum = 0;
  }

  updateConfig(config: Partial<MPCConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MPCConfig {
    return { ...this.config };
  }

  addHistoricalData(
    oxygenData: OxygenData,
    efficiencyData: EfficiencyData,
    control: FanControl
  ): void {
    this.oxygenHistory.push(oxygenData.value);
    this.efficiencyHistory.push(efficiencyData.value);
    this.controlHistory.push(control.forcedDraftSpeed);

    const maxHistory = Math.max(this.config.predictionHorizon * 2, 100);
    if (this.oxygenHistory.length > maxHistory) {
      this.oxygenHistory.shift();
      this.efficiencyHistory.shift();
      this.controlHistory.shift();
    }

    if (this.oxygenHistory.length > 5) {
      this.oxygenModel.update(
        this.oxygenHistory.slice(0, -1),
        this.controlHistory.slice(0, -1),
        oxygenData.value
      );
      this.efficiencyModel.update(
        this.efficiencyHistory.slice(0, -1),
        this.controlHistory.slice(0, -1),
        efficiencyData.value
      );
    }
  }

  predict(currentControl: FanControl): MPCPrediction {
    const { predictionHorizon, oxygenSetpoint } = this.config;
    const { constraints } = this.config;

    const predictedOxygen: number[] = [];
    const predictedEfficiency: number[] = [];

    let currentOxygen = this.oxygenHistory.length > 0 ? this.oxygenHistory[this.oxygenHistory.length - 1] : 3.5;
    let currentEfficiency = this.efficiencyHistory.length > 0 ? this.efficiencyHistory[this.efficiencyHistory.length - 1] : 92;
    let currentFD = currentControl.forcedDraftSpeed;
    let currentID = currentControl.inducedDraftSpeed;
    let currentDamper = currentControl.damperOpening;

    for (let i = 0; i < predictionHorizon; i++) {
      const oxygenError = oxygenSetpoint - currentOxygen;
      const controlAction = oxygenError * 0.3;

      const newFD = Math.max(
        constraints.forcedDraftMin,
        Math.min(constraints.forcedDraftMax, currentFD + controlAction)
      );
      const newID = Math.max(
        constraints.inducedDraftMin,
        Math.min(constraints.inducedDraftMax, currentID + controlAction * 0.9)
      );
      const newDamper = Math.max(
        constraints.damperMin,
        Math.min(constraints.damperMax, currentDamper + controlAction * 0.5)
      );

      const controlInput = (newFD + newID) / 2;
      this.controlHistory.push(controlInput);

      const yOxygenHist = [...this.oxygenHistory, ...predictedOxygen];
      const uHist = [...this.controlHistory];
      currentOxygen = this.oxygenModel.predict(yOxygenHist, uHist);
      currentOxygen = Math.max(constraints.oxygenMin, Math.min(constraints.oxygenMax, currentOxygen));

      const yEffHist = [...this.efficiencyHistory, ...predictedEfficiency];
      currentEfficiency = this.efficiencyModel.predict(yEffHist, uHist);
      currentEfficiency = Math.max(80, Math.min(98, currentEfficiency));

      predictedOxygen.push(currentOxygen);
      predictedEfficiency.push(currentEfficiency);

      currentFD = newFD;
      currentID = newID;
      currentDamper = newDamper;

      this.controlHistory.pop();
    }

    const finalControl = this.clampControl({
      timestamp: Date.now(),
      forcedDraftSpeed: currentFD,
      inducedDraftSpeed: currentID,
      damperOpening: currentDamper,
      oxygenSetpoint: oxygenSetpoint
    }, currentControl);

    const lastOxygen = this.oxygenHistory.length > 0 ? this.oxygenHistory[this.oxygenHistory.length - 1] : 3.5;
    const predictionError = Math.abs(predictedOxygen[0] - lastOxygen);
    this.errorSum += predictionError;
    this.predictionCount++;

    const confidence = Math.max(0.5, 1 - this.errorSum / (this.predictionCount * 5));

    return {
      timestamp: Date.now(),
      horizon: predictionHorizon,
      predictedOxygen,
      predictedEfficiency,
      optimizedParams: finalControl,
      confidence
    };
  }

  private clampControl(newControl: FanControl, oldControl: FanControl): FanControl {
    const { constraints } = this.config;

    const deltaFD = newControl.forcedDraftSpeed - oldControl.forcedDraftSpeed;
    const deltaID = newControl.inducedDraftSpeed - oldControl.inducedDraftSpeed;
    const deltaDamper = newControl.damperOpening - oldControl.damperOpening;

    return {
      ...newControl,
      forcedDraftSpeed: Math.max(
        oldControl.forcedDraftSpeed - constraints.deltaForcedDraftMax,
        Math.min(oldControl.forcedDraftSpeed + constraints.deltaForcedDraftMax, newControl.forcedDraftSpeed)
      ),
      inducedDraftSpeed: Math.max(
        oldControl.inducedDraftSpeed - constraints.deltaInducedDraftMax,
        Math.min(oldControl.inducedDraftSpeed + constraints.deltaInducedDraftMax, newControl.inducedDraftSpeed)
      ),
      damperOpening: Math.max(
        oldControl.damperOpening - constraints.deltaDamperMax,
        Math.min(oldControl.damperOpening + constraints.deltaDamperMax, newControl.damperOpening)
      )
    };
  }

  getModelAccuracy(): number {
    if (this.predictionCount === 0) return 0.9;
    return Math.max(0.5, 1 - this.errorSum / (this.predictionCount * 5));
  }

  getErrorRate(): number {
    if (this.predictionCount === 0) return 0;
    return this.errorSum / this.predictionCount;
  }

  getPredictionCount(): number {
    return this.predictionCount;
  }

  reset(): void {
    this.oxygenHistory = [];
    this.efficiencyHistory = [];
    this.controlHistory = [];
    this.predictionCount = 0;
    this.errorSum = 0;
  }

  getDataCount(): number {
    return this.oxygenHistory.length;
  }
}

export const mpcController = new MPCController();
