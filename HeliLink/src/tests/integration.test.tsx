import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  ArcElement: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  BarElement: vi.fn(),
  Title: vi.fn(),
  Filler: vi.fn(),
}));

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-line">Line Chart</div>,
  Bar: () => <div data-testid="chart-bar">Bar Chart</div>,
  Doughnut: () => <div data-testid="chart-doughnut">Doughnut Chart</div>,
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="three-canvas">{children}</div>,
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls">OrbitControls</div>,
  Sphere: ({ children }: { children?: React.ReactNode }) => <div data-testid="sphere">{children}</div>,
  Html: ({ children }: { children: React.ReactNode }) => <div data-testid="html">{children}</div>,
  Line: () => <div data-testid="line">Line</div>,
  Text: () => <div data-testid="text">Text</div>,
}));

vi.mock('three', () => ({
  Color: vi.fn().mockImplementation((c: string) => ({ set: vi.fn() })),
  MathUtils: {
    degToRad: (deg: number) => deg * Math.PI / 180,
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/services/api', () => ({
  api: {
    login: vi.fn(),
    getPlatforms: vi.fn(),
    calculateLandingWindows: vi.fn(),
    planRoute: vi.fn(),
    getSyncStatus: vi.fn(),
    getAlerts: vi.fn(),
    acknowledgeAlert: vi.fn(),
    getWeatherData: vi.fn(),
    getCurrentWeather: vi.fn(),
  },
}));

vi.mock('@/services/websocket', () => ({
  mockWebSocket: {
    subscribe: vi.fn(() => vi.fn()),
    sendAlert: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

import { api } from '@/services/api';
import { mockUsers, mockPlatforms, mockSemanticTags } from '@/mock/data';
import { useAuthStore } from '@/store/authStore';
import { useAlertStore } from '@/store/alertStore';
import { useOfflineStore } from '@/store/offlineStore';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ProtectedRoute from '@/components/ProtectedRoute';
import { db } from '@/db';
import type { DWAParams } from '@/types';

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

const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Integration Tests - HeliLink Core Business Scenarios', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    
    (api.login as any).mockImplementation((username: string, password: string) => {
      if (password === '123456') {
        return Promise.resolve(mockUsers.find(u => u.username === username) || null);
      }
      return Promise.resolve(null);
    });
    
    (api.getPlatforms as any).mockResolvedValue(mockPlatforms);
    (api.getCurrentWeather as any).mockResolvedValue({
      windSpeed: 12.5,
      waveHeight: 2.3,
      visibility: 8.5,
      temperature: 24.5,
    });
    
    (api.calculateLandingWindows as any).mockImplementation(async (platformId: string) => {
      const { DWASolver } = await import('@/services/dwaEngine');
      const weatherData = Array.from({ length: 60 }, (_, i) => ({
        id: `weather-${i}`,
        platformId,
        timestamp: Date.now() - i * 60000,
        windSpeed: 8,
        waveHeight: 1.5,
        visibility: 12,
        windDirection: 180,
        wavePeriod: 12,
        temperature: 25,
        pressure: 1015,
        dataQuality: 'good' as const,
      }));
      const solver = new DWASolver(defaultParams);
      const windows = await solver.solve(weatherData, {
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
      return windows;
    });
    
    (api.planRoute as any).mockResolvedValue({
      id: 'route-test',
      departureId: 'plat-001',
      destinationId: 'plat-002',
      waypoints: [
        { latitude: 30, longitude: 120 },
        { latitude: 30.5, longitude: 120.5 },
        { latitude: 31, longitude: 121 },
      ],
      distance: 150,
      estimatedTime: 45,
      fuelCost: 800,
      riskLevel: 'low',
      weatherConditions: { avgWindSpeed: 10, maxWaveHeight: 2, visibility: 8 },
      createdAt: Date.now(),
    });
    
    (api.getSyncStatus as any).mockResolvedValue({
      meteorology: { connected: true, lastSync: Date.now(), latency: 45 },
      fleet: { connected: true, lastSync: Date.now(), latency: 52 },
      platform: { connected: true, lastSync: Date.now(), latency: 38 },
      overallConsistency: 94.5,
      activeConflicts: 0,
    });
    
    useAuthStore.getState().logout();
    useAlertStore.getState().disconnectWebSocket();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('TC-INT-001: 登录流程集成', () => {
    it('should render login page correctly', () => {
      renderWithRouter(<Login />, { route: '/login' });
      
      expect(screen.getByRole('heading', { name: /HELILINK/i })).toBeInTheDocument();
      expect(screen.getByText(/海上钻井平台直升机应急通航路由系统/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/用户名/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/密码/i)).toBeInTheDocument();
    });

    it('should login successfully with admin credentials', async () => {
      renderWithRouter(<Login />, { route: '/login' });
      
      fireEvent.change(screen.getByLabelText(/用户名/i), { target: { value: 'admin' } });
      fireEvent.change(screen.getByLabelText(/密码/i), { target: { value: '123456' } });
      fireEvent.click(screen.getByRole('button', { name: /登.*录/i }));
      
      await waitFor(() => {
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
      });
      
      expect(useAuthStore.getState().user?.role).toBe('admin');
    });

    it('should show error message for invalid credentials', async () => {
      renderWithRouter(<Login />, { route: '/login' });
      
      fireEvent.change(screen.getByLabelText(/用户名/i), { target: { value: 'admin' } });
      fireEvent.change(screen.getByLabelText(/密码/i), { target: { value: 'wrongpass' } });
      fireEvent.click(screen.getByRole('button', { name: /登.*录/i }));
      
      await waitFor(() => {
        expect(useAuthStore.getState().error).toBe('用户名或密码错误');
      });
      
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should login with demo account', async () => {
      renderWithRouter(<Login />, { route: '/login' });
      
      const demoButton = screen.getByText(/系统管理员/i);
      expect(demoButton).toBeInTheDocument();
      
      fireEvent.click(demoButton);
      
      const loginButton = screen.getByRole('button', { name: /登.*录/i });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(useAuthStore.getState().isAuthenticated).toBe(true);
      }, { timeout: 5000 });
      
      expect(useAuthStore.getState().user?.username).toBe('admin');
    });
  });

  describe('TC-INT-002: 状态管理集成验证', () => {
    it('should maintain consistent auth state across stores', async () => {
      await useAuthStore.getState().login('admin', '123456');
      const authStore = useAuthStore.getState();
      const alertStore = useAlertStore.getState();
      
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.user?.role).toBe('admin');
      expect(authStore.hasPermission('*')).toBe(true);
      expect(alertStore.alerts.length).toBe(0);
    });

    it('should update alert store when adding alerts', () => {
      const initialCount = useAlertStore.getState().alerts.length;
      
      useAlertStore.getState().addAlert({
        type: 'weather',
        severity: 'warning',
        title: '集成测试告警',
        message: '这是一个集成测试告警',
        platformId: 'plat-001',
      });
      
      const alertStore = useAlertStore.getState();
      expect(alertStore.alerts.length).toBe(initialCount + 1);
      expect(alertStore.unreadCount).toBe(1);
    });

    it('should manage offline state correctly', () => {
      useOfflineStore.getState().setOnline(false);
      expect(useOfflineStore.getState().isOnline).toBe(false);
      
      useOfflineStore.getState().enterEmergencyMode();
      expect(useOfflineStore.getState().emergencyMode).toBe(true);
      
      useOfflineStore.getState().exitEmergencyMode();
      expect(useOfflineStore.getState().emergencyMode).toBe(false);
      
      useOfflineStore.getState().setOnline(true);
      expect(useOfflineStore.getState().isOnline).toBe(true);
    });
  });

  describe('TC-INT-003: 权限控制集成', () => {
    it('should allow system management access for admin role', async () => {
      await useAuthStore.getState().login('admin', '123456');
      const authStore = useAuthStore.getState();
      
      expect(authStore.hasPermission('system:manage')).toBe(true);
      expect(authStore.hasPermission('*')).toBe(true);
    });

    it('should restrict system management access for non-admin users', async () => {
      await useAuthStore.getState().login('safety', '123456');
      const authStore = useAuthStore.getState();
      
      const safetyUser = authStore.user;
      expect(safetyUser?.role).toBe('platform_safety');
      expect(authStore.hasPermission('system:manage')).toBe(false);
    });

    it('should allow offline access for safety role', async () => {
      await useAuthStore.getState().login('safety', '123456');
      const authStore = useAuthStore.getState();
      
      expect(authStore.hasPermission('offline:access')).toBe(true);
      expect(authStore.hasPermission('monitor:read')).toBe(true);
      expect(authStore.hasPermission('alert:acknowledge')).toBe(true);
    });
  });

  describe('TC-INT-004: API服务层集成', () => {
    it('should fetch platforms via API service', async () => {
      const platforms = await api.getPlatforms();
      
      expect(platforms).toBeDefined();
      expect(Array.isArray(platforms)).toBe(true);
      expect(platforms.length).toBeGreaterThan(0);
      expect(platforms[0]).toHaveProperty('id');
      expect(platforms[0]).toHaveProperty('name');
    });

    it('should calculate landing windows via DWA integration', async () => {
      const windows = await api.calculateLandingWindows('plat-001');
      
      expect(Array.isArray(windows)).toBe(true);
      expect(windows.length).toBeGreaterThan(0);
      expect(windows[0]).toHaveProperty('feasibilityScore');
      expect(windows[0]).toHaveProperty('safetyScore');
      expect(windows[0].safetyScore).toBeGreaterThan(40);
    });

    it('should plan route between platforms', async () => {
      const route = await api.planRoute('plat-001', 'plat-002');
      
      expect(route).toBeDefined();
      expect(route.id).toBe('route-test');
      expect(route.waypoints.length).toBe(3);
      expect(route.riskLevel).toBe('low');
    });

    it('should get sync status for all three systems', async () => {
      const status = await api.getSyncStatus();
      
      expect(status).toBeDefined();
      expect(status.meteorology.connected).toBe(true);
      expect(status.fleet.connected).toBe(true);
      expect(status.platform.connected).toBe(true);
      expect(status.overallConsistency).toBeGreaterThan(90);
    });
  });

  describe('TC-INT-005: 数据卡片百分比格式化验证', () => {
    it('should format trend percentages with 1 decimal place (upward trend)', async () => {
      const { DataCard } = await import('@/components/DataCard');
      
      renderWithRouter(
        <DataCard
          title="当前风速"
          value="12.5"
          trend={{ value: 5.678, isUp: true }}
          status="safe"
        />
      );
      
      const trendElement = screen.getByText(/5\.7%/);
      expect(trendElement).toBeInTheDocument();
      expect(trendElement.textContent).toContain('5.7%');
    });

    it('should format trend percentages with 1 decimal place (downward trend)', async () => {
      const { DataCard } = await import('@/components/DataCard');
      
      renderWithRouter(
        <DataCard
          title="当前浪高"
          value="2.3"
          trend={{ value: -3.214, isUp: false }}
          status="caution"
        />
      );
      
      const trendElement = screen.getByText(/3\.2%/);
      expect(trendElement).toBeInTheDocument();
      expect(trendElement.textContent).toContain('3.2%');
    });
  });

  describe('TC-INT-006: IndexedDB数据层集成', () => {
    beforeEach(async () => {
      const { db } = await import('@/db');
      await db.platformMetadata.clear();
      await db.weatherHistory.clear();
      await db.offlineQueue.clear();
    });

    it('should perform CRUD operations on platformMetadata table', async () => {
      const { db } = await import('@/db');
      
      const testPlatform = {
        id: 'integration-test-001',
        name: '集成测试平台',
        code: 'INT-001',
        latitude: 30.0,
        longitude: 120.0,
        altitude: 30,
        helipadCount: 2,
        maxWindSpeed: 18,
        maxWaveHeight: 3.5,
        status: 'active' as const,
        cables: [],
        lastSync: Date.now(),
      };
      
      const id = await db.platformMetadata.add(testPlatform);
      expect(id).toBe('integration-test-001');
      
      const fetched = await db.platformMetadata.get('integration-test-001');
      expect(fetched?.name).toBe('集成测试平台');
      
      await db.platformMetadata.update('integration-test-001', { name: '更新后的平台' });
      const updated = await db.platformMetadata.get('integration-test-001');
      expect(updated?.name).toBe('更新后的平台');
      
      await db.platformMetadata.delete('integration-test-001');
      const deleted = await db.platformMetadata.get('integration-test-001');
      expect(deleted).toBeUndefined();
    });

    it('should add and process offline queue items', async () => {
      const { db } = await import('@/db');
      
      const item = await db.addToOfflineQueue({
        dataType: 'weather',
        payload: { test: 'integration' },
      });
      
      expect(item.id).toBeDefined();
      expect(item.status).toBe('pending');
      
      const pendingItems = await db.getPendingOfflineItems();
      expect(pendingItems.length).toBe(1);
      
      const stats = await db.getStorageStats();
      expect(stats.offlineQueue).toBe(1);
    });
  });

  describe('TC-INT-007: DWA算法与API集成', () => {
    it('should integrate DWA solver with API layer', async () => {
      const { DWASolver } = await import('@/services/dwaEngine');
      
      const weatherData = Array.from({ length: 60 }, (_, i) => ({
        id: `dwa-int-${i}`,
        platformId: 'plat-001',
        timestamp: Date.now() - i * 60000,
        windSpeed: 8,
        waveHeight: 1.5,
        visibility: 12,
        windDirection: 180,
        wavePeriod: 12,
        temperature: 25,
        pressure: 1015,
        dataQuality: 'good' as const,
      }));
      
      const platform = mockPlatforms[0];
      const solver = new DWASolver(defaultParams);
      const windows = await solver.solve(weatherData, platform);
      
      expect(Array.isArray(windows)).toBe(true);
      expect(windows.length).toBeGreaterThan(0);
      
      const sortedWindows = [...windows].sort((a, b) => b.feasibilityScore - a.feasibilityScore);
      expect(sortedWindows[0].feasibilityScore).toBeGreaterThanOrEqual(sortedWindows[1]?.feasibilityScore || 0);
      
      sortedWindows.forEach(window => {
        expect(window.feasibilityScore).toBeGreaterThanOrEqual(0);
        expect(window.feasibilityScore).toBeLessThanOrEqual(100);
        expect(window.safetyScore).toBeGreaterThanOrEqual(0);
        expect(window.safetyScore).toBeLessThanOrEqual(100);
        expect(window.startTime).toBeLessThan(window.endTime);
      });
    });
  });

  describe('TC-INT-008: 语义同步引擎集成', () => {
    it('should integrate semantic sync engine with API', async () => {
      const { semanticSyncEngine } = await import('@/services/semanticSync');
      const { db } = await import('@/db');
      
      await db.semanticTags.clear();
      await db.semanticTags.bulkAdd(mockSemanticTags);
      await semanticSyncEngine.init();
      
      const weatherData = {
        id: 'semantic-integration-test',
        platformId: 'plat-001',
        timestamp: Date.now(),
        windSpeed: 18,
        waveHeight: 3.2,
        visibility: 2.5,
        windDirection: 180,
        wavePeriod: 12,
        temperature: 25,
        pressure: 1015,
        dataQuality: 'good' as const,
      };
      
      const syncData = await semanticSyncEngine.mapToSemantic(weatherData);
      
      expect(syncData).toBeDefined();
      expect(syncData.dataType).toBe('weather');
      expect(Array.isArray(syncData.semanticTags)).toBe(true);
      expect(syncData.semanticTags.length).toBeGreaterThan(0);
      expect(syncData.syncStatus).toBe('pending');
      
      const tags = await semanticSyncEngine.extractSemanticTags(weatherData);
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });
  });
});
