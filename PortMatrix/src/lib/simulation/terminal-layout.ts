import type { TerminalLayout, Zone, Facility, Obstacle, Vector2D } from '@/types';
import { V } from '@/lib/math/vector2d';

const W = 120;
const H = 80;

function createRectPolygon(x: number, y: number, w: number, h: number): Vector2D[] {
  return [
    V.create(x, y),
    V.create(x + w, y),
    V.create(x + w, y + h),
    V.create(x, y + h),
  ];
}

export const createDefaultTerminalLayout = (): TerminalLayout => {
  const zones: Zone[] = [
    {
      id: 'zone_entrance',
      name: '入口大厅',
      type: 'entrance',
      polygon: createRectPolygon(5, 5, 30, 70),
      color: 'rgba(0, 212, 255, 0.15)',
      capacity: 500,
      currentCount: 0,
    },
    {
      id: 'zone_checkin',
      name: '值机区',
      type: 'checkin',
      polygon: createRectPolygon(35, 5, 25, 70),
      color: 'rgba(124, 77, 255, 0.15)',
      capacity: 300,
      currentCount: 0,
    },
    {
      id: 'zone_security',
      name: '安检区',
      type: 'security',
      polygon: createRectPolygon(60, 25, 15, 30),
      color: 'rgba(255, 179, 0, 0.15)',
      capacity: 200,
      currentCount: 0,
    },
    {
      id: 'zone_corridor_north',
      name: '北走廊',
      type: 'corridor',
      polygon: createRectPolygon(75, 5, 40, 15),
      color: 'rgba(0, 230, 118, 0.1)',
      capacity: 200,
      currentCount: 0,
    },
    {
      id: 'zone_corridor_south',
      name: '南走廊',
      type: 'corridor',
      polygon: createRectPolygon(75, 60, 40, 15),
      color: 'rgba(0, 230, 118, 0.1)',
      capacity: 200,
      currentCount: 0,
    },
    {
      id: 'zone_retail',
      name: '免税商业区',
      type: 'retail',
      polygon: createRectPolygon(75, 20, 40, 40),
      color: 'rgba(255, 64, 129, 0.15)',
      capacity: 400,
      currentCount: 0,
    },
    {
      id: 'zone_gate_north',
      name: '北登机口',
      type: 'gate',
      polygon: createRectPolygon(105, 5, 10, 15),
      color: 'rgba(0, 229, 255, 0.15)',
      capacity: 150,
      currentCount: 0,
    },
    {
      id: 'zone_gate_south',
      name: '南登机口',
      type: 'gate',
      polygon: createRectPolygon(105, 60, 10, 15),
      color: 'rgba(0, 229, 255, 0.15)',
      capacity: 150,
      currentCount: 0,
    },
  ];

  const obstacles: Obstacle[] = [
    {
      id: 'obs_pillar_1',
      polygon: createRectPolygon(50, 30, 3, 3),
    },
    {
      id: 'obs_pillar_2',
      polygon: createRectPolygon(50, 45, 3, 3),
    },
    {
      id: 'obs_pillar_3',
      polygon: createRectPolygon(85, 35, 3, 3),
    },
    {
      id: 'obs_pillar_4',
      polygon: createRectPolygon(85, 45, 3, 3),
    },
    {
      id: 'obs_wall_1',
      polygon: createRectPolygon(75, 20, 1, 5),
    },
    {
      id: 'obs_wall_2',
      polygon: createRectPolygon(75, 55, 1, 5),
    },
  ];

  const facilities: Facility[] = [
    ...createCheckinCounters(),
    ...createSecurityChannels(),
    ...createShops(),
    ...createGates(),
  ];

  const entrances: Vector2D[] = [
    V.create(10, 10),
    V.create(10, 40),
    V.create(10, 70),
  ];

  const exits: Vector2D[] = [
    V.create(115, 12),
    V.create(115, 68),
  ];

  return {
    width: W,
    height: H,
    scale: 8,
    zones,
    obstacles,
    facilities,
    entrances,
    exits,
  };
};

function createCheckinCounters(): Facility[] {
  const counters: Facility[] = [];
  const yStart = 10;
  const ySpacing = 7;

  for (let i = 0; i < 8; i++) {
    counters.push({
      id: `checkin_${i}`,
      zoneId: 'zone_checkin',
      type: 'checkin_counter',
      position: V.create(45, yStart + i * ySpacing),
      capacity: 1,
      serviceRate: 0.5,
      status: i < 6 ? 'open' : 'closed',
      queueId: i < 3 ? 'queue_checkin_a' : i < 6 ? 'queue_checkin_b' : null,
      attractiveness: 0,
      name: `值机柜台 ${i + 1}`,
    });
  }

  return counters;
}

function createSecurityChannels(): Facility[] {
  const channels: Facility[] = [];
  const yStart = 28;
  const ySpacing = 7;

  for (let i = 0; i < 4; i++) {
    channels.push({
      id: `security_${i}`,
      zoneId: 'zone_security',
      type: 'security_channel',
      position: V.create(67, yStart + i * ySpacing),
      capacity: 1,
      serviceRate: 0.8,
      status: i < 3 ? 'open' : 'closed',
      queueId: i < 2 ? 'queue_security_a' : i < 3 ? 'queue_security_b' : null,
      attractiveness: 0,
      name: `安检通道 ${i + 1}`,
    });
  }

  return channels;
}

function createShops(): Facility[] {
  return [
    {
      id: 'shop_luxury_1',
      zoneId: 'zone_retail',
      type: 'shop',
      position: V.create(82, 28),
      capacity: 10,
      serviceRate: 0.3,
      status: 'open',
      queueId: null,
      attractiveness: 0.8,
      name: '奢侈品店 A',
    },
    {
      id: 'shop_luxury_2',
      zoneId: 'zone_retail',
      type: 'shop',
      position: V.create(82, 48),
      capacity: 10,
      serviceRate: 0.3,
      status: 'open',
      queueId: null,
      attractiveness: 0.7,
      name: '奢侈品店 B',
    },
    {
      id: 'shop_dutyfree_1',
      zoneId: 'zone_retail',
      type: 'shop',
      position: V.create(95, 30),
      capacity: 20,
      serviceRate: 0.5,
      status: 'open',
      queueId: null,
      attractiveness: 0.9,
      name: '免税烟酒',
    },
    {
      id: 'shop_dutyfree_2',
      zoneId: 'zone_retail',
      type: 'shop',
      position: V.create(95, 45),
      capacity: 15,
      serviceRate: 0.4,
      status: 'open',
      queueId: null,
      attractiveness: 0.85,
      name: '免税化妆品',
    },
    {
      id: 'shop_food_1',
      zoneId: 'zone_retail',
      type: 'shop',
      position: V.create(88, 38),
      capacity: 25,
      serviceRate: 0.6,
      status: 'open',
      queueId: null,
      attractiveness: 0.75,
      name: '美食广场',
    },
    {
      id: 'shop_books',
      zoneId: 'zone_retail',
      type: 'shop',
      position: V.create(105, 40),
      capacity: 8,
      serviceRate: 0.2,
      status: 'open',
      queueId: null,
      attractiveness: 0.4,
      name: '书店',
    },
  ];
}

function createGates(): Facility[] {
  return [
    {
      id: 'gate_n1',
      zoneId: 'zone_gate_north',
      type: 'gate',
      position: V.create(108, 10),
      capacity: 150,
      serviceRate: 1.0,
      status: 'open',
      queueId: null,
      attractiveness: 1.0,
      name: '登机口 N1',
    },
    {
      id: 'gate_n2',
      zoneId: 'zone_gate_north',
      type: 'gate',
      position: V.create(108, 18),
      capacity: 150,
      serviceRate: 1.0,
      status: 'open',
      queueId: null,
      attractiveness: 1.0,
      name: '登机口 N2',
    },
    {
      id: 'gate_s1',
      zoneId: 'zone_gate_south',
      type: 'gate',
      position: V.create(108, 62),
      capacity: 150,
      serviceRate: 1.0,
      status: 'open',
      queueId: null,
      attractiveness: 1.0,
      name: '登机口 S1',
    },
    {
      id: 'gate_s2',
      zoneId: 'zone_gate_south',
      type: 'gate',
      position: V.create(108, 70),
      capacity: 150,
      serviceRate: 1.0,
      status: 'open',
      queueId: null,
      attractiveness: 1.0,
      name: '登机口 S2',
    },
  ];
}

export const getFacilityById = (
  layout: TerminalLayout,
  id: string
): Facility | undefined => {
  return layout.facilities.find(f => f.id === id);
};

export const getZoneById = (
  layout: TerminalLayout,
  id: string
): Zone | undefined => {
  return layout.zones.find(z => z.id === id);
};

export const getShops = (layout: TerminalLayout): Facility[] => {
  return layout.facilities.filter(f => f.type === 'shop' && f.status === 'open');
};

export const getGates = (layout: TerminalLayout): Facility[] => {
  return layout.facilities.filter(f => f.type === 'gate' && f.status === 'open');
};

export const getCheckinCounters = (layout: TerminalLayout): Facility[] => {
  return layout.facilities.filter(f => f.type === 'checkin_counter' && f.status === 'open');
};

export const getSecurityChannels = (layout: TerminalLayout): Facility[] => {
  return layout.facilities.filter(f => f.type === 'security_channel' && f.status === 'open');
};

export const getRandomEntrance = (layout: TerminalLayout): Vector2D => {
  return layout.entrances[Math.floor(Math.random() * layout.entrances.length)];
};

export const getNearestFacility = (
  position: Vector2D,
  facilities: Facility[]
): Facility | null => {
  if (facilities.length === 0) return null;

  let nearest = facilities[0];
  let minDist = Infinity;

  for (const f of facilities) {
    const dist = V.distanceSquared(position, f.position);
    if (dist < minDist) {
      minDist = dist;
      nearest = f;
    }
  }

  return nearest;
};
