import type { Cargo } from '@/types';
import { generateId } from '@/utils/calculations';

export function generateMockCargos(count: number = 50): Cargo[] {
  const cargoTypes = [
    { name: '电子产品箱', weightRange: [200, 500], dimsRange: [[120, 100, 80], [80, 60, 60]], dangerous: false },
    { name: '服装货盘', weightRange: [300, 600], dimsRange: [[120, 100, 120], [100, 80, 100]], dangerous: false },
    { name: '机械设备', weightRange: [800, 1500], dimsRange: [[150, 120, 100], [120, 100, 80]], dangerous: false },
    { name: '化工原料桶', weightRange: [400, 800], dimsRange: [[80, 80, 100], [60, 60, 80]], dangerous: true },
    { name: '生鲜冷链', weightRange: [300, 700], dimsRange: [[120, 100, 120], [100, 80, 100]], dangerous: false },
    { name: '航空邮件', weightRange: [100, 300], dimsRange: [[100, 80, 60], [80, 60, 40]], dangerous: false },
    { name: '医疗物资', weightRange: [150, 400], dimsRange: [[100, 80, 80], [80, 60, 60]], dangerous: false },
    { name: '汽车零部件', weightRange: [500, 1200], dimsRange: [[150, 120, 80], [120, 100, 60]], dangerous: false },
    { name: '危险品-锂电池', weightRange: [200, 400], dimsRange: [[120, 80, 60], [80, 60, 40]], dangerous: true },
    { name: '精密仪器', weightRange: [300, 800], dimsRange: [[120, 100, 100], [100, 80, 80]], dangerous: false }
  ];

  const cargos: Cargo[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const type = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];
    const weight = Math.round(type.weightRange[0] + Math.random() * (type.weightRange[1] - type.weightRange[0]));
    const dimsSet = type.dimsRange[Math.floor(Math.random() * type.dimsRange.length)];
    const variance = 0.9 + Math.random() * 0.2;

    cargos.push({
      id: generateId(),
      name: `${type.name}-${String(i + 1).padStart(3, '0')}`,
      weight,
      dimensions: {
        length: Math.round(dimsSet[0] * variance),
        width: Math.round(dimsSet[1] * variance),
        height: Math.round(dimsSet[2] * variance)
      },
      priority: Math.floor(Math.random() * 10) + 1,
      isDangerous: type.dangerous,
      constraints: Math.random() > 0.7 ? {
        preferredZone: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
        maxStacking: Math.floor(Math.random() * 3) + 1
      } : undefined,
      createdAt: now - Math.floor(Math.random() * 86400000)
    });
  }

  return cargos.sort((a, b) => b.priority - a.priority || b.weight - a.weight);
}

export const MOCK_CARGOS: Cargo[] = [
  {
    id: generateId(),
    name: '电子产品箱-A001',
    weight: 350,
    dimensions: { length: 120, width: 100, height: 80 },
    priority: 8,
    isDangerous: false,
    createdAt: Date.now() - 3600000
  },
  {
    id: generateId(),
    name: '服装货盘-B002',
    weight: 480,
    dimensions: { length: 120, width: 100, height: 120 },
    priority: 6,
    isDangerous: false,
    createdAt: Date.now() - 7200000
  },
  {
    id: generateId(),
    name: '机械设备-C003',
    weight: 1200,
    dimensions: { length: 150, width: 120, height: 100 },
    priority: 9,
    isDangerous: false,
    createdAt: Date.now() - 10800000
  },
  {
    id: generateId(),
    name: '化工原料-D004',
    weight: 650,
    dimensions: { length: 80, width: 80, height: 100 },
    priority: 7,
    isDangerous: true,
    constraints: { forbiddenZones: ['A'], maxStacking: 1 },
    createdAt: Date.now() - 14400000
  },
  {
    id: generateId(),
    name: '生鲜冷链-E005',
    weight: 520,
    dimensions: { length: 120, width: 100, height: 120 },
    priority: 10,
    isDangerous: false,
    constraints: { preferredZone: 'B' },
    createdAt: Date.now() - 18000000
  },
  {
    id: generateId(),
    name: '航空邮件-F006',
    weight: 180,
    dimensions: { length: 100, width: 80, height: 60 },
    priority: 5,
    isDangerous: false,
    createdAt: Date.now() - 21600000
  },
  {
    id: generateId(),
    name: '医疗物资-G007',
    weight: 280,
    dimensions: { length: 100, width: 80, height: 80 },
    priority: 10,
    isDangerous: false,
    createdAt: Date.now() - 25200000
  },
  {
    id: generateId(),
    name: '汽车零部件-H008',
    weight: 950,
    dimensions: { length: 150, width: 120, height: 80 },
    priority: 6,
    isDangerous: false,
    createdAt: Date.now() - 28800000
  },
  {
    id: generateId(),
    name: '锂电池-I009',
    weight: 320,
    dimensions: { length: 120, width: 80, height: 60 },
    priority: 8,
    isDangerous: true,
    constraints: { forbiddenZones: ['C'], maxStacking: 1 },
    createdAt: Date.now() - 32400000
  },
  {
    id: generateId(),
    name: '精密仪器-J010',
    weight: 580,
    dimensions: { length: 120, width: 100, height: 100 },
    priority: 9,
    isDangerous: false,
    constraints: { preferredZone: 'A', maxStacking: 1 },
    createdAt: Date.now() - 36000000
  }
];
