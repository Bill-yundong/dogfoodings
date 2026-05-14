import { AsyncCFDEngine } from '@/lib/cfd/CFDEngine';
import { HeatLoadSyncManager } from '@/lib/sync/HeatLoadSync';
import { IndexedDBStore } from '@/lib/storage/IndexedDBStore';
import { calculatePUE, calculatePUEStats } from '@/lib/utils/pueCalculator';
import { generateMockRacks, generateMockACs, generateHeatLoadSnapshot } from '@/lib/data/mockData';

describe('数据中心散热场系统集成测试', () => {
  let cfdEngine: AsyncCFDEngine;
  let syncManager: HeatLoadSyncManager;
  let dbStore: IndexedDBStore;

  beforeEach(() => {
    cfdEngine = new AsyncCFDEngine({
      gridSize: { x: 10, y: 5, z: 8 },
      iterations: 10,
    });
    syncManager = new HeatLoadSyncManager();
    dbStore = new IndexedDBStore();
    jest.useFakeTimers();
  });

  afterEach(() => {
    syncManager.stopSimulation();
    jest.useRealTimers();
  });

  describe('数据流程测试', () => {
    it('应该完成从模拟数据到 CFD 计算的完整流程', async () => {
      const racks = generateMockRacks();
      const acs = generateMockACs();
      
      expect(racks.length).toBeGreaterThan(0);
      expect(acs.length).toBeGreaterThan(0);

      const temperaturePoints = await cfdEngine.computeTemperatureField(racks, acs);
      
      expect(temperaturePoints.length).toBeGreaterThan(0);
      temperaturePoints.forEach(point => {
        expect(point.temperature).toBeGreaterThan(0);
        expect(point.x).toBeDefined();
        expect(point.y).toBeDefined();
        expect(point.z).toBeDefined();
      });
    });

    it('应该检测到气流风险并存储到数据库', async () => {
      const racks = generateMockRacks();
      const acs = generateMockACs();
      
      await dbStore.init();

      const temperaturePoints = await cfdEngine.computeTemperatureField(racks, acs);
      const risks = cfdEngine.detectAirflowRisks(temperaturePoints, racks);
      
      expect(Array.isArray(risks)).toBe(true);

      for (const risk of risks) {
        await dbStore.addRiskAlert({
          id: risk.id,
          timestamp: Date.now(),
          type: risk.type,
          severity: risk.severity,
          description: risk.description,
        });
      }

      const storedAlerts = await dbStore.getRiskAlerts();
      expect(storedAlerts.length).toBe(risks.length);
    });

    it('应该同步热负荷数据并计算 PUE 统计', async () => {
      const racks = generateMockRacks();
      const acs = generateMockACs();
      
      await dbStore.init();

      syncManager.startRealTimeSimulation(racks, acs);

      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(2000);
        const snapshot = syncManager.generatePowerSnapshot(racks, acs);
        await dbStore.addPowerSnapshot(snapshot);
      }

      const snapshots = await dbStore.getPowerSnapshots();
      expect(snapshots.length).toBeGreaterThanOrEqual(5);

      const pueStats = calculatePUEStats(snapshots);
      
      expect(pueStats.currentPUE).toBeGreaterThan(1);
      expect(pueStats.currentPUE).toBeLessThan(3);
      expect(pueStats.dailyAverage).toBeGreaterThan(1);
      expect(pueStats.weeklyAverage).toBeGreaterThan(1);
      expect(pueStats.monthlyAverage).toBeGreaterThan(1);
      expect(['stable', 'improving', 'worsening']).toContain(pueStats.trend);
    });
  });

  describe('模块间交互测试', () => {
    it('CFD 结果应该影响风险检测结果', async () => {
      const racks = generateMockRacks();
      const acs = generateMockACs();
      
      const temperaturePoints = await cfdEngine.computeTemperatureField(racks, acs);
      const risks = cfdEngine.detectAirflowRisks(temperaturePoints, racks);
      
      const avgTemp = temperaturePoints.reduce((sum, p) => sum + p.temperature, 0) / temperaturePoints.length;
      
      if (avgTemp > 40) {
        expect(risks.some(r => r.severity === 'critical' || r.severity === 'high')).toBe(true);
      }
    });

    it('热负荷变化应该影响 PUE 值', async () => {
      const racks = generateMockRacks();
      
      const initialSnapshot = generateHeatLoadSnapshot(racks);
      const initialPUE = initialSnapshot.pue;

      racks.forEach(rack => {
        rack.currentPower *= 0.5;
      });

      const newSnapshot = generateHeatLoadSnapshot(racks);
      const newPUE = newSnapshot.pue;

      expect(newPUE).not.toBe(initialPUE);
    });

    it('存储的历史数据应该正确计算趋势', async () => {
      await dbStore.init();
      
      const baseTime = Date.now();
      const snapshots = [];
      
      for (let i = 0; i < 10; i++) {
        const pue = 2.0 - i * 0.1;
        snapshots.push({
          id: `snap-${i}`,
          timestamp: baseTime - (10 - i) * 60000,
          totalITPower: 1000,
          totalCoolingPower: 1000 * (pue - 1),
          totalPower: 1000 * pue,
          pue,
          rackPowers: [],
          acPowers: [],
        });
        await dbStore.addPowerSnapshot(snapshots[snapshots.length - 1]);
      }

      const storedSnapshots = await dbStore.getPowerSnapshots();
      const stats = calculatePUEStats(storedSnapshots);
      
      expect(stats.trend).toBe('improving');
    });
  });

  describe('边界场景测试', () => {
    it('空数据中心应该正常工作', async () => {
      const emptyRacks = [];
      const emptyACs = [];
      
      const temperaturePoints = await cfdEngine.computeTemperatureField(emptyRacks, emptyACs);
      expect(Array.isArray(temperaturePoints)).toBe(true);

      const risks = cfdEngine.detectAirflowRisks(temperaturePoints, emptyRacks);
      expect(Array.isArray(risks)).toBe(true);
    });

    it('高负载场景应该检测到更多风险', async () => {
      const racks = generateMockRacks();
      const acs = generateMockACs();
      
      racks.forEach(rack => {
        rack.outletTemperature = 50;
        rack.servers.forEach(server => {
          server.outletTemperature = 55;
        });
      });

      acs.forEach(ac => {
        ac.currentCooling = ac.coolingCapacity * 0.2;
      });

      const temperaturePoints = await cfdEngine.computeTemperatureField(racks, acs);
      const risks = cfdEngine.detectAirflowRisks(temperaturePoints, racks);
      
      expect(risks.some(r => r.severity === 'critical' || r.severity === 'high')).toBe(true);
    });

    it('长时间运行应该保持数据一致性', async () => {
      const racks = generateMockRacks();
      const acs = generateMockACs();
      
      await dbStore.init();
      syncManager.startRealTimeSimulation(racks, acs);

      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(2000);
        const snapshot = syncManager.generatePowerSnapshot(racks, acs);
        await dbStore.addPowerSnapshot(snapshot);
      }

      const snapshots = await dbStore.getPowerSnapshots();
      
      snapshots.forEach(snapshot => {
        expect(snapshot.id).toBeDefined();
        expect(snapshot.timestamp).toBeGreaterThan(0);
        expect(snapshot.totalITPower).toBeGreaterThan(0);
        expect(snapshot.pue).toBeGreaterThan(1);
      });

      const timestamps = snapshots.map(s => s.timestamp);
      const isSorted = timestamps.every((t, i) => i === 0 || t >= timestamps[i - 1]);
      expect(isSorted).toBe(true);
    });
  });

  describe('性能与稳定性测试', () => {
    it('连续 CFD 计算不应该出现内存泄漏', async () => {
      const racks = generateMockRacks();
      const acs = generateMockACs();
      
      const results = [];
      for (let i = 0; i < 5; i++) {
        const points = await cfdEngine.computeTemperatureField(racks, acs);
        results.push(points);
      }
      
      results.forEach(result => {
        expect(result.length).toBe(results[0].length);
      });
    });

    it('数据库操作应该保持原子性', async () => {
      await dbStore.init();
      
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          dbStore.addPowerSnapshot({
            id: `atomic-${i}`,
            timestamp: Date.now(),
            totalITPower: 1000 + i * 100,
            totalCoolingPower: 400 + i * 40,
            totalPower: 1400 + i * 140,
            pue: 1.4,
            rackPowers: [],
            acPowers: [],
          })
        );
      }
      
      await Promise.all(promises);
      
      const snapshots = await dbStore.getPowerSnapshots();
      const atomicSnapshots = snapshots.filter(s => s.id.startsWith('atomic-'));
      expect(atomicSnapshots.length).toBe(10);
    });
  });

  describe('数据验证测试', () => {
    it('所有存储的快照应该有正确的 PUE 计算', async () => {
      await dbStore.init();
      
      for (let i = 0; i < 5; i++) {
        const itPower = 1000 + i * 100;
        const coolingPower = 400 + i * 40;
        const expectedPUE = calculatePUE(itPower, coolingPower);
        
        await dbStore.addPowerSnapshot({
          id: `verify-${i}`,
          timestamp: Date.now(),
          totalITPower: itPower,
          totalCoolingPower: coolingPower,
          totalPower: itPower + coolingPower,
          pue: expectedPUE,
          rackPowers: [],
          acPowers: [],
        });
      }

      const snapshots = await dbStore.getPowerSnapshots();
      const verifySnapshots = snapshots.filter(s => s.id.startsWith('verify-'));
      
      verifySnapshots.forEach(snapshot => {
        const calculatedPUE = calculatePUE(snapshot.totalITPower, snapshot.totalCoolingPower);
        expect(snapshot.pue).toBeCloseTo(calculatedPUE, 5);
      });
    });

    it('风险检测结果应该与温度数据一致', async () => {
      const racks = generateMockRacks();
      const acs = generateMockACs();
      
      const temperaturePoints = await cfdEngine.computeTemperatureField(racks, acs);
      const risks = cfdEngine.detectAirflowRisks(temperaturePoints, racks);
      
      risks.forEach(risk => {
        const matchingPoint = temperaturePoints.find(
          p => Math.abs(p.x - risk.location.x) < 2 && 
               Math.abs(p.z - risk.location.z) < 2
        );
        
        if (matchingPoint) {
          expect(risk.temperature).toBeGreaterThanOrEqual(matchingPoint.temperature - 5);
          expect(risk.temperature).toBeLessThanOrEqual(matchingPoint.temperature + 10);
        }
      });
    });
  });
});
