import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { db } from '@/db';
import type { PlatformMetadata, SubmarineCable, WeatherData, SemanticTag, Alert, HelicopterPosition, OfflineQueueItem } from '@/types';
import { mockPlatforms, mockCables, mockSemanticTags, mockAlerts, mockHelicopters } from '@/mock/data';

describe('IndexedDB Data Layer Unit Tests', () => {
  beforeAll(async () => {
    await db.open();
  });

  beforeEach(async () => {
    await Promise.all([
      db.platformMetadata.clear(),
      db.submarineCables.clear(),
      db.weatherHistory.clear(),
      db.landingHistory.clear(),
      db.semanticTags.clear(),
      db.syncLog.clear(),
      db.offlineQueue.clear(),
      db.alerts.clear(),
      db.helicopterPositions.clear(),
    ]);
  });

  afterAll(async () => {
    await db.close();
  });

  describe('TC-UNIT-020: PlatformMetadata CRUD Operations', () => {
    const testPlatform: PlatformMetadata = {
      id: 'plat-test-001',
      name: '测试钻井平台',
      code: 'TEST-01',
      latitude: 30.5,
      longitude: 125.5,
      altitude: 35,
      helipadCount: 2,
      maxWindSpeed: 18,
      maxWaveHeight: 3.5,
      status: 'active',
      cables: ['cable-001'],
      lastSync: Date.now(),
    };

    it('should create a new platform', async () => {
      const id = await db.platformMetadata.add(testPlatform);
      expect(id).toBe(testPlatform.id);
      
      const saved = await db.platformMetadata.get(testPlatform.id);
      expect(saved).toEqual(testPlatform);
    });

    it('should read a platform by id', async () => {
      await db.platformMetadata.add(testPlatform);
      const platform = await db.platformMetadata.get('plat-test-001');
      
      expect(platform).toBeDefined();
      expect(platform?.name).toBe('测试钻井平台');
      expect(platform?.code).toBe('TEST-01');
    });

    it('should update an existing platform', async () => {
      await db.platformMetadata.add(testPlatform);
      
      const updated = { ...testPlatform, status: 'maintenance' as const, lastSync: Date.now() };
      await db.platformMetadata.put(updated);
      
      const saved = await db.platformMetadata.get(testPlatform.id);
      expect(saved?.status).toBe('maintenance');
    });

    it('should delete a platform', async () => {
      await db.platformMetadata.add(testPlatform);
      
      await db.platformMetadata.delete(testPlatform.id);
      const deleted = await db.platformMetadata.get(testPlatform.id);
      
      expect(deleted).toBeUndefined();
    });

    it('should query platforms by status', async () => {
      const platforms: PlatformMetadata[] = [
        { ...testPlatform, id: 'plat-active-1', status: 'active' },
        { ...testPlatform, id: 'plat-active-2', status: 'active' },
        { ...testPlatform, id: 'plat-maint-1', status: 'maintenance' },
      ];
      
      await db.platformMetadata.bulkAdd(platforms);
      
      const activePlatforms = await db.platformMetadata.where('status').equals('active').toArray();
      expect(activePlatforms.length).toBe(2);
    });

    it('should bulk add multiple platforms', async () => {
      await db.platformMetadata.bulkAdd(mockPlatforms);
      
      const count = await db.platformMetadata.count();
      expect(count).toBe(mockPlatforms.length);
    });
  });

  describe('TC-UNIT-021: SubmarineCable Operations', () => {
    const testCable: SubmarineCable = {
      id: 'cable-test-001',
      name: '测试海缆',
      status: 'normal',
      coordinates: [
        { lat: 30.0, lng: 125.0 },
        { lat: 30.5, lng: 125.5 },
      ],
      length: 50.5,
      capacity: '100Gbps',
      lastSync: Date.now(),
    };

    it('should add and retrieve a cable', async () => {
      await db.submarineCables.add(testCable);
      
      const cable = await db.submarineCables.get('cable-test-001');
      expect(cable).toBeDefined();
      expect(cable?.name).toBe('测试海缆');
    });

    it('should query cables by status', async () => {
      const cables: SubmarineCable[] = [
        { ...testCable, id: 'cable-n-1', status: 'normal' },
        { ...testCable, id: 'cable-w-1', status: 'warning' },
      ];
      
      await db.submarineCables.bulkAdd(cables);
      
      const normalCables = await db.submarineCables.where('status').equals('normal').toArray();
      expect(normalCables.length).toBe(1);
    });

    it('should bulk add mock cables', async () => {
      await db.submarineCables.bulkAdd(mockCables);
      const count = await db.submarineCables.count();
      expect(count).toBe(mockCables.length);
    });
  });

  describe('TC-UNIT-022: WeatherHistory Operations', () => {
    const createWeatherData = (platformId: string, count: number): WeatherData[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `weather-${platformId}-${i}`,
        platformId,
        timestamp: Date.now() - i * 60000,
        windSpeed: 8 + Math.random() * 10,
        waveHeight: 1.5 + Math.random() * 2,
        visibility: 8 + Math.random() * 10,
        windDirection: 180,
        wavePeriod: 12,
        temperature: 25,
        pressure: 1015,
        dataQuality: 'good' as const,
      }));
    };

    it('should store and query weather data by platform', async () => {
      const weatherData = createWeatherData('plat-001', 10);
      await db.weatherHistory.bulkAdd(weatherData);
      
      const data = await db.weatherHistory.where('platformId').equals('plat-001').toArray();
      expect(data.length).toBe(10);
      expect(data.every(d => d.platformId === 'plat-001')).toBe(true);
    });

    it('should query weather data by time range', async () => {
      const now = Date.now();
      const weatherData = createWeatherData('plat-001', 5);
      weatherData[0].timestamp = now - 7200000;
      weatherData[1].timestamp = now - 3600000;
      
      await db.weatherHistory.bulkAdd(weatherData);
      
      const lastHourData = await db.weatherHistory
        .where('[platformId+timestamp]')
        .between(['plat-001', now - 3600000], ['plat-001', now])
        .toArray();
      
      expect(lastHourData.length).toBeGreaterThan(0);
    });

    it('should clear old weather data using clearOldWeatherData', async () => {
      const now = Date.now();
      const oldData = createWeatherData('plat-001', 5).map((d, i) => ({
        ...d,
        id: `weather-old-${i}`,
        timestamp: now - 10 * 24 * 3600000 - i * 60000,
      }));
      const newData = createWeatherData('plat-001', 5).map((d, i) => ({
        ...d,
        id: `weather-new-${i}`,
        timestamp: now - 1000 - i * 60000,
      }));
      
      await db.weatherHistory.bulkAdd([...oldData, ...newData]);
      
      await db.clearOldWeatherData('plat-001', now - 7 * 24 * 3600000);
      
      const remaining = await db.weatherHistory.count();
      expect(remaining).toBe(5);
    });

    it('should sort weather data by timestamp', async () => {
      const weatherData = createWeatherData('plat-001', 10);
      await db.weatherHistory.bulkAdd(weatherData);
      
      const sorted = await db.weatherHistory
        .where('platformId')
        .equals('plat-001')
        .sortBy('timestamp');
      
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].timestamp).toBeLessThanOrEqual(sorted[i + 1].timestamp);
      }
    });
  });

  describe('TC-UNIT-023: SemanticTags Operations', () => {
    it('should store and retrieve semantic tags', async () => {
      await db.semanticTags.bulkAdd(mockSemanticTags);
      
      const tags = await db.semanticTags.toArray();
      expect(tags.length).toBe(mockSemanticTags.length);
    });

    it('should query tags by dataType', async () => {
      await db.semanticTags.bulkAdd(mockSemanticTags);
      
      const weatherTags = await db.semanticTags.where('dataType').equals('weather').toArray();
      expect(weatherTags.length).toBeGreaterThan(0);
      expect(weatherTags.every(t => t.dataType === 'weather')).toBe(true);
    });

    it('should query tags by metricName', async () => {
      await db.semanticTags.bulkAdd(mockSemanticTags);
      
      const windTags = await db.semanticTags.where('[dataType+metricName]').equals(['weather', 'windSpeed']).toArray();
      expect(windTags.length).toBeGreaterThan(0);
    });
  });

  describe('TC-UNIT-024: OfflineQueue Operations', () => {
    it('should add items to offline queue', async () => {
      const item = await db.addToOfflineQueue({
        dataType: 'weather',
        payload: { test: 'data' },
      });
      
      expect(item).toBeDefined();
      expect(item.status).toBe('pending');
      expect(item.retryCount).toBe(0);
    });

    it('should retrieve pending queue items', async () => {
      await Promise.all([
        db.addToOfflineQueue({ dataType: 'weather', payload: {} }),
        db.addToOfflineQueue({ dataType: 'landing', payload: {} }),
        db.offlineQueue.add({
          id: 'queue-failed',
          dataType: 'alert',
          payload: {},
          status: 'failed',
          retryCount: 3,
          createdAt: Date.now(),
        }),
        db.offlineQueue.add({
          id: 'queue-synced',
          dataType: 'alert',
          payload: {},
          status: 'synced',
          retryCount: 0,
          createdAt: Date.now(),
        }),
      ]);
      
      const pending = await db.getPendingOfflineItems();
      expect(pending.length).toBe(3);
      expect(pending.every(i => i.status === 'pending' || i.status === 'failed')).toBe(true);
    });

    it('should process queue items correctly', async () => {
      await db.addToOfflineQueue({ dataType: 'weather', payload: {} });
      
      const pending = await db.getPendingOfflineItems();
      expect(pending.length).toBe(1);
      
      for (const item of pending) {
        await db.offlineQueue.update(item.id, { status: 'synced' });
      }
      
      const stillPending = await db.getPendingOfflineItems();
      expect(stillPending.length).toBe(0);
    });
  });

  describe('TC-UNIT-025: Alerts Operations', () => {
    it('should store and query alerts', async () => {
      await db.alerts.bulkAdd(mockAlerts);
      
      const alerts = await db.alerts.orderBy('timestamp').reverse().toArray();
      expect(alerts.length).toBe(mockAlerts.length);
    });

    it('should query unacknowledged alerts', async () => {
      await db.alerts.bulkAdd(mockAlerts);
      
      const unacknowledged = await db.alerts
        .filter(a => !a.acknowledged)
        .toArray();
      
      expect(unacknowledged.length).toBeGreaterThan(0);
    });

    it('should acknowledge an alert', async () => {
      const alert: Alert = {
        id: 'alert-test',
        type: 'weather',
        severity: 'warning',
        title: '测试告警',
        message: '这是一个测试告警',
        timestamp: Date.now(),
        acknowledged: false,
      };
      
      await db.alerts.add(alert);
      await db.alerts.update('alert-test', { acknowledged: true });
      
      const updated = await db.alerts.get('alert-test');
      expect(updated?.acknowledged).toBe(true);
    });
  });

  describe('TC-UNIT-026: HelicopterPositions Operations', () => {
    it('should store and retrieve helicopter positions', async () => {
      await db.helicopterPositions.bulkAdd(mockHelicopters);
      
      const positions = await db.helicopterPositions.toArray();
      expect(positions.length).toBe(mockHelicopters.length);
    });

    it('should query positions by flight number', async () => {
      await db.helicopterPositions.bulkAdd(mockHelicopters);
      
      const heli = await db.helicopterPositions.where('flightNumber').equals('HL-2024-001').first();
      expect(heli).toBeDefined();
      expect(heli?.flightNumber).toBe('HL-2024-001');
    });

    it('should update helicopter position', async () => {
      const heli: HelicopterPosition = {
        id: 'heli-test',
        flightNumber: 'TEST-001',
        latitude: 30.0,
        longitude: 125.0,
        altitude: 500,
        heading: 180,
        speed: 200,
        origin: 'plat-001',
        destination: 'plat-002',
        status: 'en-route',
        timestamp: Date.now(),
      };
      
      await db.helicopterPositions.add(heli);
      
      await db.helicopterPositions.update('heli-test', {
        latitude: 30.5,
        longitude: 125.5,
        timestamp: Date.now(),
      });
      
      const updated = await db.helicopterPositions.get('heli-test');
      expect(updated?.latitude).toBe(30.5);
      expect(updated?.longitude).toBe(125.5);
    });
  });

  describe('TC-UNIT-027: Storage Statistics', () => {
    it('should return correct storage statistics', async () => {
      await db.platformMetadata.bulkAdd(mockPlatforms);
      await db.submarineCables.bulkAdd(mockCables);
      
      const stats = await db.getStorageStats();
      
      expect(stats.platformMetadata).toBe(mockPlatforms.length);
      expect(stats.submarineCables).toBe(mockCables.length);
      expect(stats.total).toBeGreaterThan(0);
    });
  });

  describe('TC-UNIT-028: Database Transaction Integrity', () => {
    it('should handle bulk operations atomically', async () => {
      const platforms: PlatformMetadata[] = [
        { ...mockPlatforms[0], id: 'tx-test-1' },
        { ...mockPlatforms[0], id: 'tx-test-2' },
        { ...mockPlatforms[0], id: 'tx-test-3' },
      ];

      try {
        await db.transaction('rw', db.platformMetadata, async () => {
          await db.platformMetadata.bulkAdd(platforms);
        });

        const count = await db.platformMetadata.count();
        expect(count).toBe(3);
      } catch (e) {
        expect.fail('Transaction should not fail');
      }
    });
  });
});
