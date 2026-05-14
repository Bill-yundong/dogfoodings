import { HeatLoadSyncManager } from '@/lib/sync/HeatLoadSync';
import { Rack, PrecisionAC } from '@/lib/types/datacenter';

describe('HeatLoadSyncManager', () => {
  let syncManager: HeatLoadSyncManager;
  let mockRacks: Rack[];
  let mockACs: PrecisionAC[];

  beforeEach(() => {
    jest.useFakeTimers();
    syncManager = new HeatLoadSyncManager();
    
    mockRacks = [
      {
        id: 'rack-a1',
        name: 'A1',
        position: { row: 0, col: 0 },
        servers: [
          {
            id: 'server-1',
            name: 'Server 1',
            rackId: 'rack-a1',
            position: { row: 0, col: 0, u: 0 },
            powerConsumption: 300,
            cpuUtilization: 50,
            inletTemperature: 22,
            outletTemperature: 32,
            status: 'running' as const,
          },
        ],
        maxPower: 10000,
        currentPower: 300,
        inletTemperature: 22,
        outletTemperature: 32,
      },
    ];

    mockACs = [
      {
        id: 'ac-1',
        name: '精密空调 1',
        position: { row: 0, col: 2 },
        coolingCapacity: 80000,
        currentCooling: 40000,
        supplyTemperature: 16,
        returnTemperature: 28,
        fanSpeed: 70,
        status: 'running' as const,
      },
    ];
  });

  afterEach(() => {
    syncManager.stopSimulation();
    syncManager.disconnect();
    jest.useRealTimers();
  });

  describe('初始化与连接测试', () => {
    it('应该正确初始化同步管理器', () => {
      expect(syncManager).toBeDefined();
    });

    it('初始化时应该自动连接', () => {
      expect(syncManager.isSyncConnected()).toBe(true);
    });

    it('应该能够断开连接', () => {
      syncManager.disconnect();
      expect(syncManager.isSyncConnected()).toBe(false);
    });

    it('应该能够重新连接', () => {
      syncManager.disconnect();
      expect(syncManager.isSyncConnected()).toBe(false);
      syncManager.connect();
      expect(syncManager.isSyncConnected()).toBe(true);
    });
  });

  describe('事件监听测试', () => {
    it('应该能够注册事件监听器', () => {
      const callback = jest.fn();
      syncManager.on('heat_load_update', callback);
      expect(callback).not.toHaveBeenCalled();
    });

    it('应该能够触发事件', (done) => {
      syncManager.on('test_event', (data) => {
        expect(data).toEqual({ test: 'data' });
        done();
      });
      
      (syncManager as any).emit('test_event', { test: 'data' });
    });

    it('应该能够移除事件监听器', () => {
      const callback = jest.fn();
      syncManager.on('heat_load_update', callback);
      syncManager.off('heat_load_update', callback);
      
      (syncManager as any).emit('heat_load_update', {});
      expect(callback).not.toHaveBeenCalled();
    });

    it('多个监听器应该都能收到事件', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      syncManager.on('heat_load_update', callback1);
      syncManager.on('heat_load_update', callback2);
      
      (syncManager as any).emit('heat_load_update', {});
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('实时模拟测试', () => {
    it('应该能够启动实时模拟', () => {
      const callback = jest.fn();
      syncManager.on('heat_load_update', callback);
      
      syncManager.startRealTimeSimulation(mockRacks, mockACs);
      
      jest.advanceTimersByTime(2000);
      
      expect(callback).toHaveBeenCalled();
    });

    it('应该按照指定间隔更新数据', () => {
      const callback = jest.fn();
      syncManager.on('heat_load_update', callback);
      
      syncManager.startRealTimeSimulation(mockRacks, mockACs);
      
      jest.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(2);
      
      jest.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('热负荷更新应该包含正确的字段', () => {
      let receivedData: any = null;
      syncManager.on('heat_load_update', (data) => {
        receivedData = data;
      });
      
      syncManager.startRealTimeSimulation(mockRacks, mockACs);
      jest.advanceTimersByTime(2000);
      
      expect(receivedData).toHaveProperty('timestamp');
      expect(receivedData).toHaveProperty('racks');
      expect(receivedData).toHaveProperty('totalHeatLoad');
      expect(receivedData).toHaveProperty('maxTemperature');
      expect(receivedData).toHaveProperty('minTemperature');
    });

    it('应该能够停止实时模拟', () => {
      const callback = jest.fn();
      syncManager.on('heat_load_update', callback);
      
      syncManager.startRealTimeSimulation(mockRacks, mockACs);
      jest.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(1);
      
      syncManager.stopSimulation();
      jest.advanceTimersByTime(4000);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('服务器参数应该随时间变化', () => {
      const initialPower = mockRacks[0].currentPower;
      
      syncManager.startRealTimeSimulation(mockRacks, mockACs);
      jest.advanceTimersByTime(2000);
      
      const newPower = mockRacks[0].currentPower;
      expect(newPower).not.toBe(initialPower);
    });

    it('CPU利用率应该在合理范围内变化', () => {
      syncManager.startRealTimeSimulation(mockRacks, mockACs);
      
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(2000);
        const cpuUtil = mockRacks[0].servers[0].cpuUtilization;
        expect(cpuUtil).toBeGreaterThanOrEqual(10);
        expect(cpuUtil).toBeLessThanOrEqual(95);
      }
    });
  });

  describe('功耗快照生成测试', () => {
    it('应该能够生成功耗快照', () => {
      const snapshot = syncManager.generatePowerSnapshot(mockRacks, mockACs);
      
      expect(snapshot).toHaveProperty('id');
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('totalITPower');
      expect(snapshot).toHaveProperty('totalCoolingPower');
      expect(snapshot).toHaveProperty('totalPower');
      expect(snapshot).toHaveProperty('pue');
      expect(snapshot).toHaveProperty('rackPowers');
      expect(snapshot).toHaveProperty('acPowers');
    });

    it('快照ID应该是唯一的', () => {
      const snapshot1 = syncManager.generatePowerSnapshot(mockRacks, mockACs);
      const snapshot2 = syncManager.generatePowerSnapshot(mockRacks, mockACs);
      
      expect(snapshot1.id).not.toBe(snapshot2.id);
    });

    it('PUE值计算应该正确', () => {
      const snapshot = syncManager.generatePowerSnapshot(mockRacks, mockACs);
      
      expect(snapshot.pue).toBeGreaterThan(1);
      expect(snapshot.pue).toBeLessThan(3);
      expect(snapshot.totalPower).toBe(snapshot.totalITPower + snapshot.totalCoolingPower);
    });

    it('rackPowers应该包含所有机柜', () => {
      const snapshot = syncManager.generatePowerSnapshot(mockRacks, mockACs);
      
      expect(snapshot.rackPowers.length).toBe(mockRacks.length);
      snapshot.rackPowers.forEach(rp => {
        expect(mockRacks.some(r => r.id === rp.rackId)).toBe(true);
      });
    });

    it('acPowers应该包含所有空调', () => {
      const snapshot = syncManager.generatePowerSnapshot(mockRacks, mockACs);
      
      expect(snapshot.acPowers.length).toBe(mockACs.length);
      snapshot.acPowers.forEach(ap => {
        expect(mockACs.some(a => a.id === ap.acId)).toBe(true);
      });
    });
  });

  describe('空调控制命令测试', () => {
    it('应该能够发送空调控制命令', (done) => {
      syncManager.on('ac_control', (data: any) => {
        expect(data).toHaveProperty('acId');
        expect(data).toHaveProperty('command');
        expect(data).toHaveProperty('timestamp');
        done();
      });
      
      syncManager.sendACControlCommand('ac-1', { setPoint: 18, fanSpeed: 80 });
    });

    it('断开连接时不应该发送命令', () => {
      const callback = jest.fn();
      syncManager.on('ac_control', callback);
      
      syncManager.disconnect();
      syncManager.sendACControlCommand('ac-1', { setPoint: 18 });
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('命令应该包含所有请求参数', (done) => {
      syncManager.on('ac_control', (data: any) => {
        expect(data.acId).toBe('ac-1');
        expect(data.command.setPoint).toBe(18);
        expect(data.command.fanSpeed).toBe(80);
        done();
      });
      
      syncManager.sendACControlCommand('ac-1', { setPoint: 18, fanSpeed: 80 });
    });
  });

  describe('热负荷分布测试', () => {
    it('应该能够获取最后一次热负荷分布', () => {
      expect(syncManager.getLastDistribution()).toBeNull();
      
      syncManager.startRealTimeSimulation(mockRacks, mockACs);
      jest.advanceTimersByTime(2000);
      
      const distribution = syncManager.getLastDistribution();
      expect(distribution).not.toBeNull();
      expect(distribution).toHaveProperty('totalHeatLoad');
    });

    it('总热负荷应该等于各机柜热负荷之和', () => {
      syncManager.startRealTimeSimulation(mockRacks, mockACs);
      jest.advanceTimersByTime(2000);
      
      const distribution = syncManager.getLastDistribution();
      const sumOfRackLoads = distribution!.racks.reduce((sum, r) => sum + r.heatLoad, 0);
      
      expect(Math.abs(distribution!.totalHeatLoad - sumOfRackLoads)).toBeLessThan(1);
    });
  });

  describe('边界条件测试', () => {
    it('空机架列表应该生成有效快照', () => {
      const snapshot = syncManager.generatePowerSnapshot([], mockACs);
      expect(snapshot.totalITPower).toBe(0);
      expect(snapshot.pue).toBeGreaterThan(1);
    });

    it('空空调列表应该生成有效快照', () => {
      const snapshot = syncManager.generatePowerSnapshot(mockRacks, []);
      expect(snapshot.totalCoolingPower).toBe(0);
      expect(snapshot.pue).toBe(1);
    });

    it('多次启动模拟应该不会重复触发', () => {
      const callback = jest.fn();
      syncManager.on('heat_load_update', callback);
      
      syncManager.startRealTimeSimulation(mockRacks, mockACs);
      syncManager.startRealTimeSimulation(mockRacks, mockACs);
      syncManager.startRealTimeSimulation(mockRacks, mockACs);
      
      jest.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
