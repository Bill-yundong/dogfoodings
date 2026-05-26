import type { AircraftSpec } from '@/types';

export const DEFAULT_AIRCRAFT: AircraftSpec = {
  type: 'B777F',
  model: 'Boeing 777 Freighter',
  maxTakeoffWeight: 347450,
  maxLandingWeight: 260816,
  operatingEmptyWeight: 144000,
  maxFuelCapacity: 145520,
  cargoHoldDimensions: {
    length: 3556,
    width: 587,
    height: 302
  },
  mac: {
    length: 831,
    leadingEdge: 1530
  },
  cargoZones: [
    {
      id: 'zone-a',
      name: '前货舱',
      code: 'A',
      boundaries: { minX: 0, maxX: 1200, minY: -293, maxY: 293, minZ: 0, maxZ: 302 },
      maxWeightPerSqm: 976,
      maxStackHeight: 290
    },
    {
      id: 'zone-b',
      name: '中货舱',
      code: 'B',
      boundaries: { minX: 1200, maxX: 2400, minY: -293, maxY: 293, minZ: 0, maxZ: 302 },
      maxWeightPerSqm: 976,
      maxStackHeight: 290
    },
    {
      id: 'zone-c',
      name: '后货舱',
      code: 'C',
      boundaries: { minX: 2400, maxX: 3556, minY: -293, maxY: 293, minZ: 0, maxZ: 302 },
      maxWeightPerSqm: 732,
      maxStackHeight: 290
    }
  ],
  cgLimits: {
    forward: 14,
    aft: 46,
    lateral: 50
  },
  floorLoadLimit: 976
};

export const AIRCRAFT_FLEET: AircraftSpec[] = [
  DEFAULT_AIRCRAFT,
  {
    type: 'B747-8F',
    model: 'Boeing 747-8 Freighter',
    maxTakeoffWeight: 447700,
    maxLandingWeight: 312070,
    operatingEmptyWeight: 197000,
    maxFuelCapacity: 226130,
    cargoHoldDimensions: {
      length: 6120,
      width: 640,
      height: 305
    },
    mac: {
      length: 944,
      leadingEdge: 2640
    },
    cargoZones: [
      { id: 'zone-a', name: '前货舱', code: 'A', boundaries: { minX: 0, maxX: 1800, minY: -320, maxY: 320, minZ: 0, maxZ: 305 }, maxWeightPerSqm: 1152, maxStackHeight: 290 },
      { id: 'zone-b', name: '中货舱', code: 'B', boundaries: { minX: 1800, maxX: 3800, minY: -320, maxY: 320, minZ: 0, maxZ: 305 }, maxWeightPerSqm: 1152, maxStackHeight: 290 },
      { id: 'zone-c', name: '后货舱', code: 'C', boundaries: { minX: 3800, maxX: 6120, minY: -320, maxY: 320, minZ: 0, maxZ: 305 }, maxWeightPerSqm: 732, maxStackHeight: 290 }
    ],
    cgLimits: { forward: 12, aft: 42, lateral: 50 },
    floorLoadLimit: 1152
  },
  {
    type: 'A330-200F',
    model: 'Airbus A330-200 Freighter',
    maxTakeoffWeight: 233000,
    maxLandingWeight: 182000,
    operatingEmptyWeight: 109000,
    maxFuelCapacity: 109000,
    cargoHoldDimensions: {
      length: 3800,
      width: 520,
      height: 250
    },
    mac: {
      length: 744,
      leadingEdge: 1620
    },
    cargoZones: [
      { id: 'zone-a', name: '前货舱', code: 'A', boundaries: { minX: 0, maxX: 1500, minY: -260, maxY: 260, minZ: 0, maxZ: 250 }, maxWeightPerSqm: 850, maxStackHeight: 240 },
      { id: 'zone-b', name: '后货舱', code: 'B', boundaries: { minX: 1500, maxX: 3800, minY: -260, maxY: 260, minZ: 0, maxZ: 250 }, maxWeightPerSqm: 680, maxStackHeight: 240 }
    ],
    cgLimits: { forward: 16, aft: 48, lateral: 45 },
    floorLoadLimit: 850
  }
];
