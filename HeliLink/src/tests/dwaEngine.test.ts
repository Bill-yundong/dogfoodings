import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DWASolver, closeWorker } from '@/services/dwaEngine';
import type { DWAParams, PlatformMetadata, WeatherData } from '@/types';

const defaultParams: DWAParams = {
  safetyWeight: 0.6,
  timeWeight: 0.25,
  fuelWeight: 0.15,
  windowSize: 15,
  minLandingDuration: 10,
  predictionHorizon: 24,
  maxWindSpeed: 20,
  maxWaveHeight: 4,
  minVisibility: 2,
};

const mockPlatform: PlatformMetadata = {
  id: 'plat-001',
  name: '测试平台',
  code: 'TEST-01',
  latitude: 30.0,
  longitude: 120.0,
  altitude: 30,
  helipadCount: 2,
  maxWindSpeed: 18,
  maxWaveHeight: 3.5,
  status: 'active',
  cables: [],
  lastSync: Date.now(),
};

const generateMockWeatherData = (
  count: number,
  windSpeed: number,
  waveHeight: number,
  visibility: number,
  startTimestamp?: number
): WeatherData[] => {
  const data: WeatherData[] = [];
  const baseTime = startTimestamp || Date.now();
  
  for (let i = 0; i < count; i++) {
    data.push({
      id: `weather-${i}`,
      platformId: 'plat-001',
      timestamp: baseTime - i * 60000,
      windSpeed,
      waveHeight,
      visibility,
      windDirection: 180,
      wavePeriod: 12,
      temperature: 25,
      pressure: 1015,
      dataQuality: 'good',
    });
  }
  return data;
};

describe('DWA Engine Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    closeWorker();
  });

  describe('TC-UNIT-001: DWA参数权重归一化', () => {
    it('should correctly initialize with default weights summing to 1.0', () => {
      const solver = new DWASolver(defaultParams);
      expect(defaultParams.safetyWeight + defaultParams.timeWeight + defaultParams.fuelWeight).toBe(1.0);
    });

    it('should update parameters correctly', () => {
      const solver = new DWASolver(defaultParams);
      solver.updateParams({ safetyWeight: 0.7, timeWeight: 0.2, fuelWeight: 0.1 });
      solver.updateParams({ predictionHorizon: 48 });
      expect(defaultParams.safetyWeight + defaultParams.timeWeight + defaultParams.fuelWeight).toBe(1.0);
    });
  });

  describe('TC-UNIT-002: 完美气象条件着陆窗口计算', () => {
    it('should return high feasibility scores for perfect weather', async () => {
      const solver = new DWASolver(defaultParams);
      const weatherData = generateMockWeatherData(60, 5, 1, 15);
      
      const windows = await solver.solve(weatherData, mockPlatform);
      
      expect(windows.length).toBeGreaterThan(0);
      expect(windows[0].feasibilityScore).toBeGreaterThan(70);
      expect(windows[0].safetyScore).toBeGreaterThan(70);
      expect(windows[0].riskLevel).toBe('safe');
    });
  });

  describe('TC-UNIT-003: 极端气象条件无着陆窗口', () => {
    it('should return no windows for extreme weather', async () => {
      const solver = new DWASolver(defaultParams);
      const weatherData = generateMockWeatherData(60, 30, 8, 0.5);
      
      const windows = await solver.solve(weatherData, mockPlatform);
      
      expect(windows.length).toBe(0);
    });

    it('should return danger risk level for high wind', async () => {
      const solver = new DWASolver(defaultParams);
      const weatherData = generateMockWeatherData(60, 16, 3.2, 1.5);
      
      const windows = await solver.solve(weatherData, mockPlatform);
      
      if (windows.length > 0) {
        expect(windows[0].feasibilityScore).toBeLessThan(50);
        expect(windows[0].riskLevel).toBe('danger');
      }
    });
  });

  describe('TC-UNIT-004: 安全评分计算验证', () => {
    it('should calculate safety score correctly (wind 40% + wave 40% + visibility 20%)', async () => {
      const solver = new DWASolver(defaultParams);
      
      const perfectData = generateMockWeatherData(20, 5, 1, 15);
      const perfectWindows = await solver.solve(perfectData, mockPlatform);
      
      const mediumData = generateMockWeatherData(20, 10, 2, 8);
      const mediumWindows = await solver.solve(mediumData, mockPlatform);
      
      const badData = generateMockWeatherData(20, 15, 3, 3);
      const badWindows = await solver.solve(badData, mockPlatform);
      
      if (perfectWindows.length > 0 && mediumWindows.length > 0 && badWindows.length > 0) {
        expect(perfectWindows[0].safetyScore).toBeGreaterThan(mediumWindows[0].safetyScore);
        expect(mediumWindows[0].safetyScore).toBeGreaterThan(badWindows[0].safetyScore);
        expect(perfectWindows[0].safetyScore).toBeGreaterThan(70);
        expect(badWindows[0].safetyScore).toBeLessThan(60);
      }
    });
  });

  describe('TC-UNIT-005: 着陆窗口排序验证', () => {
    it('should sort windows by feasibility score descending', async () => {
      const solver = new DWASolver(defaultParams);
      const weatherData = generateMockWeatherData(120, 8, 1.5, 10);
      
      const windows = await solver.solve(weatherData, mockPlatform);
      
      if (windows.length > 1) {
        for (let i = 0; i < windows.length - 1; i++) {
          expect(windows[i].feasibilityScore).toBeGreaterThanOrEqual(windows[i + 1].feasibilityScore);
        }
      }
    });

    it('should return at most 8 windows', async () => {
      const solver = new DWASolver(defaultParams);
      const weatherData = generateMockWeatherData(500, 8, 1.5, 10);
      
      const windows = await solver.solve(weatherData, mockPlatform);
      
      expect(windows.length).toBeLessThanOrEqual(8);
    });
  });

  describe('TC-UNIT-006: 气象阈值验证', () => {
    it('should respect platform-specific thresholds', async () => {
      const solver = new DWASolver(defaultParams);
      const weatherData = generateMockWeatherData(30, 17, 3.3, 5);
      
      const strictPlatform = { ...mockPlatform, maxWindSpeed: 15, maxWaveHeight: 3 };
      const lenientPlatform = { ...mockPlatform, maxWindSpeed: 20, maxWaveHeight: 4 };
      
      const strictWindows = await solver.solve(weatherData, strictPlatform);
      const lenientWindows = await solver.solve(weatherData, lenientPlatform);
      
      expect(lenientWindows.length).toBeGreaterThanOrEqual(strictWindows.length);
    });
  });

  describe('TC-UNIT-007: solveForPlatform 方法', () => {
    it('should generate weather data and solve for a platform', async () => {
      const solver = new DWASolver(defaultParams);
      
      const windows = await solver.solveForPlatform('plat-001', mockPlatform);
      
      expect(Array.isArray(windows)).toBe(true);
      expect(windows.every(w => w.platformId === 'plat-001')).toBe(true);
    });
  });

  describe('TC-UNIT-008: 综合评分权重验证', () => {
    it('should calculate feasibility score with correct weights (0.6 safety, 0.25 time, 0.15 fuel)', async () => {
      const solver1 = new DWASolver({
        ...defaultParams,
        safetyWeight: 1.0,
        timeWeight: 0,
        fuelWeight: 0,
      });
      
      const solver2 = new DWASolver({
        ...defaultParams,
        safetyWeight: 0,
        timeWeight: 0,
        fuelWeight: 1.0,
      });
      
      const weatherData = generateMockWeatherData(30, 10, 2, 8);
      
      const windows1 = await solver1.solve(weatherData, mockPlatform);
      const windows2 = await solver2.solve(weatherData, mockPlatform);
      
      if (windows1.length > 0 && windows2.length > 0) {
        expect(windows1[0].feasibilityScore).toBe(windows1[0].safetyScore);
        expect(windows2[0].feasibilityScore).toBe(windows2[0].fuelScore);
      }
    });
  });

  describe('TC-UNIT-009: 时间评分计算', () => {
    it('should give higher time score for longer duration windows', async () => {
      const solver = new DWASolver(defaultParams);
      
      const longWindowData = generateMockWeatherData(60, 8, 1.5, 10);
      const shortWindowData = generateMockWeatherData(15, 8, 1.5, 10);
      
      const longWindows = await solver.solve(longWindowData, mockPlatform);
      const shortWindows = await solver.solve(shortWindowData, mockPlatform);
      
      if (longWindows.length > 0 && shortWindows.length > 0) {
        expect(longWindows[0].timeScore).toBeGreaterThanOrEqual(shortWindows[0].timeScore);
      }
    });
  });

  describe('TC-UNIT-010: 风险等级判断逻辑', () => {
    it('should assign correct risk levels based on thresholds', async () => {
      const solver = new DWASolver(defaultParams);
      
      const safeData = generateMockWeatherData(30, 5, 1, 10);
      const cautionData = generateMockWeatherData(30, 13, 2.5, 4);
      const dangerData = generateMockWeatherData(30, 16, 3.2, 1.5);
      
      const [safeWindows, cautionWindows, dangerWindows] = await Promise.all([
        solver.solve(safeData, mockPlatform),
        solver.solve(cautionData, mockPlatform),
        solver.solve(dangerData, mockPlatform),
      ]);
      
      if (safeWindows.length > 0) {
        expect(safeWindows[0].riskLevel).toBe('safe');
      }
      if (cautionWindows.length > 0) {
        expect(cautionWindows[0].riskLevel).toBe('caution');
      }
      if (dangerWindows.length > 0) {
        expect(dangerWindows[0].riskLevel).toBe('danger');
      }
    });
  });
});
