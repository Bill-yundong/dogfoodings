import { TimeSeriesData, PredictionResult } from "@/types";

export class TimeSeriesRegressionEngine {
  private historicalData: TimeSeriesData[] = [];
  private modelParams: {
    slope: number;
    intercept: number;
    rSquared: number;
    seasonality: number[];
  } | null = null;
  private isTraining = false;

  constructor(historicalData?: TimeSeriesData[]) {
    if (historicalData) {
      this.historicalData = historicalData;
    }
  }

  addData(data: TimeSeriesData[]): void {
    this.historicalData = [...this.historicalData, ...data].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    this.modelParams = null;
  }

  clearData(): void {
    this.historicalData = [];
    this.modelParams = null;
  }

  private normalizeTimestamps(): { normalized: number[]; mean: number; std: number } {
    const timestamps = this.historicalData.map((d) => d.timestamp);
    const mean = timestamps.reduce((a, b) => a + b, 0) / timestamps.length;
    const variance =
      timestamps.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / timestamps.length;
    const std = Math.sqrt(variance);

    const normalized = timestamps.map((t) => (t - mean) / std);
    return { normalized, mean, std };
  }

  private calculateSeasonality(values: number[], period: number = 12): number[] {
    const seasonality: number[] = new Array(period).fill(0);
    const counts: number[] = new Array(period).fill(0);

    values.forEach((value, index) => {
      const seasonIndex = index % period;
      seasonality[seasonIndex] += value;
      counts[seasonIndex]++;
    });

    return seasonality.map((sum, i) => sum / counts[i]);
  }

  async train(): Promise<void> {
    if (this.isTraining) return;
    if (this.historicalData.length < 10) {
      throw new Error("Insufficient data for training. Need at least 10 data points.");
    }

    this.isTraining = true;

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { normalized: normalizedTimestamps, mean, std } = this.normalizeTimestamps();
      const values = this.historicalData.map((d) => d.value);

      const n = normalizedTimestamps.length;
      const sumX = normalizedTimestamps.reduce((a, b) => a + b, 0);
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = normalizedTimestamps.reduce(
        (a, x, i) => a + x * values[i],
        0
      );
      const sumX2 = normalizedTimestamps.reduce((a, x) => a + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const yMean = sumY / n;
      const ssTotal = values.reduce((a, y) => a + Math.pow(y - yMean, 2), 0);
      const ssResidual = values.reduce(
        (a, y, i) =>
          a + Math.pow(y - (intercept + slope * normalizedTimestamps[i]), 2),
        0
      );
      const rSquared = 1 - ssResidual / ssTotal;

      const detrended = values.map(
        (y, i) => y - (intercept + slope * normalizedTimestamps[i])
      );
      const seasonality = this.calculateSeasonality(detrended);

      this.modelParams = {
        slope,
        intercept,
        rSquared,
        seasonality,
      };
    } finally {
      this.isTraining = false;
    }
  }

  async predict(futureTimestamps: number[]): Promise<PredictionResult[]> {
    if (!this.modelParams) {
      await this.train();
    }

    if (!this.modelParams) {
      throw new Error("Model training failed");
    }

    const { normalized: normalizedHist, mean, std } = this.normalizeTimestamps();

    return futureTimestamps.map((timestamp, index) => {
      const normalizedTimestamp = (timestamp - mean) / std;
      const trend =
        this.modelParams!.intercept + this.modelParams!.slope * normalizedTimestamp;
      const seasonIndex = index % this.modelParams!.seasonality.length;
      const seasonalComponent = this.modelParams!.seasonality[seasonIndex];

      const predictedValue = trend + seasonalComponent;

      const stdError = Math.sqrt(1 - this.modelParams!.rSquared) * 10;
      const marginOfError = 1.96 * stdError;

      return {
        timestamp,
        predictedConcentration: predictedValue,
        confidenceInterval: {
          lower: predictedValue - marginOfError,
          upper: predictedValue + marginOfError,
        },
        confidence: this.modelParams!.rSquared,
      };
    });
  }

  getRSquared(): number {
    return this.modelParams?.rSquared || 0;
  }

  getModelParams() {
    return this.modelParams;
  }

  isModelReady(): boolean {
    return this.modelParams !== null && !this.isTraining;
  }
}

export const createPredictionEngine = (
  historicalData?: TimeSeriesData[]
): TimeSeriesRegressionEngine => {
  return new TimeSeriesRegressionEngine(historicalData);
};
