import type { WasteData, RoadNetworkLoad, CarbonFootprintLog } from '../types';
import { generateId } from '../utils/hash';

const LOCATIONS = [
  '朝阳区-国贸商圈',
  '海淀区-中关村科技园区',
  '西城区-金融街',
  '东城区-王府井商圈',
  '丰台区-丽泽商务区',
  '通州区-城市副中心',
  '大兴区-亦庄经济开发区',
  '昌平区-未来科学城',
];

const ROAD_IDS = [
  'road-001',
  'road-002',
  'road-003',
  'road-004',
  'road-005',
];

const WASTE_TYPES = ['organic', 'recyclable', 'hazardous', 'residual'] as const;

export function generateMockWasteData(count: number = 50): WasteData[] {
  const data: WasteData[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const hoursAgo = Math.floor(Math.random() * 72);
    data.push({
      id: generateId(),
      timestamp: now - hoursAgo * 60 * 60 * 1000,
      source: Math.random() > 0.5 ? 'sanitation' : 'recycling',
      location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
      wasteType: WASTE_TYPES[Math.floor(Math.random() * WASTE_TYPES.length)],
      weight: Math.floor(Math.random() * 5000) + 100,
      volume: Math.floor(Math.random() * 2000) + 50,
      qualityScore: Math.floor(Math.random() * 40) + 60,
      metadata: {
        collectionPoint: `CP-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
        vehicleId: `VEH-${String(Math.floor(Math.random() * 50)).padStart(3, '0')}`,
      },
    });
  }

  return data.sort((a, b) => b.timestamp - a.timestamp);
}

export function generateMockRoadLoads(roadId: string, count: number = 100): RoadNetworkLoad[] {
  const loads: RoadNetworkLoad[] = [];
  const now = Date.now();

  for (let i = count; i > 0; i--) {
    const minutesAgo = i * 15;
    const hour = new Date(now - minutesAgo * 60 * 1000).getHours();
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const baseLoad = isPeak ? 0.7 + Math.random() * 0.25 : 0.2 + Math.random() * 0.4;
    const noise = (Math.random() - 0.5) * 0.1;
    const currentLoad = Math.max(0, Math.min(1, baseLoad + noise));

    loads.push({
      id: generateId(),
      roadId,
      timestamp: now - minutesAgo * 60 * 1000,
      currentLoad,
      maxCapacity: 1,
      flowRate: currentLoad > 0.8 ? 0.2 + Math.random() * 0.3 : 0.6 + Math.random() * 0.4,
      congestionLevel: currentLoad >= 0.9 ? 'critical' : currentLoad >= 0.7 ? 'high' : currentLoad >= 0.4 ? 'medium' : 'low',
    });
  }

  return loads;
}

export function generateMockCarbonLogs(count: number = 100): CarbonFootprintLog[] {
  const logs: CarbonFootprintLog[] = [];
  const now = Date.now();
  const actionTypes: CarbonFootprintLog['actionType'][] = ['collection', 'transport', 'processing', 'recycling', 'disposal'];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    const wasteType = WASTE_TYPES[Math.floor(Math.random() * WASTE_TYPES.length)];
    const weight = Math.floor(Math.random() * 1000) + 100;
    const distance = actionType === 'transport' ? Math.floor(Math.random() * 50) + 5 : undefined;

    let co2Emitted = 0;
    let co2Saved = 0;

    if (actionType === 'transport' && distance) {
      co2Emitted = 0.25 * distance;
    } else if (actionType === 'recycling') {
      co2Emitted = 0.02 * weight;
      const recyclingRate = wasteType === 'recyclable' ? 0.95 : wasteType === 'organic' ? 0.3 : 0.1;
      co2Saved = 2.5 * weight * recyclingRate;
    } else if (actionType === 'processing') {
      co2Emitted = 0.1 * weight;
    } else {
      co2Emitted = (actionType === 'disposal' ? 0.5 : 0.05) * weight;
    }

    logs.push({
      id: generateId(),
      timestamp: now - daysAgo * 24 * 60 * 60 * 1000,
      actionType,
      wasteType,
      weight,
      distance,
      co2Emitted,
      co2Saved,
      netReduction: co2Saved - co2Emitted,
      metadata: {
        source: 'mock_data',
        batch: i,
      },
    });
  }

  return logs.sort((a, b) => b.timestamp - a.timestamp);
}

export function initializeMockData(): {
  wasteData: WasteData[];
  roadLoads: Map<string, RoadNetworkLoad[]>;
  carbonLogs: CarbonFootprintLog[];
} {
  const wasteData = generateMockWasteData(50);
  const roadLoads = new Map<string, RoadNetworkLoad[]>();

  for (const roadId of ROAD_IDS) {
    roadLoads.set(roadId, generateMockRoadLoads(roadId, 100));
  }

  const carbonLogs = generateMockCarbonLogs(100);

  return {
    wasteData,
    roadLoads,
    carbonLogs,
  };
}

export const MOCK_ROADS = [
  { id: 'road-001', name: '三环路（东段）', description: '国贸-三元桥' },
  { id: 'road-002', name: '四环路（北段）', description: '中关村-亚运村' },
  { id: 'road-003', name: '二环线（西段）', description: '西直门-复兴门' },
  { id: 'road-004', name: '长安街（东段）', description: '建国门-王府井' },
  { id: 'road-005', name: '快速路（南段）', description: '丽泽-亦庄' },
];
