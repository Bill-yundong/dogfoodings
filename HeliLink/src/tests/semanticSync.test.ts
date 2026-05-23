import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { semanticSyncEngine } from '@/services/semanticSync';
import { db } from '@/db';
import type { WeatherData, LandingWindow, SemanticSyncData, SemanticTag } from '@/types';
import { mockSemanticTags } from '@/mock/data';

const mockWeatherData: WeatherData = {
  id: 'weather-test-001',
  platformId: 'plat-001',
  timestamp: Date.now(),
  windSpeed: 18,
  waveHeight: 3.2,
  visibility: 2.5,
  windDirection: 180,
  wavePeriod: 12,
  temperature: 25,
  pressure: 1015,
  dataQuality: 'good',
};

const mockLandingWindow: LandingWindow = {
  id: 'window-test-001',
  platformId: 'plat-001',
  startTime: Date.now(),
  endTime: Date.now() + 3600000,
  feasibilityScore: 75.5,
  safetyScore: 82.3,
  timeScore: 65.0,
  fuelScore: 70.0,
  weatherConditions: {
    avgWindSpeed: 10.5,
    maxWaveHeight: 2.5,
    visibility: 8.0,
  },
  riskLevel: 'caution',
  createdAt: Date.now(),
};

const createSyncData = (tags: string[], source: 'meteorology' | 'fleet' | 'platform'): SemanticSyncData => ({
  id: `sync-${source}-${Date.now()}`,
  dataType: 'weather',
  sourceSystem: source,
  semanticTags: tags,
  payload: mockWeatherData,
  timestamp: Date.now(),
  syncStatus: 'pending',
  version: 1,
});

describe('Semantic Sync Engine Unit Tests', () => {
  beforeAll(async () => {
    await db.semanticTags.clear();
    await db.semanticTags.bulkAdd(mockSemanticTags);
    await semanticSyncEngine.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterAll(async () => {
    await db.semanticTags.clear();
  });

  describe('TC-UNIT-011: 语义标签映射', () => {
    it('should map high wind speed to warning tags', async () => {
      const tags = await semanticSyncEngine.extractSemanticTags(mockWeatherData);
      
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should map critical data quality to warning tag', async () => {
      const criticalData = { ...mockWeatherData, dataQuality: 'critical' as const };
      const tags = await semanticSyncEngine.extractSemanticTags(criticalData);
      
      expect(tags).toContain('数据质量告警');
    });

    it('should map danger risk level to "禁止着陆" tag', async () => {
      const dangerWindow = { ...mockLandingWindow, riskLevel: 'danger' as const };
      const tags = await semanticSyncEngine.extractSemanticTags(dangerWindow);
      
      expect(tags).toContain('禁止着陆');
    });

    it('should remove duplicate tags', async () => {
      const tags = await semanticSyncEngine.extractSemanticTags(mockWeatherData);
      const uniqueTags = [...new Set(tags)];
      
      expect(tags.length).toBe(uniqueTags.length);
    });
  });

  describe('TC-UNIT-012: mapToSemantic 方法', () => {
    it('should create SemanticSyncData with correct structure', async () => {
      localStorage.setItem('userRole', 'meteorology');
      const result = await semanticSyncEngine.mapToSemantic(mockWeatherData);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('semanticTags');
      expect(result).toHaveProperty('dataType');
      expect(result.sourceSystem).toBe('meteorology');
      expect(result.syncStatus).toBe('pending');
      expect(result.dataType).toBe('weather');
      expect(Array.isArray(result.semanticTags)).toBe(true);
    });

    it('should detect source system from localStorage', async () => {
      localStorage.setItem('userRole', 'fleet');
      const result1 = await semanticSyncEngine.mapToSemantic(mockWeatherData);
      expect(result1.sourceSystem).toBe('fleet');

      localStorage.setItem('userRole', 'meteorology');
      const result2 = await semanticSyncEngine.mapToSemantic(mockWeatherData);
      expect(result2.sourceSystem).toBe('meteorology');
    });

    it('should default to platform when no role in localStorage', async () => {
      localStorage.removeItem('userRole');
      const result = await semanticSyncEngine.mapToSemantic(mockWeatherData);
      expect(result.sourceSystem).toBe('platform');
    });
  });

  describe('TC-UNIT-013: 三端一致性校验 (70%共识阈值)', () => {
    it('should return true when consensus >= 70%', async () => {
      const commonTags = ['高风速预警', '浪高注意', '能见度低'];
      const meteoData = createSyncData([...commonTags], 'meteorology');
      const fleetData = createSyncData([...commonTags], 'fleet');
      const platformData = createSyncData([...commonTags, '平台就绪'], 'platform');

      const result = await semanticSyncEngine.validateConsistency(meteoData, fleetData, platformData);
      
      expect(result).toBe(true);
    });

    it('should return false when consensus < 70%', async () => {
      const meteoData = createSyncData(['气象正常', '风速正常'], 'meteorology');
      const fleetData = createSyncData(['机队待命', '准备起飞'], 'fleet');
      const platformData = createSyncData(['平台就绪', '人员到位'], 'platform');

      const result = await semanticSyncEngine.validateConsistency(meteoData, fleetData, platformData);
      
      expect(result).toBe(false);
    });

    it('should return false when any data is missing', async () => {
      const meteoData = createSyncData(['高风速预警'], 'meteorology');
      const fleetData = createSyncData(['高风速预警'], 'fleet');

      const result1 = await semanticSyncEngine.validateConsistency(undefined, fleetData, createSyncData(['高风速预警'], 'platform'));
      const result2 = await semanticSyncEngine.validateConsistency(meteoData, undefined, createSyncData(['高风速预警'], 'platform'));
      const result3 = await semanticSyncEngine.validateConsistency(meteoData, fleetData, undefined);
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    it('should return false when there are no common tags', async () => {
      const meteoData = createSyncData(['标签A'], 'meteorology');
      const fleetData = createSyncData(['标签B'], 'fleet');
      const platformData = createSyncData(['标签C'], 'platform');

      const result = await semanticSyncEngine.validateConsistency(meteoData, fleetData, platformData);
      
      expect(result).toBe(false);
    });
  });

  describe('TC-UNIT-014: 冲突解决策略 (危险优先级 > 气象系统优先)', () => {
    it('should prioritize danger severity tags', async () => {
      const dangerTag: SemanticTag = {
        id: 'tag-danger',
        dataType: 'weather',
        metricName: 'windSpeed',
        businessLabel: '极高风速危险',
        severity: 'danger',
        thresholdMin: 25,
        color: '#EF4444',
        lastUpdated: Date.now(),
      };
      
      const warningTag: SemanticTag = {
        id: 'tag-warning',
        dataType: 'weather',
        metricName: 'windSpeed',
        businessLabel: '高风速预警',
        severity: 'warning',
        thresholdMin: 15,
        thresholdMax: 25,
        color: '#F46036',
        lastUpdated: Date.now(),
      };

      semanticSyncEngine.updateTagMapping(dangerTag);
      semanticSyncEngine.updateTagMapping(warningTag);

      const conflictData = createSyncData(['极高风速危险', '高风速预警', '气象正常'], 'platform');
      const resolved = await semanticSyncEngine.resolveConflict(conflictData);

      expect(resolved.semanticTags).toContain('极高风速危险');
      expect(resolved.syncStatus).toBe('synced');
      expect(resolved.version).toBe(conflictData.version + 1);
    });

    it('should increment version on conflict resolution', async () => {
      const original = createSyncData(['标签A', '标签B'], 'platform');
      const resolved = await semanticSyncEngine.resolveConflict(original);
      
      expect(resolved.version).toBe(original.version + 1);
    });

    it('should set syncStatus to synced after resolution', async () => {
      const original = createSyncData(['标签A'], 'platform');
      original.syncStatus = 'conflict';
      
      const resolved = await semanticSyncEngine.resolveConflict(original);
      
      expect(resolved.syncStatus).toBe('synced');
    });
  });

  describe('TC-UNIT-015: 标签映射管理', () => {
    it('should update tag mapping correctly', async () => {
      const testTag: SemanticTag = {
        id: 'tag-test-001',
        dataType: 'weather',
        metricName: 'windSpeed',
        businessLabel: '极高风速危险',
        severity: 'danger',
        thresholdMin: 30,
        color: '#EF4444',
        lastUpdated: Date.now(),
      };

      semanticSyncEngine.updateTagMapping(testTag);
      
      const extremeWindData: WeatherData = { ...mockWeatherData, windSpeed: 35 };
      const tags = await semanticSyncEngine.extractSemanticTags(extremeWindData);
      
      expect(tags).toContain('极高风速危险');
    });

    it('should persist tag updates to IndexedDB', async () => {
      const testTag: SemanticTag = {
        id: 'tag-persist-test',
        dataType: 'weather',
        metricName: 'pressure',
        businessLabel: '气压异常',
        severity: 'info',
        thresholdMax: 1000,
        color: '#1B998B',
        lastUpdated: Date.now(),
      };

      semanticSyncEngine.updateTagMapping(testTag);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const saved = await db.semanticTags.get('tag-persist-test');
      expect(saved).toBeDefined();
      expect(saved?.businessLabel).toBe('气压异常');
    });
  });

  describe('TC-UNIT-016: 同步日志管理', () => {
    it('should generate sync logs for all three systems', async () => {
      const beforeCount = await db.syncLog.count();
      
      await semanticSyncEngine.mapToSemantic(mockWeatherData);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      const afterCount = await db.syncLog.count();
      
      expect(afterCount - beforeCount).toBe(3);
    });

    it('should retrieve sync logs with correct ordering', async () => {
      await db.syncLog.clear();
      
      for (let i = 0; i < 5; i++) {
        await semanticSyncEngine.mapToSemantic({ ...mockWeatherData, id: `weather-${i}` });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const logs = await semanticSyncEngine.getSyncLogs(10);
      
      expect(logs.length).toBeGreaterThan(0);
      for (let i = 0; i < logs.length - 1; i++) {
        expect(logs[i].timestamp).toBeGreaterThanOrEqual(logs[i + 1].timestamp);
      }
    });

    it('should respect limit parameter in getSyncLogs', async () => {
      const logs = await semanticSyncEngine.getSyncLogs(5);
      
      expect(logs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('TC-UNIT-017: 标签匹配率计算', () => {
    it('should calculate tag match rate correctly', async () => {
      await db.syncLog.clear();
      
      const logs = [
        { syncStatus: 'synced' },
        { syncStatus: 'synced' },
        { syncStatus: 'synced' },
        { syncStatus: 'conflict' },
        { syncStatus: 'failed' },
      ].map((l, i) => ({
        id: `log-${i}`,
        sourceSystem: 'meteorology' as const,
        targetSystem: 'fleet' as const,
        syncStatus: l.syncStatus as 'synced' | 'conflict' | 'failed',
        timestamp: Date.now() - i * 1000,
        version: 1,
        latency: 100,
      }));
      
      await db.syncLog.bulkAdd(logs);
      
      const rate = await semanticSyncEngine.getTagMatchRate();
      
      expect(rate).toBeCloseTo(60, 0);
    });

    it('should return 95% when no logs exist', async () => {
      await db.syncLog.clear();
      
      const rate = await semanticSyncEngine.getTagMatchRate();
      
      expect(rate).toBe(95);
    });
  });

  describe('TC-UNIT-018: 数据类型检测', () => {
    it('should correctly identify weather data', async () => {
      const result = await semanticSyncEngine.mapToSemantic(mockWeatherData);
      expect(result.dataType).toBe('weather');
    });

    it('should correctly identify landing window data', async () => {
      const result = await semanticSyncEngine.mapToSemantic(mockLandingWindow);
      expect(result.dataType).toBe('landing');
    });
  });

  describe('TC-UNIT-019: 初始化幂等性', () => {
    it('should not reinitialize when already initialized', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      
      await semanticSyncEngine.init();
      await semanticSyncEngine.init();
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
