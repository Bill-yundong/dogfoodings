import * as Comlink from 'comlink';
import type { WeatherData, DWAParams, LandingWindow, PlatformMetadata } from '@/types';
import { generateWeatherData } from '@/mock/data';

interface DWAWorker {
  calculateLandingWindows: (
    weatherData: WeatherData[],
    params: DWAParams,
    platformMaxWind: number,
    platformMaxWave: number
  ) => Promise<{ windows: LandingWindow[]; platformId: string }>;
}

let workerInstance: Comlink.Remote<DWAWorker> | null = null;
let worker: Worker | null = null;

const getWorker = (): Comlink.Remote<DWAWorker> => {
  if (!workerInstance) {
    worker = new Worker(new URL('../workers/dwa.worker.ts', import.meta.url));
    workerInstance = Comlink.wrap<DWAWorker>(worker);
  }
  return workerInstance;
};

export const closeWorker = () => {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  if (workerInstance) {
    workerInstance[Comlink.releaseProxy]();
    workerInstance = null;
  }
};

export class DWASolver {
  private params: DWAParams;

  constructor(params: DWAParams) {
    this.params = params;
  }

  updateParams(params: Partial<DWAParams>) {
    this.params = { ...this.params, ...params };
  }

  async solve(
    weatherData: WeatherData[],
    platform: PlatformMetadata
  ): Promise<LandingWindow[]> {
    try {
      const worker = getWorker();
      const result = await worker.calculateLandingWindows(
        weatherData,
        this.params,
        platform.maxWindSpeed,
        platform.maxWaveHeight
      );
      return result.windows;
    } catch (e) {
      console.warn('[DWA] Web Worker failed, falling back to main thread:', e);
      return this.solveFallback(weatherData, platform);
    }
  }

  private async solveFallback(
    weatherData: WeatherData[],
    platform: PlatformMetadata
  ): Promise<LandingWindow[]> {
    const sortedData = [...weatherData].sort((a, b) => a.timestamp - b.timestamp);
    const windows: LandingWindow[] = [];
    const windowSteps = Math.ceil(this.params.windowSize);
    const minSteps = Math.ceil(this.params.minLandingDuration);

    const effectiveMaxWind = Math.min(this.params.maxWindSpeed, platform.maxWindSpeed);
    const effectiveMaxWave = Math.min(this.params.maxWaveHeight, platform.maxWaveHeight);

    for (let i = 0; i <= sortedData.length - windowSteps; i += Math.max(1, Math.floor(minSteps / 2))) {
      const windowData = sortedData.slice(i, i + windowSteps);
      if (windowData.length < minSteps) continue;

      const maxWind = Math.max(...windowData.map(d => d.windSpeed));
      const maxWave = Math.max(...windowData.map(d => d.waveHeight));
      const minVisibility = Math.min(...windowData.map(d => d.visibility));
      const avgWind = windowData.reduce((s, d) => s + d.windSpeed, 0) / windowData.length;

      const windScore = Math.max(0, 100 - (maxWind / effectiveMaxWind) * 100);
      const waveScore = Math.max(0, 100 - (maxWave / effectiveMaxWave) * 100);
      const visibilityScore = Math.min(100, (minVisibility / 10) * 100);

      const safetyScore = windScore * 0.4 + waveScore * 0.4 + visibilityScore * 0.2;
      const duration = (windowData[windowData.length - 1].timestamp - windowData[0].timestamp) / 60000;
      const timeScore = Math.min(100, (duration / this.params.minLandingDuration) * 100);
      const fuelScore = Math.max(0, 100 - avgWind * 5);

      const feasibilityScore =
        safetyScore * this.params.safetyWeight +
        timeScore * this.params.timeWeight +
        fuelScore * this.params.fuelWeight;

      let riskLevel: 'safe' | 'caution' | 'danger' = 'safe';
      if (maxWind > effectiveMaxWind * 0.85 || maxWave > effectiveMaxWave * 0.85 || minVisibility < 2) {
        riskLevel = 'danger';
      } else if (maxWind > effectiveMaxWind * 0.65 || maxWave > effectiveMaxWave * 0.65 || minVisibility < 4) {
        riskLevel = 'caution';
      }

      if (feasibilityScore > 30) {
        windows.push({
          id: `window-${windowData[0].platformId}-${windowData[0].timestamp}`,
          platformId: windowData[0].platformId,
          startTime: windowData[0].timestamp,
          endTime: windowData[windowData.length - 1].timestamp,
          feasibilityScore: Number(feasibilityScore.toFixed(1)),
          safetyScore: Number(safetyScore.toFixed(1)),
          timeScore: Number(timeScore.toFixed(1)),
          fuelScore: Number(fuelScore.toFixed(1)),
          weatherConditions: {
            avgWindSpeed: Number(avgWind.toFixed(1)),
            maxWaveHeight: Number(maxWave.toFixed(1)),
            visibility: Number(minVisibility.toFixed(1)),
          },
          riskLevel,
          createdAt: Date.now(),
        });
      }
    }

    return windows.sort((a, b) => b.feasibilityScore - a.feasibilityScore).slice(0, 8);
  }

  async solveForPlatform(
    platformId: string,
    platform: PlatformMetadata
  ): Promise<LandingWindow[]> {
    const endTime = Date.now() + this.params.predictionHorizon * 3600000;
    const weatherData = generateWeatherData(
      platformId,
      endTime,
      this.params.predictionHorizon * 60,
      60000
    );
    return this.solve(weatherData, platform);
  }
}
