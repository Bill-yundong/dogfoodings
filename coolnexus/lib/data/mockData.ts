import { DataCenterConfig, Rack, PrecisionAC, Server } from '../types/datacenter';

export const dataCenterConfig: DataCenterConfig = {
  id: 'dc-001',
  name: 'CoolNexus 数据中心 A',
  dimensions: { width: 40, height: 5, depth: 30 },
  rackRows: 4,
  rackCols: 8,
  racksPerRow: 8,
  ambientTemperature: 24,
  targetTemperature: 22
};

export function generateMockRacks(): Rack[] {
  const racks: Rack[] = [];
  const rackNames = ['A', 'B', 'C', 'D'];
  
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
      const rackId = `rack-${rackNames[row]}-${col + 1}`;
      const servers: Server[] = [];
      
      for (let u = 0; u < 10; u++) {
        const power = 200 + Math.random() * 500;
        const cpuUtil = 30 + Math.random() * 60;
        servers.push({
          id: `${rackId}-server-${u + 1}`,
          name: `${rackNames[row]}${col + 1}-U${u + 1}`,
          rackId,
          position: { row, col, u },
          powerConsumption: power,
          cpuUtilization: cpuUtil,
          inletTemperature: 22 + Math.random() * 3,
          outletTemperature: 32 + Math.random() * 8,
          status: cpuUtil > 85 ? 'critical' : cpuUtil > 70 ? 'warning' : 'running'
        });
      }

      const totalPower = servers.reduce((sum, s) => sum + s.powerConsumption, 0);
      
      racks.push({
        id: rackId,
        name: `${rackNames[row]}${col + 1}`,
        position: { row, col },
        servers,
        maxPower: 10000,
        currentPower: totalPower,
        inletTemperature: 22 + Math.random() * 2,
        outletTemperature: 35 + Math.random() * 5
      });
    }
  }
  
  return racks;
}

export function generateMockACs(): PrecisionAC[] {
  const acs: PrecisionAC[] = [];
  
  for (let i = 0; i < 6; i++) {
    acs.push({
      id: `ac-${i + 1}`,
      name: `精密空调 ${i + 1}`,
      position: { row: i < 3 ? 0 : 5, col: i % 3 * 3 },
      coolingCapacity: 80000,
      currentCooling: 45000 + Math.random() * 20000,
      supplyTemperature: 16 + Math.random() * 2,
      returnTemperature: 28 + Math.random() * 4,
      fanSpeed: 60 + Math.random() * 30,
      status: Math.random() > 0.95 ? 'fault' : 'running'
    });
  }
  
  return acs;
}

export function generateHeatLoadSnapshot(racks: Rack[]): {
  totalITPower: number;
  totalCoolingPower: number;
  pue: number;
} {
  const totalITPower = racks.reduce((sum, r) => sum + r.currentPower, 0);
  const totalCoolingPower = totalITPower * 0.4 + Math.random() * 5000;
  const pue = (totalITPower + totalCoolingPower) / totalITPower;
  
  return { totalITPower, totalCoolingPower, pue };
}
