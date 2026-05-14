import { IndexedDBStore } from '@/lib/storage/IndexedDBStore';

describe('IndexedDBStore', () => {
  let store: IndexedDBStore;

  beforeEach(() => {
    store = new IndexedDBStore();
  });

  describe('初始化测试', () => {
    it('应该正确创建存储实例', () => {
      expect(store).toBeDefined();
    });

    it('应该能够初始化数据库连接', async () => {
      await expect(store.init()).resolves.not.toThrow();
    });

    it('多次初始化应该安全', async () => {
      await store.init();
      await store.init();
      await store.init();
    });
  });

  describe('功耗快照存储测试', () => {
    const mockSnapshot = {
      id: 'snapshot-001',
      timestamp: Date.now(),
      totalITPower: 5000,
      totalCoolingPower: 2000,
      totalPower: 7000,
      pue: 1.4,
      rackPowers: [{ rackId: 'rack-1', power: 2500 }],
      acPowers: [{ acId: 'ac-1', power: 2000 }],
    };

    it('应该能够添加功耗快照', async () => {
      await store.init();
      await expect(store.addPowerSnapshot(mockSnapshot)).resolves.not.toThrow();
    });

    it('应该能够获取所有功耗快照', async () => {
      await store.init();
      await store.addPowerSnapshot(mockSnapshot);
      await store.addPowerSnapshot({ ...mockSnapshot, id: 'snapshot-002' });
      
      const snapshots = await store.getPowerSnapshots();
      expect(Array.isArray(snapshots)).toBe(true);
      expect(snapshots.length).toBeGreaterThan(0);
    });

    it('获取的快照应该包含正确的字段', async () => {
      await store.init();
      await store.addPowerSnapshot(mockSnapshot);
      
      const snapshots = await store.getPowerSnapshots();
      const snapshot = snapshots[0];
      
      expect(snapshot).toHaveProperty('id');
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('totalITPower');
      expect(snapshot).toHaveProperty('totalCoolingPower');
      expect(snapshot).toHaveProperty('totalPower');
      expect(snapshot).toHaveProperty('pue');
      expect(snapshot).toHaveProperty('rackPowers');
      expect(snapshot).toHaveProperty('acPowers');
    });

    it('应该能够按时间范围查询快照', async () => {
      await store.init();
      const now = Date.now();
      
      await store.addPowerSnapshot({ ...mockSnapshot, id: 'old', timestamp: now - 10000 });
      await store.addPowerSnapshot({ ...mockSnapshot, id: 'new', timestamp: now });
      
      const results = await store.getPowerSnapshotsByTimeRange(now - 5000, now + 1000);
      expect(results.some(r => r.id === 'new')).toBe(true);
    });

    it('应该限制返回的快照数量', async () => {
      await store.init();
      
      for (let i = 0; i < 20; i++) {
        await store.addPowerSnapshot({ ...mockSnapshot, id: `snapshot-${i}` });
      }
      
      const snapshots = await store.getPowerSnapshots(10);
      expect(snapshots.length).toBeLessThanOrEqual(10);
    });
  });

  describe('热负荷历史存储测试', () => {
    const mockHeatRecord = {
      id: 'heat-001',
      timestamp: Date.now(),
      totalHeatLoad: 15000,
      maxTemperature: 38.5,
    };

    it('应该能够添加热负荷记录', async () => {
      await store.init();
      await expect(store.addHeatLoadRecord(mockHeatRecord)).resolves.not.toThrow();
    });

    it('应该能够获取热负荷历史', async () => {
      await store.init();
      await store.addHeatLoadRecord(mockHeatRecord);
      
      const history = await store.getHeatLoadHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('热负荷记录应该按时间排序', async () => {
      await store.init();
      
      await store.addHeatLoadRecord({ ...mockHeatRecord, id: 'heat-1', timestamp: 1000 });
      await store.addHeatLoadRecord({ ...mockHeatRecord, id: 'heat-2', timestamp: 2000 });
      await store.addHeatLoadRecord({ ...mockHeatRecord, id: 'heat-3', timestamp: 3000 });
      
      const history = await store.getHeatLoadHistory();
      expect(history[0].timestamp).toBeLessThanOrEqual(history[history.length - 1].timestamp);
    });
  });

  describe('风险告警存储测试', () => {
    const mockAlert = {
      id: 'alert-001',
      timestamp: Date.now(),
      type: 'hot_spot',
      severity: 'high',
      description: '检测到局部热点',
    };

    it('应该能够添加风险告警', async () => {
      await store.init();
      await expect(store.addRiskAlert(mockAlert)).resolves.not.toThrow();
    });

    it('应该能够获取风险告警列表', async () => {
      await store.init();
      await store.addRiskAlert(mockAlert);
      
      const alerts = await store.getRiskAlerts();
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('告警应该包含正确的字段', async () => {
      await store.init();
      await store.addRiskAlert(mockAlert);
      
      const alerts = await store.getRiskAlerts();
      const alert = alerts[0];
      
      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('timestamp');
      expect(alert).toHaveProperty('type');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('description');
    });

    it('应该能够限制告警数量', async () => {
      await store.init();
      
      for (let i = 0; i < 30; i++) {
        await store.addRiskAlert({ ...mockAlert, id: `alert-${i}` });
      }
      
      const alerts = await store.getRiskAlerts(15);
      expect(alerts.length).toBeLessThanOrEqual(15);
    });
  });

  describe('数据清理测试', () => {
    it('应该能够清除所有数据', async () => {
      await store.init();
      
      await store.addPowerSnapshot({
        id: 'test',
        timestamp: Date.now(),
        totalITPower: 1000,
        totalCoolingPower: 500,
        totalPower: 1500,
        pue: 1.5,
        rackPowers: [],
        acPowers: [],
      });
      
      await store.clearAll();
      const snapshots = await store.getPowerSnapshots();
      expect(snapshots.length).toBe(0);
    });
  });

  describe('数据完整性测试', () => {
    it('存储的数据应该与读取的数据一致', async () => {
      await store.init();
      
      const testData = {
        id: 'integrity-test',
        timestamp: 1234567890,
        totalITPower: 5500,
        totalCoolingPower: 2200,
        totalPower: 7700,
        pue: 1.4,
        rackPowers: [{ rackId: 'rack-a', power: 2750 }],
        acPowers: [{ acId: 'ac-b', power: 2200 }],
      };
      
      await store.addPowerSnapshot(testData);
      const snapshots = await store.getPowerSnapshots();
      const retrieved = snapshots.find(s => s.id === 'integrity-test');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.totalITPower).toBe(testData.totalITPower);
      expect(retrieved?.pue).toBe(testData.pue);
    });

    it('时间戳应该被正确保存', async () => {
      await store.init();
      
      const timestamp = Date.now();
      await store.addPowerSnapshot({
        id: 'timestamp-test',
        timestamp,
        totalITPower: 1000,
        totalCoolingPower: 400,
        totalPower: 1400,
        pue: 1.4,
        rackPowers: [],
        acPowers: [],
      });
      
      const snapshots = await store.getPowerSnapshots();
      const retrieved = snapshots.find(s => s.id === 'timestamp-test');
      
      expect(retrieved?.timestamp).toBe(timestamp);
    });
  });

  describe('并发操作测试', () => {
    it('应该能够处理并发写入操作', async () => {
      await store.init();
      
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          store.addPowerSnapshot({
            id: `concurrent-${i}`,
            timestamp: Date.now() + i,
            totalITPower: 1000 + i * 100,
            totalCoolingPower: 400 + i * 40,
            totalPower: 1400 + i * 140,
            pue: 1.4,
            rackPowers: [],
            acPowers: [],
          })
        );
      }
      
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });
});
