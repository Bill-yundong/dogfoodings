import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useOfflineStore } from '@/store/offlineStore';
import { useAlertStore } from '@/store/alertStore';
import { db } from '@/db';
import { mockUsers } from '@/mock/data';

vi.mock('@/services/api', () => ({
  api: {
    login: vi.fn(),
    getAlerts: vi.fn(),
    acknowledgeAlert: vi.fn(),
  },
}));

import { api } from '@/services/api';

describe('State Management Unit Tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    
    (api.login as any).mockImplementation((username: string, password: string) => {
      if (password === '123456') {
        return Promise.resolve(mockUsers.find(u => u.username === username) || null);
      }
      return Promise.resolve(null);
    });
    
    (api.getAlerts as any).mockResolvedValue([
      {
        id: 'init-alert',
        type: 'weather',
        severity: 'warning',
        title: '初始化告警',
        message: '测试',
        timestamp: Date.now(),
        acknowledged: false,
      },
    ]);
    
    (api.acknowledgeAlert as any).mockResolvedValue(undefined);
    
    useAuthStore.getState().logout();
    useAlertStore.getState().disconnectWebSocket();
    
    await db.alerts.clear();
    await db.weatherHistory.clear();
    await db.offlineQueue.clear();
    await db.platformMetadata.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('TC-UNIT-029: 认证状态管理 - 登录流程', () => {
    it('should login successfully with correct credentials', async () => {
      const result = await useAuthStore.getState().login('admin', '123456');
      const authStore = useAuthStore.getState();
      
      expect(result).toBe(true);
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.user?.username).toBe('admin');
      expect(authStore.user?.role).toBe('admin');
    });

    it('should fail login with incorrect password', async () => {
      const result = await useAuthStore.getState().login('admin', 'wrongpassword');
      const authStore = useAuthStore.getState();
      
      expect(result).toBe(false);
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.error).toBe('用户名或密码错误');
    });

    it('should fail login with non-existent user', async () => {
      const result = await useAuthStore.getState().login('nonexistent', '123456');
      const authStore = useAuthStore.getState();
      
      expect(result).toBe(false);
      expect(authStore.isAuthenticated).toBe(false);
    });

    it('should set loading state during login', async () => {
      const loginPromise = useAuthStore.getState().login('admin', '123456');
      
      expect(useAuthStore.getState().isLoading).toBe(true);
      
      await loginPromise;
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('TC-UNIT-030: 认证状态管理 - 登出流程', () => {
    it('should logout correctly', async () => {
      await useAuthStore.getState().login('admin', '123456');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      
      useAuthStore.getState().logout();
      
      const authStore = useAuthStore.getState();
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.user).toBeNull();
      expect(localStorage.getItem('userRole')).toBeNull();
    });
  });

  describe('TC-UNIT-031: 权限校验', () => {
    it('admin should have all permissions', async () => {
      await useAuthStore.getState().login('admin', '123456');
      const authStore = useAuthStore.getState();
      
      expect(authStore.hasPermission('*')).toBe(true);
      expect(authStore.hasPermission('any:permission')).toBe(true);
      expect(authStore.hasPermission('system:manage')).toBe(true);
    });

    it('commander should have limited permissions', async () => {
      await useAuthStore.getState().login('commander', '123456');
      const authStore = useAuthStore.getState();
      
      expect(authStore.hasPermission('monitor:read')).toBe(true);
      expect(authStore.hasPermission('route:create')).toBe(true);
      expect(authStore.hasPermission('system:manage')).toBe(false);
    });

    it('unauthenticated user should have no permissions', () => {
      const authStore = useAuthStore.getState();
      
      expect(authStore.hasPermission('monitor:read')).toBe(false);
      expect(authStore.hasPermission('*')).toBe(false);
    });
  });

  describe('TC-UNIT-032: 离线状态管理 - 应急模式', () => {
    it('should enter emergency mode', () => {
      useOfflineStore.getState().enterEmergencyMode();
      
      const offlineStore = useOfflineStore.getState();
      expect(offlineStore.emergencyMode).toBe(true);
    });

    it('should exit emergency mode', () => {
      useOfflineStore.getState().enterEmergencyMode();
      expect(useOfflineStore.getState().emergencyMode).toBe(true);
      
      useOfflineStore.getState().exitEmergencyMode();
      
      const offlineStore = useOfflineStore.getState();
      expect(offlineStore.emergencyMode).toBe(false);
    });

    it('should toggle online status', () => {
      useOfflineStore.getState().setOnline(false);
      expect(useOfflineStore.getState().isOnline).toBe(false);
      
      useOfflineStore.getState().setOnline(true);
      
      const offlineStore = useOfflineStore.getState();
      expect(offlineStore.isOnline).toBe(true);
    });
  });

  describe('TC-UNIT-033: 离线状态管理 - 缓存统计', () => {
    it('should load storage statistics', async () => {
      await db.platformMetadata.clear();
      await db.platformMetadata.bulkAdd([
        {
          id: 'stat-test-1',
          name: '统计测试平台1',
          code: 'STAT-1',
          latitude: 30,
          longitude: 120,
          altitude: 30,
          helipadCount: 2,
          maxWindSpeed: 18,
          maxWaveHeight: 3.5,
          status: 'active',
          cables: [],
          lastSync: Date.now(),
        },
        {
          id: 'stat-test-2',
          name: '统计测试平台2',
          code: 'STAT-2',
          latitude: 31,
          longitude: 121,
          altitude: 30,
          helipadCount: 2,
          maxWindSpeed: 18,
          maxWaveHeight: 3.5,
          status: 'active',
          cables: [],
          lastSync: Date.now(),
        },
      ]);
      
      await useOfflineStore.getState().loadStorageStats();
      
      const offlineStore = useOfflineStore.getState();
      expect(offlineStore.storageStats?.platformMetadata).toBe(2);
      expect(offlineStore.storageStats?.total).toBeGreaterThan(0);
    });
  });

  describe('TC-UNIT-034: 离线状态管理 - 队列管理', () => {
    beforeEach(async () => {
      await db.offlineQueue.clear();
    });

    it('should add item to queue', async () => {
      await useOfflineStore.getState().addToQueue('weather', { test: 'data' });
      await useOfflineStore.getState().loadQueueItems();
      
      const offlineStore = useOfflineStore.getState();
      expect(offlineStore.queueItems.length).toBe(1);
      expect(offlineStore.queueItems[0].dataType).toBe('weather');
      expect(offlineStore.queueItems[0].status).toBe('pending');
    });

    it('should process queue successfully', async () => {
      await useOfflineStore.getState().addToQueue('weather', { test: 'data1' });
      await useOfflineStore.getState().addToQueue('landing', { test: 'data2' });
      
      const successCount = await useOfflineStore.getState().processQueue();
      expect(successCount).toBe(2);
      
      await useOfflineStore.getState().loadQueueItems();
      const offlineStore = useOfflineStore.getState();
      expect(offlineStore.queueItems.every(i => i.status === 'synced')).toBe(true);
    });
  });

  describe('TC-UNIT-035: 告警状态管理', () => {
    beforeEach(() => {
      useAlertStore.setState({ alerts: [], unreadCount: 0 });
    });

    it('should add alert and increment unread count', () => {
      useAlertStore.getState().addAlert({
        type: 'weather',
        severity: 'warning',
        title: '测试告警',
        message: '这是一个测试告警',
        platformId: 'plat-001',
      });
      
      const alertStore = useAlertStore.getState();
      expect(alertStore.alerts.length).toBe(1);
      expect(alertStore.unreadCount).toBe(1);
      expect(alertStore.alerts[0].title).toBe('测试告警');
      expect(alertStore.alerts[0].acknowledged).toBe(false);
    });

    it('should set alerts correctly', () => {
      const testAlerts = [
        {
          id: 'alert-1',
          type: 'weather' as const,
          severity: 'warning' as const,
          title: '告警1',
          message: '消息1',
          timestamp: Date.now(),
          acknowledged: false,
        },
        {
          id: 'alert-2',
          type: 'sync' as const,
          severity: 'info' as const,
          title: '告警2',
          message: '消息2',
          timestamp: Date.now() - 1000,
          acknowledged: true,
        },
      ];
      
      useAlertStore.getState().setAlerts(testAlerts);
      
      const alertStore = useAlertStore.getState();
      expect(alertStore.alerts.length).toBe(2);
      expect(alertStore.unreadCount).toBe(1);
    });

    it('should acknowledge alert and decrement unread count', async () => {
      useAlertStore.getState().addAlert({
        type: 'weather',
        severity: 'warning',
        title: '可确认告警',
        message: '测试',
      });
      
      expect(useAlertStore.getState().unreadCount).toBe(1);
      
      const alertId = useAlertStore.getState().alerts[0].id;
      await useAlertStore.getState().acknowledgeAlert(alertId);
      
      const alertStore = useAlertStore.getState();
      expect(alertStore.unreadCount).toBe(0);
      expect(alertStore.alerts[0].acknowledged).toBe(true);
    });
  });

  describe('TC-UNIT-036: 持久化状态验证', () => {
    it('should persist auth state in localStorage', async () => {
      await useAuthStore.getState().login('admin', '123456');
      
      const storedAuth = localStorage.getItem('helilink-auth');
      expect(storedAuth).not.toBeNull();
      
      const parsed = JSON.parse(storedAuth || '{}');
      expect(parsed.state.isAuthenticated).toBe(true);
      expect(parsed.state.user.username).toBe('admin');
    });
  });

  describe('TC-UNIT-037: 应急安全指引', () => {
    it('should return emergency guidance with steps and fallback landings', () => {
      const guidance = useOfflineStore.getState().getEmergencyGuidance();
      
      expect(guidance).toHaveProperty('steps');
      expect(guidance).toHaveProperty('fallbackLanding');
      expect(Array.isArray(guidance.steps)).toBe(true);
      expect(guidance.steps.length).toBeGreaterThan(0);
      expect(guidance.fallbackLanding.length).toBeGreaterThan(0);
    });
  });

  describe('TC-UNIT-038: 离线数据清理', () => {
    it('should clear old weather data', async () => {
      const now = Date.now();
      
      await db.platformMetadata.add({
        id: 'plat-001',
        name: '测试平台',
        code: 'TEST',
        latitude: 30,
        longitude: 120,
        altitude: 30,
        helipadCount: 2,
        maxWindSpeed: 18,
        maxWaveHeight: 3.5,
        status: 'active',
        cables: [],
        lastSync: Date.now(),
      });
      
      const oldData = Array.from({ length: 10 }, (_, i) => ({
        id: `old-weather-${i}`,
        platformId: 'plat-001',
        timestamp: now - 10 * 24 * 3600000 - i * 60000,
        windSpeed: 10,
        waveHeight: 2,
        visibility: 10,
        windDirection: 180,
        wavePeriod: 12,
        temperature: 25,
        pressure: 1015,
        dataQuality: 'good' as const,
      }));
      
      await db.weatherHistory.bulkAdd(oldData);
      
      await useOfflineStore.getState().clearOldData(7);
      await useOfflineStore.getState().loadStorageStats();
      
      const offlineStore = useOfflineStore.getState();
      expect(offlineStore.storageStats?.weatherHistory).toBe(0);
    });
  });

  describe('TC-UNIT-039: 状态初始化', () => {
    it('should initialize alert store', async () => {
      await useAlertStore.getState().init();
      
      const alertStore = useAlertStore.getState();
      expect(alertStore.alerts.length).toBeGreaterThan(0);
      expect(alertStore.unreadCount).toBeGreaterThan(0);
    });
  });
});
