import type { RoadSegment, Building, Viewpoint } from '../types';

export const mockBuildings: Building[] = [
  {
    id: 'bldg-1',
    polygon: [
      { x: 100, y: 100 },
      { x: 180, y: 100 },
      { x: 180, y: 200 },
      { x: 100, y: 200 }
    ],
    height: 30,
    name: '商业中心 A'
  },
  {
    id: 'bldg-2',
    polygon: [
      { x: 250, y: 80 },
      { x: 350, y: 80 },
      { x: 350, y: 180 },
      { x: 250, y: 180 }
    ],
    height: 45,
    name: '办公楼 B'
  },
  {
    id: 'bldg-3',
    polygon: [
      { x: 420, y: 120 },
      { x: 520, y: 120 },
      { x: 520, y: 220 },
      { x: 420, y: 220 }
    ],
    height: 60,
    name: '住宅综合体 C'
  },
  {
    id: 'bldg-4',
    polygon: [
      { x: 80, y: 280 },
      { x: 160, y: 280 },
      { x: 160, y: 380 },
      { x: 80, y: 380 }
    ],
    height: 25,
    name: '学校 D'
  },
  {
    id: 'bldg-5',
    polygon: [
      { x: 280, y: 260 },
      { x: 380, y: 260 },
      { x: 380, y: 360 },
      { x: 280, y: 360 }
    ],
    height: 35,
    name: '医院 E'
  },
  {
    id: 'bldg-6',
    polygon: [
      { x: 450, y: 300 },
      { x: 550, y: 300 },
      { x: 550, y: 400 },
      { x: 450, y: 400 }
    ],
    height: 50,
    name: '购物中心 F'
  },
  {
    id: 'bldg-7',
    polygon: [
      { x: 150, y: 450 },
      { x: 230, y: 450 },
      { x: 230, y: 530 },
      { x: 150, y: 530 }
    ],
    height: 20,
    name: '公园管理处 G'
  },
  {
    id: 'bldg-8',
    polygon: [
      { x: 350, y: 470 },
      { x: 450, y: 470 },
      { x: 450, y: 550 },
      { x: 350, y: 550 }
    ],
    height: 40,
    name: '体育中心 H'
  }
];

export const mockRoadSegments: RoadSegment[] = [
  {
    id: 'road-1',
    points: [
      { x: 50, y: 240 },
      { x: 200, y: 240 },
      { x: 400, y: 240 },
      { x: 600, y: 240 }
    ],
    width: 30,
    type: 'primary',
    name: '城市主干道'
  },
  {
    id: 'road-2',
    points: [
      { x: 220, y: 50 },
      { x: 220, y: 200 },
      { x: 220, y: 400 },
      { x: 220, y: 580 }
    ],
    width: 25,
    type: 'secondary',
    name: '商业街'
  },
  {
    id: 'road-3',
    points: [
      { x: 400, y: 50 },
      { x: 400, y: 200 },
      { x: 400, y: 400 },
      { x: 400, y: 580 }
    ],
    width: 25,
    type: 'secondary',
    name: '科技路'
  },
  {
    id: 'road-4',
    points: [
      { x: 50, y: 420 },
      { x: 150, y: 420 },
      { x: 300, y: 420 },
      { x: 500, y: 420 }
    ],
    width: 20,
    type: 'tertiary',
    name: '文化路'
  },
  {
    id: 'road-5',
    points: [
      { x: 300, y: 300 },
      { x: 350, y: 320 },
      { x: 380, y: 310 },
      { x: 420, y: 340 }
    ],
    width: 8,
    type: 'pedestrian',
    name: '步行广场'
  },
  {
    id: 'road-6',
    points: [
      { x: 100, y: 100 },
      { x: 180, y: 100 }
    ],
    width: 10,
    type: 'tertiary',
    name: '商业支路'
  },
  {
    id: 'road-7',
    points: [
      { x: 500, y: 240 },
      { x: 580, y: 300 },
      { x: 600, y: 380 }
    ],
    width: 15,
    type: 'tertiary',
    name: '林荫道'
  }
];

export const mockViewpoints: Viewpoint[] = [
  {
    id: 'vp-1',
    position: { x: 300, y: 240 },
    height: 1.7,
    fieldOfView: 120,
    maxDistance: 150,
    direction: 0
  },
  {
    id: 'vp-2',
    position: { x: 220, y: 240 },
    height: 1.7,
    fieldOfView: 90,
    maxDistance: 120,
    direction: 90
  },
  {
    id: 'vp-3',
    position: { x: 400, y: 240 },
    height: 1.7,
    fieldOfView: 90,
    maxDistance: 120,
    direction: 270
  },
  {
    id: 'vp-4',
    position: { x: 300, y: 420 },
    height: 1.7,
    fieldOfView: 120,
    maxDistance: 100,
    direction: 180
  }
];
