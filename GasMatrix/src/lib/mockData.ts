import type { PressureStation, PipeSegment, Alert, Command, Snapshot, User, SystemSettings } from '@/types';

export const mockStations: PressureStation[] = [
  {
    id: 'ST001',
    name: '东城调压站',
    lng: 116.4074,
    lat: 39.9042,
    normalPressure: 300000,
    minPressure: 250000,
    maxPressure: 350000,
    status: 'online',
    address: '东城区东长安街1号',
  },
  {
    id: 'ST002',
    name: '西城调压站',
    lng: 116.3642,
    lat: 39.9128,
    normalPressure: 300000,
    minPressure: 250000,
    maxPressure: 350000,
    status: 'online',
    address: '西城区西直门内大街',
  },
  {
    id: 'ST003',
    name: '朝阳调压站',
    lng: 116.4551,
    lat: 39.9219,
    normalPressure: 300000,
    minPressure: 250000,
    maxPressure: 350000,
    status: 'warning',
    address: '朝阳区建国门外大街',
  },
  {
    id: 'ST004',
    name: '海淀调压站',
    lng: 116.3177,
    lat: 39.9682,
    normalPressure: 300000,
    minPressure: 250000,
    maxPressure: 350000,
    status: 'online',
    address: '海淀区中关村大街',
  },
  {
    id: 'ST005',
    name: '丰台调压站',
    lng: 116.2869,
    lat: 39.8586,
    normalPressure: 300000,
    minPressure: 250000,
    maxPressure: 350000,
    status: 'online',
    address: '丰台区丰台路',
  },
  {
    id: 'ST006',
    name: '石景山调压站',
    lng: 116.2228,
    lat: 39.9066,
    normalPressure: 300000,
    minPressure: 250000,
    maxPressure: 350000,
    status: 'danger',
    address: '石景山区石景山路',
  },
  {
    id: 'ST007',
    name: '通州调压站',
    lng: 116.6563,
    lat: 39.9085,
    normalPressure: 300000,
    minPressure: 250000,
    maxPressure: 350000,
    status: 'online',
    address: '通州区新华大街',
  },
  {
    id: 'ST008',
    name: '顺义调压站',
    lng: 116.6543,
    lat: 40.1307,
    normalPressure: 300000,
    minPressure: 250000,
    maxPressure: 350000,
    status: 'online',
    address: '顺义区府前中街',
  },
];

export const mockPipeSegments: PipeSegment[] = [
  { id: 'PIPE001', fromStation: 'ST001', toStation: 'ST002', length: 5200, diameter: 0.5, roughness: 0.00015 },
  { id: 'PIPE002', fromStation: 'ST001', toStation: 'ST003', length: 4800, diameter: 0.4, roughness: 0.00015 },
  { id: 'PIPE003', fromStation: 'ST002', toStation: 'ST004', length: 6100, diameter: 0.5, roughness: 0.00015 },
  { id: 'PIPE004', fromStation: 'ST003', toStation: 'ST007', length: 8500, diameter: 0.4, roughness: 0.00015 },
  { id: 'PIPE005', fromStation: 'ST004', toStation: 'ST005', length: 5800, diameter: 0.5, roughness: 0.00015 },
  { id: 'PIPE006', fromStation: 'ST004', toStation: 'ST006', length: 7200, diameter: 0.4, roughness: 0.00015 },
  { id: 'PIPE007', fromStation: 'ST005', toStation: 'ST006', length: 4500, diameter: 0.3, roughness: 0.00015 },
  { id: 'PIPE008', fromStation: 'ST007', toStation: 'ST008', length: 12000, diameter: 0.5, roughness: 0.00015 },
];

export const generateInitialPressureData = (): Record<string, number> => {
  const data: Record<string, number> = {};
  mockStations.forEach((station) => {
    const variation = (Math.random() - 0.5) * 0.15;
    data[station.id] = Math.round(station.normalPressure * (1 + variation));
  });
  return data;
};

export const generateInitialFlowData = (): Record<string, number> => {
  const data: Record<string, number> = {};
  mockStations.forEach((station) => {
    data[station.id] = Math.round((80 + Math.random() * 60) * 10) / 10;
  });
  return data;
};

export const generateMockAlerts = (): Alert[] => {
  return [
    {
      id: 'ALT001',
      stationId: 'ST003',
      type: 'pressure_low',
      level: 'warning',
      message: '朝阳调压站压力接近下限',
      timestamp: Date.now() - 300000,
      acknowledged: false,
    },
    {
      id: 'ALT002',
      stationId: 'ST006',
      type: 'pressure_high',
      level: 'danger',
      message: '石景山调压站压力超出上限',
      timestamp: Date.now() - 120000,
      acknowledged: false,
    },
    {
      id: 'ALT003',
      stationId: 'ST001',
      type: 'flow_abnormal',
      level: 'info',
      message: '东城调压站流量波动异常',
      timestamp: Date.now() - 600000,
      acknowledged: true,
      acknowledgedAt: Date.now() - 300000,
      acknowledgedBy: '张工',
    },
  ];
};

export const generateMockCommands = (): Command[] => {
  return [
    {
      id: 'CMD001',
      stationId: 'ST003',
      targetPressure: 290000,
      status: 'executing',
      issuedAt: Date.now() - 180000,
      operator: '李工',
      remark: '早高峰调峰',
    },
    {
      id: 'CMD002',
      stationId: 'ST006',
      targetPressure: 310000,
      status: 'pending',
      issuedAt: Date.now() - 60000,
      operator: '王工',
      remark: '压力过高调节',
    },
  ];
};

export const generateMockSnapshots = (count: number = 24): Snapshot[] => {
  const snapshots: Snapshot[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const pressureData: Record<string, number> = {};
    const flowData: Record<string, number> = {};
    
    mockStations.forEach((station) => {
      pressureData[station.id] = Math.round(station.normalPressure * (0.9 + Math.random() * 0.2));
      flowData[station.id] = Math.round((80 + Math.random() * 60) * 10) / 10;
    });

    const avgPressure = Object.values(pressureData).reduce((a, b) => a + b, 0) / Object.values(pressureData).length;
    const totalFlow = Object.values(flowData).reduce((a, b) => a + b, 0);

    snapshots.push({
      id: `SNAP${String(i + 1).padStart(3, '0')}`,
      timestamp: now - i * 3600000,
      pressureData,
      flowData,
      totalStorage: Math.round(50000 + Math.random() * 10000),
      periodType: 'hourly',
      avgPressure: Math.round(avgPressure),
      totalFlow: Math.round(totalFlow * 10) / 10,
      peakHour: 8 + Math.floor(Math.random() * 4),
      abnormalStations: Math.floor(Math.random() * 3),
    });
  }
  
  return snapshots;
};

export const mockUser: User = {
  id: 'U001',
  username: 'admin',
  name: '系统管理员',
  role: 'admin',
  permissions: ['all'],
};

export const defaultSettings: SystemSettings = {
  pressureUnit: 'kPa',
  flowUnit: 'm³/h',
  temperatureUnit: 'C',
  alertSound: true,
  autoRefresh: true,
  refreshInterval: 5000,
  theme: 'dark',
};
