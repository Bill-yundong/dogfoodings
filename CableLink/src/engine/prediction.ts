import type { TemperaturePoint, CableParameters, PredictionResult } from '@/types';
import { solveHeatEquationFD, calculateSafeCurrent } from './thermal';

export class ARIMAPredictor {
  private p: number;
  private d: number;
  private coefficients: number[] = [];

  constructor(p: number = 3, d: number = 1) {
    this.p = p;
    this.d = d;
  }

  private difference(series: number[], order: number): number[] {
    let result = [...series];
    for (let i = 0; i < order; i++) {
      const diff: number[] = [];
      for (let j = 1; j < result.length; j++) {
        diff.push(result[j] - result[j - 1]);
      }
      result = diff;
    }
    return result;
  }

  private fitAR(series: number[]): number[] {
    const n = series.length;
    if (n < this.p + 1) return new Array(this.p).fill(0);

    const X: number[][] = [];
    const y: number[] = [];

    for (let i = this.p; i < n; i++) {
      const row: number[] = [];
      for (let j = 1; j <= this.p; j++) {
        row.push(series[i - j]);
      }
      X.push(row);
      y.push(series[i]);
    }

    const coefficients = this.solveLinearSystem(X, y);
    return coefficients;
  }

  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A[0].length;
    const AtA: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    const Atb: number[] = Array(n).fill(0);

    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < n; j++) {
        Atb[j] += A[i][j] * b[i];
        for (let k = 0; k < n; k++) {
          AtA[j][k] += A[i][j] * A[i][k];
        }
      }
    }

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(AtA[j][i]) > Math.abs(AtA[maxRow][i])) {
          maxRow = j;
        }
      }
      [AtA[i], AtA[maxRow]] = [AtA[maxRow], AtA[i]];
      [Atb[i], Atb[maxRow]] = [Atb[maxRow], Atb[i]];

      for (let j = i + 1; j < n; j++) {
        const factor = AtA[j][i] / AtA[i][i];
        for (let k = i; k < n; k++) {
          AtA[j][k] -= factor * AtA[i][k];
        }
        Atb[j] -= factor * Atb[i];
      }
    }

    const x: number[] = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = Atb[i];
      for (let j = i + 1; j < n; j++) {
        x[i] -= AtA[i][j] * x[j];
      }
      x[i] /= AtA[i][i];
    }

    return x;
  }

  train(series: number[]): void {
    const diffSeries = this.difference(series, this.d);
    this.coefficients = this.fitAR(diffSeries);
  }

  predict(history: number[], steps: number): number[] {
    if (this.coefficients.length === 0) {
      const lastValue = history[history.length - 1];
      return Array(steps).fill(lastValue);
    }

    let current = [...history];
    const predictions: number[] = [];

    for (let i = 0; i < steps; i++) {
      const recent = current.slice(-this.p);
      let nextVal = 0;
      for (let j = 0; j < Math.min(this.coefficients.length, recent.length); j++) {
        nextVal += this.coefficients[j] * recent[recent.length - 1 - j];
      }
      nextVal += current[current.length - 1];
      predictions.push(nextVal);
      current.push(nextVal);
    }

    return predictions;
  }
}

export class ThermalPredictor {
  private arima: ARIMAPredictor;
  private cableParams: CableParameters;

  constructor(cableParams: CableParameters) {
    this.arima = new ARIMAPredictor(3, 1);
    this.cableParams = cableParams;
  }

  train(historicalData: TemperaturePoint[]): void {
    const tempSeries = historicalData
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(d => d.temperature);

    if (tempSeries.length > 10) {
      this.arima.train(tempSeries);
    }
  }

  async predict(
    currentData: TemperaturePoint[],
    horizonHours: number,
    loadForecast: number[]
  ): Promise<PredictionResult> {
    const spatialStep = this.cableParams.length / currentData.length;
    const timeStepHours = 0.25;
    const steps = Math.ceil(horizonHours / timeStepHours);

    let temps = currentData.map(p => p.temperature);
    const forecast: Array<{ time: number; temp: number; confidence: number }> = [];

    const historicalTemps = currentData.map(d => d.temperature);
    const statPredictions = this.arima.predict(historicalTemps, steps);

    for (let i = 0; i < steps; i++) {
      const loadIndex = Math.min(Math.floor(i / (timeStepHours * 4)), loadForecast.length - 1);
      const loadFactor = loadForecast[loadIndex] || 1;

      const heatSources = currentData.map(p => {
        const baseHeating = p.current * p.current * this.cableParams.conductorResistance / currentData.length;
        return baseHeating * loadFactor;
      });

      const physicsTemps = solveHeatEquationFD(
        temps,
        heatSources,
        this.cableParams.ambientTemperature,
        this.cableParams.thermalResistance,
        timeStepHours * 3600,
        spatialStep,
        3
      );

      const blendFactor = Math.min(1, i / 20);
      const maxPhysics = Math.max(...physicsTemps);
      const statPred = statPredictions[i] || historicalTemps[historicalTemps.length - 1];
      const blendedMax = maxPhysics * (1 - blendFactor * 0.3) + statPred * blendFactor * 0.3;

      temps = physicsTemps.map(t => t * (blendedMax / maxPhysics));

      const confidence = Math.max(0.2, 1 - (i / steps) * 0.6);

      forecast.push({
        time: Date.now() + i * timeStepHours * 3600 * 1000,
        temp: blendedMax,
        confidence
      });
    }

    const maxForecastTemp = Math.max(...forecast.map(f => f.temp));
    const safeCurrent = calculateSafeCurrent(
      this.cableParams.maxTemperature,
      this.cableParams.ambientTemperature,
      this.cableParams
    );

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (maxForecastTemp > this.cableParams.maxTemperature * 0.92) {
      riskLevel = 'high';
    } else if (maxForecastTemp > this.cableParams.maxTemperature * 0.78) {
      riskLevel = 'medium';
    }

    const hotspotProbability = forecast.filter(f =>
      f.temp > this.cableParams.maxTemperature * 0.85
    ).length / forecast.length;

    return {
      timestamp: Date.now(),
      horizon: horizonHours,
      temperatureForecast: forecast,
      safeCurrent,
      riskLevel,
      hotspotProbability
    };
  }
}

export function generateLoadProfile(baseLoad: number, hours: number): number[] {
  const profile: number[] = [];
  const steps = Math.ceil(hours / 0.25);

  for (let i = 0; i < steps; i++) {
    const hourOfDay = (new Date().getHours() + i * 0.25) % 24;
    const dailyPattern = 0.7 + 0.3 * Math.sin((hourOfDay - 6) * Math.PI / 12);
    const randomVariation = 0.95 + Math.random() * 0.1;
    profile.push(baseLoad * dailyPattern * randomVariation);
  }

  return profile;
}
