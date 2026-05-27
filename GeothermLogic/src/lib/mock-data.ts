import { v4 as uuidv4 } from 'uuid';
import type { Borehole, TemperatureSnapshot, ThermalBalanceRecord } from '@/types';

export function generateBoreholes(count: number): Borehole[] {
  const boreholes: Borehole[] = [];
  const baseLat = 39.9042;
  const baseLng = 116.4074;

  for (let i = 0; i < count; i++) {
    const statuses: Borehole['status'][] = ['active', 'active', 'active', 'active', 'inactive', 'maintenance'];
    boreholes.push({
      id: uuidv4(),
      name: `BH-${String(i + 1).padStart(4, '0')}`,
      depth: 80 + Math.random() * 120,
      diameter: 0.15 + Math.random() * 0.1,
      location: {
        lat: baseLat + (Math.random() - 0.5) * 0.1,
        lng: baseLng + (Math.random() - 0.5) * 0.1,
      },
      status: statuses[Math.floor(Math.random() * statuses.length)],
      currentTemperature: 12 + Math.random() * 8,
      lastSyncTime: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    });
  }
  return boreholes;
}

export function generateTemperatureSnapshots(boreholeId: string, days: number): TemperatureSnapshot[] {
  const snapshots: TemperatureSnapshot[] = [];
  const now = Date.now();
  const baseTemp = 14 + Math.random() * 4;

  for (let i = 0; i < days; i++) {
    const timestamp = new Date(now - (days - i) * 86400000);
    const tempVariation = Math.sin(i / 7) * 2 + (Math.random() - 0.5) * 1;

    snapshots.push({
      id: uuidv4(),
      boreholeId,
      timestamp: timestamp.toISOString(),
      temperature: baseTemp + tempVariation,
      depth: 50 + Math.random() * 100,
    });
  }
  return snapshots;
}

export function generateThermalBalanceHistory(boreholeId: string, months: number): ThermalBalanceRecord[] {
  const records: ThermalBalanceRecord[] = [];
  const now = Date.now();

  for (let i = 0; i < months; i++) {
    const timestamp = new Date(now - (months - i) * 30 * 86400000);
    const balanceValue = 50 + Math.sin(i / 3) * 20 + (Math.random() - 0.5) * 10;

    records.push({
      id: uuidv4(),
      boreholeId,
      timestamp: timestamp.toISOString(),
      balanceValue: Math.max(0, Math.min(100, balanceValue)),
      efficiency: 60 + Math.random() * 30,
      groundTemp: 12 + Math.random() * 8,
    });
  }
  return records;
}

export function generateSystemStats() {
  return {
    totalBoreholes: 12580,
    activeBoreholes: 12456,
    avgGroundTemp: 15.8,
    thermalBalanceStatus: 'stable' as const,
    overdrawRisk: 'low' as const,
    lastUpdateTime: new Date().toISOString(),
  };
}

export function generateHealthStatus() {
  return [
    { module: '数据采集', status: 'healthy' as const, message: '运行正常', lastCheck: new Date().toISOString() },
    { module: '热平衡计算', status: 'healthy' as const, message: '运行正常', lastCheck: new Date().toISOString() },
    { module: '预测模型', status: 'warning' as const, message: '模型正在更新', lastCheck: new Date().toISOString() },
    { module: '数据同步', status: 'healthy' as const, message: '运行正常', lastCheck: new Date().toISOString() },
    { module: 'IndexedDB 缓存', status: 'healthy' as const, message: '已使用 2.3GB / 5GB', lastCheck: new Date().toISOString() },
  ];
}

export function generateSemanticMappings() {
  return [
    { id: uuidv4(), sourceField: 'heat_extraction_rate', targetField: 'thermal_output', transformation: 'value * 3.6', description: '热提取率转换为热能输出' },
    { id: uuidv4(), sourceField: 'ground_temperature', targetField: 'soil_temp', transformation: 'value', description: '地温数据映射' },
    { id: uuidv4(), sourceField: 'pump_efficiency', targetField: 'coefficient_of_performance', transformation: 'value / 100', description: '泵效率转换为COP' },
    { id: uuidv4(), sourceField: 'thermal_balance', targetField: 'energy_balance_ratio', transformation: 'value * 1.2', description: '热平衡系数转换' },
    { id: uuidv4(), sourceField: 'borehole_depth', targetField: 'installation_depth', transformation: 'value', description: '钻孔深度映射' },
  ];
}
