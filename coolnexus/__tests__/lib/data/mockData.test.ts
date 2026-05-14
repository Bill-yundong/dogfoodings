import { generateMockRacks, generateMockACs, generateHeatLoadSnapshot } from '@/lib/data/mockData';

describe('Mock Data 生成器', () => {
  describe('generateMockRacks 测试', () => {
    it('应该生成机柜数组', () => {
      const racks = generateMockRacks();
      expect(Array.isArray(racks)).toBe(true);
      expect(racks.length).toBeGreaterThan(0);
    });

    it('每个机柜应该包含正确的字段', () => {
      const racks = generateMockRacks();
      const rack = racks[0];
      
      expect(rack).toHaveProperty('id');
      expect(rack).toHaveProperty('name');
      expect(rack).toHaveProperty('position');
      expect(rack).toHaveProperty('servers');
      expect(rack).toHaveProperty('maxPower');
      expect(rack).toHaveProperty('currentPower');
      expect(rack).toHaveProperty('inletTemperature');
      expect(rack).toHaveProperty('outletTemperature');
    });

    it('机柜应该包含服务器', () => {
      const racks = generateMockRacks();
      const rack = racks[0];
      
      expect(Array.isArray(rack.servers)).toBe(true);
      expect(rack.servers.length).toBeGreaterThan(0);
    });

    it('每个服务器应该包含正确的字段', () => {
      const racks = generateMockRacks();
      const server = racks[0].servers[0];
      
      expect(server).toHaveProperty('id');
      expect(server).toHaveProperty('name');
      expect(server).toHaveProperty('rackId');
      expect(server).toHaveProperty('position');
      expect(server).toHaveProperty('powerConsumption');
      expect(server).toHaveProperty('cpuUtilization');
      expect(server).toHaveProperty('inletTemperature');
      expect(server).toHaveProperty('outletTemperature');
      expect(server).toHaveProperty('status');
    });

    it('机柜位置应该正确分布', () => {
      const racks = generateMockRacks();
      
      racks.forEach(rack => {
        expect(rack.position.row).toBeGreaterThanOrEqual(0);
        expect(rack.position.col).toBeGreaterThanOrEqual(0);
      });
    });

    it('服务器状态应该是有效值', () => {
      const racks = generateMockRacks();
      const validStatuses = ['running', 'idle', 'warning', 'critical'];
      
      racks.forEach(rack => {
        rack.servers.forEach(server => {
          expect(validStatuses).toContain(server.status);
        });
      });
    });

    it('功率值应该在合理范围内', () => {
      const racks = generateMockRacks();
      
      racks.forEach(rack => {
        expect(rack.currentPower).toBeGreaterThan(0);
        expect(rack.currentPower).toBeLessThanOrEqual(rack.maxPower);
      });
    });

    it('温度值应该在合理范围内', () => {
      const racks = generateMockRacks();
      
      racks.forEach(rack => {
        expect(rack.inletTemperature).toBeGreaterThan(15);
        expect(rack.inletTemperature).toBeLessThan(30);
        expect(rack.outletTemperature).toBeGreaterThan(25);
        expect(rack.outletTemperature).toBeLessThan(50);
      });
    });

    it('服务器 CPU 利用率应该在合理范围内', () => {
      const racks = generateMockRacks();
      
      racks.forEach(rack => {
        rack.servers.forEach(server => {
          expect(server.cpuUtilization).toBeGreaterThanOrEqual(0);
          expect(server.cpuUtilization).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('generateMockACs 测试', () => {
    it('应该生成空调数组', () => {
      const acs = generateMockACs();
      expect(Array.isArray(acs)).toBe(true);
      expect(acs.length).toBeGreaterThan(0);
    });

    it('每个空调应该包含正确的字段', () => {
      const acs = generateMockACs();
      const ac = acs[0];
      
      expect(ac).toHaveProperty('id');
      expect(ac).toHaveProperty('name');
      expect(ac).toHaveProperty('position');
      expect(ac).toHaveProperty('coolingCapacity');
      expect(ac).toHaveProperty('currentCooling');
      expect(ac).toHaveProperty('supplyTemperature');
      expect(ac).toHaveProperty('returnTemperature');
      expect(ac).toHaveProperty('fanSpeed');
      expect(ac).toHaveProperty('status');
    });

    it('空调状态应该是有效值', () => {
      const acs = generateMockACs();
      const validStatuses = ['running', 'standby', 'fault'];
      
      acs.forEach(ac => {
        expect(validStatuses).toContain(ac.status);
      });
    });

    it('制冷功率应该在合理范围内', () => {
      const acs = generateMockACs();
      
      acs.forEach(ac => {
        expect(ac.currentCooling).toBeGreaterThan(0);
        expect(ac.currentCooling).toBeLessThanOrEqual(ac.coolingCapacity);
      });
    });

    it('送风温度应该低于回风温度', () => {
      const acs = generateMockACs();
      
      acs.forEach(ac => {
        expect(ac.supplyTemperature).toBeLessThan(ac.returnTemperature);
      });
    });

    it('风扇转速应该在合理范围内', () => {
      const acs = generateMockACs();
      
      acs.forEach(ac => {
        expect(ac.fanSpeed).toBeGreaterThanOrEqual(0);
        expect(ac.fanSpeed).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('generateHeatLoadSnapshot 测试', () => {
    let mockRacks: ReturnType<typeof generateMockRacks>;

    beforeEach(() => {
      mockRacks = generateMockRacks();
    });

    it('应该生成热负荷快照对象', () => {
      const snapshot = generateHeatLoadSnapshot(mockRacks);
      
      expect(snapshot).toHaveProperty('totalITPower');
      expect(snapshot).toHaveProperty('totalCoolingPower');
      expect(snapshot).toHaveProperty('pue');
    });

    it('IT 功率应该是所有机柜功率之和', () => {
      const expectedTotal = mockRacks.reduce((sum, r) => sum + r.currentPower, 0);
      const snapshot = generateHeatLoadSnapshot(mockRacks);
      
      expect(snapshot.totalITPower).toBe(expectedTotal);
    });

    it('制冷功率应该是正值', () => {
      const snapshot = generateHeatLoadSnapshot(mockRacks);
      expect(snapshot.totalCoolingPower).toBeGreaterThan(0);
    });

    it('PUE 值应该大于 1', () => {
      const snapshot = generateHeatLoadSnapshot(mockRacks);
      expect(snapshot.pue).toBeGreaterThan(1);
    });

    it('PUE 值应该在合理范围内', () => {
      const snapshot = generateHeatLoadSnapshot(mockRacks);
      expect(snapshot.pue).toBeGreaterThan(1);
      expect(snapshot.pue).toBeLessThan(3);
    });

    it('空机柜列表应该生成有效快照', () => {
      const snapshot = generateHeatLoadSnapshot([]);
      
      expect(snapshot.totalITPower).toBe(0);
      expect(snapshot.totalCoolingPower).toBeGreaterThanOrEqual(0);
      expect(snapshot.pue).toBeGreaterThanOrEqual(1);
    });
  });

  describe('数据一致性测试', () => {
    it('多次调用应该生成不同的数据', () => {
      const racks1 = generateMockRacks();
      const racks2 = generateMockRacks();
      
      expect(racks1[0].currentPower).not.toBe(racks2[0].currentPower);
    });

    it('机柜 ID 应该是唯一的', () => {
      const racks = generateMockRacks();
      const ids = racks.map(r => r.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('服务器 ID 应该是唯一的', () => {
      const racks = generateMockRacks();
      const allServerIds = racks.flatMap(r => r.servers.map(s => s.id));
      const uniqueIds = new Set(allServerIds);
      
      expect(uniqueIds.size).toBe(allServerIds.length);
    });

    it('空调 ID 应该是唯一的', () => {
      const acs = generateMockACs();
      const ids = acs.map(a => a.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
