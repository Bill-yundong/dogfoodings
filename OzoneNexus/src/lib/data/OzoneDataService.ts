import { OzoneDataPoint, PolarVortexData, OzoneLayerMetrics, TimeSeriesData } from "@/types";

export class OzoneDataService {
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateOzoneDataPoints(count: number = 100): OzoneDataPoint[] {
    const dataPoints: OzoneDataPoint[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const lat = (Math.random() - 0.5) * 180;
      const lon = (Math.random() - 0.5) * 360;

      const latFactor = Math.cos((lat * Math.PI) / 180);
      const baseConcentration = 250 + latFactor * 100;
      const noise = (Math.random() - 0.5) * 40;

      const concentration = Math.max(150, Math.min(350, baseConcentration + noise));
      const uvIndex = Math.max(0, Math.min(11, (350 - concentration) / 20));

      dataPoints.push({
        id: this.generateId(),
        timestamp: now - Math.random() * 30 * 24 * 60 * 60 * 1000,
        latitude: lat,
        longitude: lon,
        ozoneConcentration: concentration,
        uvIndex,
        dataVersion: "1.0.0",
        source: "NASA OMI",
      });
    }

    return dataPoints.sort((a, b) => a.timestamp - b.timestamp);
  }

  static generatePolarVortexData(): PolarVortexData[] {
    const data: PolarVortexData[] = [];
    const now = Date.now();

    for (let i = 0; i < 24; i++) {
      data.push({
        id: this.generateId(),
        timestamp: now - i * 30 * 24 * 60 * 60 * 1000,
        region: "arctic",
        strength: 40 + Math.random() * 30,
        temperature: -60 + Math.random() * 20,
        windSpeed: 30 + Math.random() * 50,
        area: 15 + Math.random() * 10,
        dataVersion: "1.0.0",
      });

      data.push({
        id: this.generateId(),
        timestamp: now - i * 30 * 24 * 60 * 60 * 1000,
        region: "antarctic",
        strength: 50 + Math.random() * 40,
        temperature: -70 + Math.random() * 25,
        windSpeed: 40 + Math.random() * 60,
        area: 20 + Math.random() * 15,
        dataVersion: "1.0.0",
      });
    }

    return data.sort((a, b) => a.timestamp - b.timestamp);
  }

  static generateHistoricalTimeSeries(months: number = 60): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    const now = Date.now();
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < months; i++) {
      const timestamp = now - (months - i) * monthMs;
      const seasonalFactor = Math.sin((i / 12) * Math.PI * 2) * 15;
      const recoveryTrend = i * 0.5;
      const noise = (Math.random() - 0.5) * 10;

      data.push({
        timestamp,
        value: 280 + seasonalFactor + recoveryTrend + noise,
      });
    }

    return data;
  }

  static generateFutureTimestamps(months: number = 24): number[] {
    const timestamps: number[] = [];
    const now = Date.now();
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < months; i++) {
      timestamps.push(now + i * monthMs);
    }

    return timestamps;
  }

  static calculateOzoneMetrics(dataPoints: OzoneDataPoint[]): OzoneLayerMetrics {
    if (dataPoints.length === 0) {
      return {
        globalAverage: 0,
        antarcticMinimum: 0,
        arcticMinimum: 0,
        recoveryRate: 0,
        expectedFullRecoveryYear: 2075,
      };
    }

    const globalAverage =
      dataPoints.reduce((sum, d) => sum + d.ozoneConcentration, 0) / dataPoints.length;

    const antarcticPoints = dataPoints.filter((d) => d.latitude < -60);
    const antarcticMinimum = antarcticPoints.length > 0
      ? Math.min(...antarcticPoints.map((d) => d.ozoneConcentration))
      : 0;

    const arcticPoints = dataPoints.filter((d) => d.latitude > 60);
    const arcticMinimum = arcticPoints.length > 0
      ? Math.min(...arcticPoints.map((d) => d.ozoneConcentration))
      : 0;

    const recoveryRate = 0.5 + Math.random() * 0.5;
    const currentDeficit = 320 - globalAverage;
    const yearsToRecover = currentDeficit / recoveryRate;
    const expectedFullRecoveryYear = new Date().getFullYear() + Math.round(yearsToRecover);

    return {
      globalAverage,
      antarcticMinimum,
      arcticMinimum,
      recoveryRate,
      expectedFullRecoveryYear,
    };
  }
}
