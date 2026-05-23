import type {
  PlatformMetadata,
  SubmarineCable,
  WeatherData,
  SemanticTag,
  User,
  HelicopterPosition,
  Alert,
} from '@/types';

export const mockPlatforms: PlatformMetadata[] = [
  {
    id: 'plat-001',
    name: '东海一号钻井平台',
    code: 'DH-01',
    latitude: 30.5678,
    longitude: 125.1234,
    altitude: 35,
    helipadCount: 2,
    maxWindSpeed: 18,
    maxWaveHeight: 3.5,
    status: 'active',
    cables: ['cable-001', 'cable-002'],
    lastSync: Date.now(),
  },
  {
    id: 'plat-002',
    name: '南海二号钻井平台',
    code: 'NH-02',
    latitude: 18.3456,
    longitude: 113.5678,
    altitude: 42,
    helipadCount: 3,
    maxWindSpeed: 20,
    maxWaveHeight: 4.0,
    status: 'active',
    cables: ['cable-002', 'cable-003'],
    lastSync: Date.now(),
  },
  {
    id: 'plat-003',
    name: '渤海三号钻井平台',
    code: 'BH-03',
    latitude: 38.1234,
    longitude: 119.8765,
    altitude: 28,
    helipadCount: 2,
    maxWindSpeed: 16,
    maxWaveHeight: 3.0,
    status: 'maintenance',
    cables: ['cable-001'],
    lastSync: Date.now(),
  },
  {
    id: 'plat-004',
    name: '黄海四号钻井平台',
    code: 'HH-04',
    latitude: 35.6789,
    longitude: 123.4567,
    altitude: 38,
    helipadCount: 2,
    maxWindSpeed: 17,
    maxWaveHeight: 3.2,
    status: 'active',
    cables: ['cable-003', 'cable-004'],
    lastSync: Date.now(),
  },
  {
    id: 'plat-005',
    name: '东海五号钻井平台',
    code: 'DH-05',
    latitude: 29.8765,
    longitude: 126.2345,
    altitude: 40,
    helipadCount: 3,
    maxWindSpeed: 19,
    maxWaveHeight: 3.8,
    status: 'emergency',
    cables: ['cable-004'],
    lastSync: Date.now(),
  },
  {
    id: 'plat-006',
    name: '陆地指挥中心',
    code: 'CC-00',
    latitude: 31.2304,
    longitude: 121.4737,
    altitude: 15,
    helipadCount: 1,
    maxWindSpeed: 25,
    maxWaveHeight: 0,
    status: 'active',
    cables: [],
    lastSync: Date.now(),
  },
];

export const mockCables: SubmarineCable[] = [
  {
    id: 'cable-001',
    name: '东海-渤海主干海缆',
    coordinates: [
      { lat: 30.5678, lng: 125.1234 },
      { lat: 32.0, lng: 124.0 },
      { lat: 34.0, lng: 122.5 },
      { lat: 36.0, lng: 121.0 },
      { lat: 38.1234, lng: 119.8765 },
    ],
    depth: 85,
    voltage: 220,
    status: 'normal',
    lastSync: Date.now(),
  },
  {
    id: 'cable-002',
    name: '东海-南海互联海缆',
    coordinates: [
      { lat: 30.5678, lng: 125.1234 },
      { lat: 28.0, lng: 123.5 },
      { lat: 25.0, lng: 120.0 },
      { lat: 22.0, lng: 116.0 },
      { lat: 18.3456, lng: 113.5678 },
    ],
    depth: 120,
    voltage: 330,
    status: 'warning',
    lastSync: Date.now(),
  },
  {
    id: 'cable-003',
    name: '南海-黄海备用海缆',
    coordinates: [
      { lat: 18.3456, lng: 113.5678 },
      { lat: 22.0, lng: 115.0 },
      { lat: 26.0, lng: 118.0 },
      { lat: 30.0, lng: 121.0 },
      { lat: 35.6789, lng: 123.4567 },
    ],
    depth: 95,
    voltage: 220,
    status: 'normal',
    lastSync: Date.now(),
  },
  {
    id: 'cable-004',
    name: '黄海-东海环线海缆',
    coordinates: [
      { lat: 35.6789, lng: 123.4567 },
      { lat: 33.0, lng: 125.0 },
      { lat: 31.0, lng: 126.5 },
      { lat: 29.8765, lng: 126.2345 },
    ],
    depth: 78,
    voltage: 110,
    status: 'damaged',
    lastSync: Date.now(),
  },
];

export const mockSemanticTags: SemanticTag[] = [
  { id: 'tag-001', dataType: 'weather', metricName: 'windSpeed', businessLabel: '正常风速', severity: 'info', colorCode: '#1B998B', thresholdMax: 10 },
  { id: 'tag-002', dataType: 'weather', metricName: 'windSpeed', businessLabel: '高风速预警', severity: 'warning', colorCode: '#F46036', thresholdMin: 10, thresholdMax: 15 },
  { id: 'tag-003', dataType: 'weather', metricName: 'windSpeed', businessLabel: '超高风速告警', severity: 'danger', colorCode: '#EF4444', thresholdMin: 15 },
  { id: 'tag-004', dataType: 'weather', metricName: 'waveHeight', businessLabel: '正常浪高', severity: 'info', colorCode: '#1B998B', thresholdMax: 1.5 },
  { id: 'tag-005', dataType: 'weather', metricName: 'waveHeight', businessLabel: '大浪预警', severity: 'warning', colorCode: '#F46036', thresholdMin: 1.5, thresholdMax: 3 },
  { id: 'tag-006', dataType: 'weather', metricName: 'waveHeight', businessLabel: '巨浪告警', severity: 'danger', colorCode: '#EF4444', thresholdMin: 3 },
  { id: 'tag-007', dataType: 'weather', metricName: 'visibility', businessLabel: '良好能见度', severity: 'info', colorCode: '#1B998B', thresholdMin: 5 },
  { id: 'tag-008', dataType: 'weather', metricName: 'visibility', businessLabel: '低能见度', severity: 'warning', colorCode: '#F46036', thresholdMin: 2, thresholdMax: 5 },
  { id: 'tag-009', dataType: 'weather', metricName: 'visibility', businessLabel: '极低能见度', severity: 'danger', colorCode: '#EF4444', thresholdMax: 2 },
  { id: 'tag-010', dataType: 'landing', metricName: 'feasibilityScore', businessLabel: '优佳着陆窗口', severity: 'info', colorCode: '#1B998B', thresholdMin: 80 },
  { id: 'tag-011', dataType: 'landing', metricName: 'feasibilityScore', businessLabel: '可行着陆窗口', severity: 'warning', colorCode: '#F46036', thresholdMin: 60, thresholdMax: 80 },
  { id: 'tag-012', dataType: 'landing', metricName: 'feasibilityScore', businessLabel: '高风险窗口', severity: 'danger', colorCode: '#EF4444', thresholdMax: 60 },
  { id: 'tag-013', dataType: 'alert', metricName: 'sync', businessLabel: '数据同步正常', severity: 'info', colorCode: '#1B998B' },
  { id: 'tag-014', dataType: 'alert', metricName: 'sync', businessLabel: '同步延迟警告', severity: 'warning', colorCode: '#F46036' },
  { id: 'tag-015', dataType: 'alert', metricName: 'sync', businessLabel: '同步失败告警', severity: 'danger', colorCode: '#EF4444' },
];

export const mockUsers: User[] = [
  {
    id: 'user-001',
    username: 'admin',
    name: '系统管理员',
    role: 'admin',
    permissions: ['*'],
  },
  {
    id: 'user-002',
    username: 'commander',
    name: '张指挥',
    role: 'fleet_commander',
    permissions: ['monitor:read', 'route:create', 'route:update', 'offline:access', 'alert:acknowledge', 'history:read'],
  },
  {
    id: 'user-003',
    username: 'meteorologist',
    name: '李分析师',
    role: 'meteorologist',
    permissions: ['monitor:read', 'dwa:configure', 'sync:configure', 'weather:calibrate', 'offline:access', 'history:read'],
  },
  {
    id: 'user-004',
    username: 'safety',
    name: '王安全员',
    role: 'platform_safety',
    permissions: ['monitor:read', 'offline:access', 'alert:acknowledge'],
  },
];

export const generateWeatherData = (platformId: string, startTime: number, count: number, interval: number): WeatherData[] => {
  const data: WeatherData[] = [];
  const baseWindSpeed = 8 + Math.random() * 10;
  const baseWaveHeight = 1.5 + Math.random() * 2;

  for (let i = 0; i < count; i++) {
    const timestamp = startTime - i * interval;
    const windVariation = Math.sin(i * 0.1) * 5 + Math.random() * 3;
    const waveVariation = Math.cos(i * 0.08) * 1.5 + Math.random() * 0.8;

    const windSpeed = Math.max(0, Math.min(30, baseWindSpeed + windVariation));
    const waveHeight = Math.max(0, Math.min(8, baseWaveHeight + waveVariation));
    const visibility = Math.max(0.5, Math.min(20, 10 - waveHeight * 0.5 + Math.random() * 3));

    let dataQuality: 'good' | 'warning' | 'critical' = 'good';
    if (windSpeed > 15 || waveHeight > 3 || visibility < 2) {
      dataQuality = windSpeed > 22 || waveHeight > 5 || visibility < 1 ? 'critical' : 'warning';
    }

    data.push({
      id: `weather-${platformId}-${timestamp}`,
      timestamp,
      platformId,
      windSpeed: Number(windSpeed.toFixed(1)),
      windDirection: Math.floor(Math.random() * 360),
      waveHeight: Number(waveHeight.toFixed(1)),
      wavePeriod: Number((8 + Math.random() * 6).toFixed(1)),
      temperature: Number((18 + Math.random() * 10).toFixed(1)),
      pressure: Number((1013 + Math.random() * 20 - 10).toFixed(0)),
      visibility: Number(visibility.toFixed(1)),
      dataQuality,
    });
  }

  return data;
};

export const mockHelicopters: HelicopterPosition[] = [
  {
    id: 'heli-001',
    flightNumber: 'HL-2024-001',
    latitude: 31.5,
    longitude: 124.5,
    altitude: 500,
    heading: 180,
    speed: 220,
    origin: 'plat-006',
    destination: 'plat-001',
    status: 'en-route',
    timestamp: Date.now(),
  },
  {
    id: 'heli-002',
    flightNumber: 'HL-2024-002',
    latitude: 20.0,
    longitude: 114.0,
    altitude: 800,
    heading: 270,
    speed: 200,
    origin: 'plat-002',
    destination: 'plat-004',
    status: 'en-route',
    timestamp: Date.now(),
  },
];

export const mockAlerts: Alert[] = [
  {
    id: 'alert-001',
    type: 'weather',
    severity: 'warning',
    title: 'DH-01平台高风速预警',
    message: '东海一号平台风速达到12.5m/s，请注意监测',
    platformId: 'plat-001',
    timestamp: Date.now() - 1800000,
    acknowledged: false,
  },
  {
    id: 'alert-002',
    type: 'sync',
    severity: 'info',
    title: '系统同步状态正常',
    message: '气象系统、机队指挥、平台终端三端数据同步完成',
    timestamp: Date.now() - 900000,
    acknowledged: true,
  },
  {
    id: 'alert-003',
    type: 'safety',
    severity: 'critical',
    title: 'DH-05平台应急状态',
    message: '东海五号平台触发应急状态，请注意救援通道畅通',
    platformId: 'plat-005',
    timestamp: Date.now() - 300000,
    acknowledged: false,
  },
];

export const rolePermissions: Record<string, string[]> = {
  admin: [
    'dashboard:view',
    'route:view',
    'route:create',
    'sync:view',
    'sync:configure',
    'offline:view',
    'offline:configure',
    'system:view',
    'system:manage',
    'alerts:manage',
    'monitor:read',
    'dwa:configure',
    'weather:calibrate',
    'history:read',
    'offline:access',
    'alert:acknowledge',
    '*',
  ],
  fleet_commander: [
    'dashboard:view',
    'route:view',
    'route:create',
    'sync:view',
    'offline:view',
    'alerts:manage',
    'monitor:read',
    'route:update',
    'offline:access',
    'alert:acknowledge',
    'history:read',
  ],
  meteorologist: [
    'dashboard:view',
    'route:view',
    'sync:view',
    'sync:configure',
    'offline:view',
    'alerts:manage',
    'monitor:read',
    'dwa:configure',
    'weather:calibrate',
    'offline:access',
    'history:read',
    'alert:acknowledge',
  ],
  platform_safety: [
    'dashboard:view',
    'route:view',
    'sync:view',
    'offline:view',
    'offline:configure',
    'alerts:manage',
    'monitor:read',
    'offline:access',
    'alert:acknowledge',
  ],
};
