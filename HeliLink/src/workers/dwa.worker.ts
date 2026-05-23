/// <reference lib="webworker" />

import type { WeatherData, DWAParams, LandingWindow, RiskLevel } from '@/types';

interface WorkerMessage {
  weatherData: WeatherData[];
  params: DWAParams;
  platformMaxWind: number;
  platformMaxWave: number;
}

interface WorkerResult {
  windows: LandingWindow[];
  platformId: string;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { weatherData, params, platformMaxWind, platformMaxWave } = e.data;
  const result = calculateLandingWindows(weatherData, params, platformMaxWind, platformMaxWave);
  self.postMessage(result);
};

function calculateLandingWindows(
  weatherData: WeatherData[],
  params: DWAParams,
  platformMaxWind: number,
  platformMaxWave: number
): WorkerResult {
  const sortedData = [...weatherData].sort((a, b) => a.timestamp - b.timestamp);
  const windows: LandingWindow[] = [];
  const windowSteps = Math.ceil(params.windowSize);
  const minSteps = Math.ceil(params.minLandingDuration);

  const effectiveMaxWind = Math.min(params.maxWindSpeed, platformMaxWind);
  const effectiveMaxWave = Math.min(params.maxWaveHeight, platformMaxWave);

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
    const timeScore = Math.min(100, (duration / params.minLandingDuration) * 100);
    const fuelScore = Math.max(0, 100 - avgWind * 5);

    const feasibilityScore =
      safetyScore * params.safetyWeight +
      timeScore * params.timeWeight +
      fuelScore * params.fuelWeight;

    let riskLevel: RiskLevel = 'safe';
    if (maxWind > effectiveMaxWind * 0.85 || maxWave > effectiveMaxWave * 0.85 || minVisibility < 2) {
      riskLevel = 'danger';
    } else if (maxWind > effectiveMaxWind * 0.65 || maxWave > effectiveMaxWave * 0.65 || minVisibility < 4) {
      riskLevel = 'caution';
    }

    if (feasibilityScore > 30) {
      const window: LandingWindow = {
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
      };
      windows.push(window);
    }
  }

  const sorted = windows.sort((a, b) => b.feasibilityScore - a.feasibilityScore);
  return {
    windows: sorted.slice(0, 8),
    platformId: sortedData[0]?.platformId || '',
  };
}

export {};
