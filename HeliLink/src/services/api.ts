import { db } from '@/db';
import {
  mockPlatforms,
  mockCables,
  mockSemanticTags,
  mockUsers,
  mockAlerts,
  generateWeatherData,
} from '@/mock/data';
import type {
  WeatherData,
  PlatformMetadata,
  SubmarineCable,
  DWAParams,
  LandingWindow,
  RoutePlan,
  SemanticTag,
  SyncStatusItem,
  User,
  Alert,
  HelicopterPosition,
} from '@/types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  async getCurrentWeather(platformId: string): Promise<WeatherData> {
    await delay(200);
    const latestData = generateWeatherData(platformId, Date.now(), 1, 60000)[0];
    await db.weatherHistory.add(latestData).catch(() => {});
    return latestData;
  },

  async getWeatherHistory(
    platformId: string,
    startTime: number,
    endTime: number
  ): Promise<WeatherData[]> {
    await delay(300);
    const cached = await db.weatherHistory
      .where('platformId')
      .equals(platformId)
      .and(d => d.timestamp >= startTime && d.timestamp <= endTime)
      .sortBy('timestamp');

    if (cached.length > 100) {
      return cached;
    }

    const interval = 60000;
    const count = Math.min(288, Math.ceil((endTime - startTime) / interval));
    const data = generateWeatherData(platformId, endTime, count, interval);

    try {
      await db.weatherHistory.bulkAdd(data);
    } catch {}

    return data.sort((a, b) => a.timestamp - b.timestamp);
  },

  async getPlatforms(): Promise<PlatformMetadata[]> {
    await delay(200);
    const cached = await db.platformMetadata.toArray();
    if (cached.length > 0) return cached;

    await db.platformMetadata.bulkAdd(mockPlatforms);
    return mockPlatforms;
  },

  async getPlatform(id: string): Promise<PlatformMetadata | undefined> {
    await delay(100);
    const cached = await db.platformMetadata.get(id);
    if (cached) return cached;

    const platform = mockPlatforms.find(p => p.id === id);
    if (platform) {
      await db.platformMetadata.add(platform);
    }
    return platform;
  },

  async getCables(): Promise<SubmarineCable[]> {
    await delay(200);
    const cached = await db.submarineCables.toArray();
    if (cached.length > 0) return cached;

    await db.submarineCables.bulkAdd(mockCables);
    return mockCables;
  },

  async getSemanticTags(): Promise<SemanticTag[]> {
    await delay(100);
    const cached = await db.semanticTags.toArray();
    if (cached.length > 0) return cached;

    await db.semanticTags.bulkAdd(mockSemanticTags);
    return mockSemanticTags;
  },

  async updateSemanticTag(tag: SemanticTag): Promise<SemanticTag> {
    await delay(200);
    await db.semanticTags.put(tag);
    return tag;
  },

  async calculateLandingWindows(
    platformId: string,
    params: DWAParams
  ): Promise<LandingWindow[]> {
    await delay(800);

    const platform = await this.getPlatform(platformId);
    if (!platform) return [];

    const endTime = Date.now() + params.predictionHorizon * 3600000;
    const weatherData = generateWeatherData(
      platformId,
      endTime,
      params.predictionHorizon * 60,
      60000
    );

    const windows: LandingWindow[] = [];
    const windowSteps = Math.ceil(params.windowSize);
    const minSteps = Math.ceil(params.minLandingDuration);

    for (let i = 0; i <= weatherData.length - windowSteps; i += minSteps) {
      const windowData = weatherData.slice(i, i + windowSteps);
      if (windowData.length < minSteps) continue;

      const maxWind = Math.max(...windowData.map(d => d.windSpeed));
      const maxWave = Math.max(...windowData.map(d => d.waveHeight));
      const minVisibility = Math.min(...windowData.map(d => d.visibility));
      const avgWind = windowData.reduce((s, d) => s + d.windSpeed, 0) / windowData.length;

      const effectiveMaxWind = Math.min(params.maxWindSpeed, platform.maxWindSpeed);
      const effectiveMaxWave = Math.min(params.maxWaveHeight, platform.maxWaveHeight);

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

      let riskLevel: 'safe' | 'caution' | 'danger' = 'safe';
      if (maxWind > effectiveMaxWind * 0.85 || maxWave > effectiveMaxWave * 0.85 || minVisibility < 2) {
        riskLevel = 'danger';
      } else if (maxWind > effectiveMaxWind * 0.65 || maxWave > effectiveMaxWave * 0.65 || minVisibility < 4) {
        riskLevel = 'caution';
      }

      if (feasibilityScore > 30) {
        const window: LandingWindow = {
          id: `window-${platformId}-${windowData[0].timestamp}`,
          platformId,
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
    const topWindows = sorted.slice(0, 8);

    try {
      await db.landingHistory.bulkAdd(topWindows);
    } catch {}

    return topWindows;
  },

  async planRoute(
    origin: string,
    destination: string,
    params: DWAParams
  ): Promise<RoutePlan[]> {
    await delay(1000);

    const originPlatform = await this.getPlatform(origin);
    const destPlatform = await this.getPlatform(destination);
    if (!originPlatform || !destPlatform) return [];

    const routes: RoutePlan[] = [];
    const obstacles = ['cable-002', 'cable-004'];

    for (let i = 0; i < 3; i++) {
      const waypoints: { lat: number; lng: number; alt: number }[] = [];
      waypoints.push({
        lat: originPlatform.latitude,
        lng: originPlatform.longitude,
        alt: originPlatform.altitude + 100,
      });

      const midLat = (originPlatform.latitude + destPlatform.latitude) / 2;
      const midLng = (originPlatform.longitude + destPlatform.longitude) / 2;
      const offset = (i - 1) * 2;

      waypoints.push({
        lat: midLat + offset,
        lng: midLng,
        alt: 500 + i * 100,
      });

      waypoints.push({
        lat: destPlatform.latitude,
        lng: destPlatform.longitude,
        alt: destPlatform.altitude + 100,
      });

      const distance = this.calculateDistance(
        originPlatform.latitude,
        originPlatform.longitude,
        destPlatform.latitude + offset,
        destPlatform.longitude
      );

      const speed = 220;
      const estimatedTime = (distance / speed) * 60;
      const windFactor = 1 + (params.safetyWeight * 0.3);
      const fuelConsumption = distance * 2.5 * windFactor;

      const baseRisk = 50 - i * 10;
      const riskScore = Math.min(100, Math.max(0, baseRisk + (1 - params.safetyWeight) * 20));

      routes.push({
        id: `route-${origin}-${destination}-${i}`,
        name: `航线 ${['A', 'B', 'C'][i]}`,
        origin,
        destination,
        waypoints,
        distance: Number(distance.toFixed(1)),
        estimatedTime: Number(estimatedTime.toFixed(0)),
        fuelConsumption: Number(fuelConsumption.toFixed(0)),
        riskScore: Number(riskScore.toFixed(1)),
        obstacles: i === 1 ? obstacles : [],
        isRecommended: i === 0,
      });
    }

    return routes.sort((a, b) => a.riskScore - b.riskScore);
  },

  async getSyncStatus(): Promise<SyncStatusItem[]> {
    await delay(150);
    const systems: SyncStatusItem[] = [
      {
        system: 'meteorology',
        status: 'online',
        latency: 120 + Math.random() * 80,
        lastSync: Date.now(),
        tagMatchRate: 98.5,
      },
      {
        system: 'fleet',
        status: 'online',
        latency: 90 + Math.random() * 60,
        lastSync: Date.now(),
        tagMatchRate: 97.2,
      },
      {
        system: 'platform',
        status: Math.random() > 0.9 ? 'degraded' : 'online',
        latency: 150 + Math.random() * 150,
        lastSync: Date.now() - Math.random() * 60000,
        tagMatchRate: 95.8,
      },
    ];

    return systems;
  },

  async getAlerts(): Promise<Alert[]> {
    await delay(100);
    const cached = await db.alerts.orderBy('timestamp').reverse().toArray();
    if (cached.length > 0) return cached;

    await db.alerts.bulkAdd(mockAlerts);
    return mockAlerts;
  },

  async acknowledgeAlert(alertId: string): Promise<void> {
    await delay(200);
    await db.alerts.update(alertId, { acknowledged: true });
  },

  async getUsers(): Promise<User[]> {
    await delay(100);
    return mockUsers;
  },

  async login(username: string, password: string): Promise<User | null> {
    await delay(300);
    const user = mockUsers.find(u => u.username === username);
    if (user && password === '123456') {
      return user;
    }
    return null;
  },

  async getHelicopterPositions(): Promise<HelicopterPosition[]> {
    await delay(200);
    return [];
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },
};
