import type { Region, SolarPanel, Building } from '@/types/solar';

export function generateMockRegion(): Region {
  return {
    id: 'region-shanghai',
    name: '上海浦东光伏电站',
    latCenter: 31.2304,
    lngCenter: 121.4737,
    radius: 500,
  };
}

export function generateMockPanels(regionId: string, count: number = 100): SolarPanel[] {
  const panels: SolarPanel[] = [];
  const gridSize = Math.ceil(Math.sqrt(count));
  const spacing = 10;
  const startX = -(gridSize * spacing) / 2;
  const startZ = -(gridSize * spacing) / 2;
  
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    
    const statusRoll = Math.random();
    let status: SolarPanel['status'] = 'normal';
    if (statusRoll > 0.95) status = 'fault';
    else if (statusRoll > 0.85) status = 'degraded';
    
    panels.push({
      id: `panel-${i.toString().padStart(4, '0')}`,
      regionId,
      position: {
        x: startX + col * spacing + (Math.random() - 0.5) * 2,
        y: 0,
        z: startZ + row * spacing + (Math.random() - 0.5) * 2,
      },
      rotation: { x: 0, y: 0, z: 0 },
      efficiency: 0.22 + Math.random() * 0.03,
      area: 1.6,
      status,
      temperature: 25 + Math.random() * 10,
      ratedPower: 400 + Math.random() * 50,
    });
  }
  
  return panels;
}

export function generateMockBuildings(regionId: string, count: number = 5): Building[] {
  const buildings: Building[] = [];
  const types: Building['type'][] = ['residential', 'commercial', 'industrial'];
  
  for (let i = 0; i < count; i++) {
    const centerX = (Math.random() - 0.5) * 80;
    const centerZ = (Math.random() - 0.5) * 80;
    const width = 8 + Math.random() * 15;
    const depth = 8 + Math.random() * 15;
    
    buildings.push({
      id: `building-${i.toString().padStart(2, '0')}`,
      regionId,
      vertices: [
        { x: centerX - width / 2, y: 0, z: centerZ - depth / 2 },
        { x: centerX + width / 2, y: 0, z: centerZ - depth / 2 },
        { x: centerX + width / 2, y: 0, z: centerZ + depth / 2 },
        { x: centerX - width / 2, y: 0, z: centerZ + depth / 2 },
      ],
      height: 10 + Math.random() * 30,
      type: types[Math.floor(Math.random() * types.length)],
    });
  }
  
  return buildings;
}

export function generateAllMockData() {
  const region = generateMockRegion();
  const panels = generateMockPanels(region.id, 64);
  const buildings = generateMockBuildings(region.id, 6);
  
  return { regions: [region], panels, buildings };
}
