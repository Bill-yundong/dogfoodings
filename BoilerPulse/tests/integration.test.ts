import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { syncEngine, generateUUID } from '../src/lib/services/sync';
import { mpcController, DEFAULT_MPC_CONFIG } from '../src/lib/services/mpc';
import { anomalyDetector, DEFAULT_THRESHOLDS } from '../src/lib/services/detector';
import { dataSimulator } from '../src/lib/services/mock';
import { getDB, clearDB, closeDB } from '../src/lib/db';
import { saveSnapshot, getRecentSnapshots, deleteSnapshot, getSnapshotCount } from '../src/lib/db/snapshot';
import type { OxygenData, EfficiencyData, FanControl, WaveformSnapshot } from '../src/lib/types';

describe('语义同步引擎测试', () => {
  beforeEach(() => {
    syncEngine.reset();
  });

  it('UUID 生成器应生成唯一标识符', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    expect(uuid1).not.toBe(uuid2);
    expect(uuid1.length).toBeGreaterThan(0);
  });

  it('应正确处理 DCS 氧含量数据', () => {
    const data: OxygenData = {
      id: generateUUID(),
      value: 3.5,
      timestamp: Date.now(),
      source: 'DCS',
      quality: 'good',
      semanticTag: 'combustion.oxygen'
    };
    const result = syncEngine.processOxygenData(data);
    expect(result.semanticTag).toBe('boiler.oxygen.level');
    expect(result.uuid).toBeDefined();
    expect(result.provenance.source).toBe('DCS');
  });

  it('应正确处理 FSSS 氧含量数据', () => {
    const data: OxygenData = {
      id: generateUUID(),
      value: 3.6,
      timestamp: Date.now(),
      source: 'FSSS',
      quality: 'good',
      semanticTag: 'combustion.oxygen'
    };
    const result = syncEngine.processOxygenData(data);
    expect(result.provenance.source).toBe('FSSS');
    expect(result.uuid).toBeDefined();
  });

  it('应记录所有同步状态', () => {
    const data: OxygenData = {
      id: generateUUID(),
      value: 3.5,
      timestamp: Date.now(),
      source: 'DCS',
      quality: 'good',
      semanticTag: 'combustion.oxygen'
    };
    syncEngine.processOxygenData(data);
    const status = syncEngine.getAllSyncStatus();
    expect(status.length).toBeGreaterThan(0);
    expect(status.some(s => s.source === 'DCS')).toBe(true);
  });

  it('数据质量差的应保留原始质量信息', () => {
    const data: OxygenData = {
      id: generateUUID(),
      value: 3.5,
      timestamp: Date.now(),
      source: 'DCS',
      quality: 'bad',
      semanticTag: 'combustion.oxygen'
    };
    const result = syncEngine.processOxygenData(data);
    expect(result.value).toBe(3.5);
    expect(result.provenance.source).toBe('DCS');
  });
});

describe('MPC 模型预测控制测试', () => {
  beforeEach(() => {
    mpcController.reset();
  });

  it('应使用默认配置初始化', () => {
    const config = mpcController.getConfig();
    expect(config.predictionHorizon).toBe(DEFAULT_MPC_CONFIG.predictionHorizon);
    expect(config.controlHorizon).toBe(DEFAULT_MPC_CONFIG.controlHorizon);
  });

  it('应更新配置', () => {
    mpcController.updateConfig({ predictionHorizon: 60 });
    const config = mpcController.getConfig();
    expect(config.predictionHorizon).toBe(60);
  });

  it('应添加历史数据', () => {
    const oxygen: OxygenData = {
      id: generateUUID(),
      value: 3.5,
      timestamp: Date.now(),
      source: 'DCS',
      quality: 'good',
      semanticTag: 'combustion.oxygen'
    };
    const efficiency: EfficiencyData = {
      id: generateUUID(),
      value: 90.5,
      timestamp: Date.now(),
      coalConsumption: 50,
      steamOutput: 100,
      airFlow: 200
    };
    const fan: FanControl = {
      id: generateUUID(),
      forcedDraftSpeed: 75,
      inducedDraftSpeed: 72,
      damperOpening: 65,
      oxygenSetpoint: 3.5,
      timestamp: Date.now()
    };
    mpcController.addHistoricalData(oxygen, efficiency, fan);
    expect(mpcController.getDataCount()).toBe(1);
  });

  it('应生成预测结果', () => {
    for (let i = 0; i < 10; i++) {
      const oxygen: OxygenData = {
        id: generateUUID(),
        value: 3.5 + Math.random() * 0.5,
        timestamp: Date.now() + i * 1000,
        source: 'DCS',
        quality: 'good',
        semanticTag: 'combustion.oxygen'
      };
      const efficiency: EfficiencyData = {
        id: generateUUID(),
        value: 90.5 + Math.random() * 2,
        timestamp: Date.now() + i * 1000,
        coalConsumption: 50,
        steamOutput: 100,
        airFlow: 200
      };
      const fan: FanControl = {
        id: generateUUID(),
        forcedDraftSpeed: 75,
        inducedDraftSpeed: 72,
        damperOpening: 65,
        oxygenSetpoint: 3.5,
        timestamp: Date.now() + i * 1000
      };
      mpcController.addHistoricalData(oxygen, efficiency, fan);
    }

    const prediction = mpcController.predict({
      id: generateUUID(),
      forcedDraftSpeed: 75,
      inducedDraftSpeed: 72,
      damperOpening: 65,
      oxygenSetpoint: 3.5,
      timestamp: Date.now()
    });

    expect(prediction).toBeDefined();
    expect(prediction.predictedEfficiency.length).toBeGreaterThan(0);
    expect(prediction.predictedEfficiency[0]).toBeGreaterThan(0);
    expect(prediction.predictedOxygen.length).toBeGreaterThan(0);
    expect(prediction.predictedOxygen[0]).toBeGreaterThan(0);
    expect(prediction.optimizedParams).toBeDefined();
  });

  it('优化参数应在约束范围内', () => {
    for (let i = 0; i < 15; i++) {
      const oxygen: OxygenData = {
        id: generateUUID(),
        value: 3.5 + Math.random() * 0.5,
        timestamp: Date.now() + i * 1000,
        source: 'DCS',
        quality: 'good',
        semanticTag: 'combustion.oxygen'
      };
      const efficiency: EfficiencyData = {
        id: generateUUID(),
        value: 90.5 + Math.random() * 2,
        timestamp: Date.now() + i * 1000,
        coalConsumption: 50,
        steamOutput: 100,
        airFlow: 200
      };
      const fan: FanControl = {
        id: generateUUID(),
        forcedDraftSpeed: 75,
        inducedDraftSpeed: 72,
        damperOpening: 65,
        oxygenSetpoint: 3.5,
        timestamp: Date.now() + i * 1000
      };
      mpcController.addHistoricalData(oxygen, efficiency, fan);
    }

    const prediction = mpcController.predict({
      id: generateUUID(),
      forcedDraftSpeed: 75,
      inducedDraftSpeed: 72,
      damperOpening: 65,
      oxygenSetpoint: 3.5,
      timestamp: Date.now()
    });

    const config = mpcController.getConfig();
    expect(prediction.optimizedParams.forcedDraftSpeed).toBeGreaterThanOrEqual(config.constraints.forcedDraftMin);
    expect(prediction.optimizedParams.forcedDraftSpeed).toBeLessThanOrEqual(config.constraints.forcedDraftMax);
  });
});

describe('异常检测引擎测试', () => {
  beforeEach(() => {
    anomalyDetector.reset();
  });

  it('应使用默认阈值初始化', () => {
    expect(anomalyDetector.getThresholds().oxygenMin).toBe(DEFAULT_THRESHOLDS.oxygenMin);
  });

  it('应更新阈值', () => {
    anomalyDetector.updateThresholds({ oxygenMin: 2.0 });
    expect(anomalyDetector.getThresholds().oxygenMin).toBe(2.0);
  });

  it('应检测氧含量过低', () => {
    const data: OxygenData = {
      id: generateUUID(),
      value: 1.0,
      timestamp: Date.now(),
      source: 'DCS',
      quality: 'good',
      semanticTag: 'combustion.oxygen'
    };
    const anomaly = anomalyDetector.processOxygenData(data);
    expect(anomaly).not.toBeNull();
    expect(anomaly?.type).toBe('oxygen_low');
    expect(anomaly?.severity).toBe('error');
  });

  it('应检测氧含量过高', () => {
    const data: OxygenData = {
      id: generateUUID(),
      value: 8.0,
      timestamp: Date.now(),
      source: 'DCS',
      quality: 'good',
      semanticTag: 'combustion.oxygen'
    };
    const anomaly = anomalyDetector.processOxygenData(data);
    expect(anomaly).not.toBeNull();
    expect(anomaly?.type).toBe('oxygen_high');
    expect(anomaly?.severity).toBe('warning');
  });

  it('正常值不应触发异常', () => {
    const data: OxygenData = {
      id: generateUUID(),
      value: 3.5,
      timestamp: Date.now(),
      source: 'DCS',
      quality: 'good',
      semanticTag: 'combustion.oxygen'
    };
    const anomaly = anomalyDetector.processOxygenData(data);
    expect(anomaly).toBeNull();
  });

  it('应检测氧含量快速变化', () => {
    for (let i = 0; i < 5; i++) {
      anomalyDetector.processOxygenData({
        id: generateUUID(),
        value: 3.5,
        timestamp: Date.now() + i * 1000,
        source: 'DCS',
        quality: 'good',
        semanticTag: 'combustion.oxygen'
      });
    }
    const data: OxygenData = {
      id: generateUUID(),
      value: 3.5 + 2.0,
      timestamp: Date.now() + 5000,
      source: 'DCS',
      quality: 'good',
      semanticTag: 'combustion.oxygen'
    };
    const anomaly = anomalyDetector.processOxygenData(data);
    expect(anomaly).not.toBeNull();
    expect(anomaly?.type).toBe('oxygen_rapid_change');
  });

  it('应检测效率过低', () => {
    const data: EfficiencyData = {
      id: generateUUID(),
      value: 80,
      timestamp: Date.now(),
      coalConsumption: 50,
      steamOutput: 100,
      airFlow: 200
    };
    const anomaly = anomalyDetector.processEfficiencyData(data);
    expect(anomaly).not.toBeNull();
    expect(anomaly?.type).toBe('efficiency_low');
  });

  it('应检测风机转速偏差', () => {
    const data: FanControl = {
      id: generateUUID(),
      forcedDraftSpeed: 80,
      inducedDraftSpeed: 60,
      damperOpening: 65,
      oxygenSetpoint: 3.5,
      timestamp: Date.now()
    };
    const anomaly = anomalyDetector.processFanControl(data);
    expect(anomaly).not.toBeNull();
    expect(anomaly?.type).toBe('fan_mismatch');
  });

  it('应创建波形快照', () => {
    const oxygenData: OxygenData[] = Array.from({ length: 10 }, (_, i) => ({
      id: generateUUID(),
      value: 3.5 + Math.random() * 0.5,
      timestamp: Date.now() + i * 1000,
      source: 'DCS',
      quality: 'good' as const,
      semanticTag: 'combustion.oxygen'
    }));
    const efficiencyData: EfficiencyData[] = Array.from({ length: 10 }, (_, i) => ({
      id: generateUUID(),
      value: 90.5 + Math.random() * 2,
      timestamp: Date.now() + i * 1000,
      coalConsumption: 50,
      steamOutput: 100,
      airFlow: 200
    }));
    const fanData: FanControl[] = Array.from({ length: 10 }, (_, i) => ({
      id: generateUUID(),
      forcedDraftSpeed: 75,
      inducedDraftSpeed: 72,
      damperOpening: 65,
      oxygenSetpoint: 3.5,
      timestamp: Date.now() + i * 1000
    }));

    const snapshot = anomalyDetector.createSnapshot(
      Date.now(),
      Date.now() + 10000,
      'oxygen_high',
      oxygenData,
      efficiencyData,
      fanData
    );

    expect(snapshot).toBeDefined();
    expect(snapshot.channels.length).toBe(4);
    expect(snapshot.triggerType).toBe('oxygen_high');
  });

  it('应通知异常监听器', () => {
    let receivedAnomaly = null;
    anomalyDetector.addAnomalyListener((event) => {
      receivedAnomaly = event;
    });

    const data: OxygenData = {
      id: generateUUID(),
      value: 1.0,
      timestamp: Date.now(),
      source: 'DCS',
      quality: 'good',
      semanticTag: 'combustion.oxygen'
    };
    anomalyDetector.processOxygenData(data);

    expect(receivedAnomaly).not.toBeNull();
    expect(receivedAnomaly?.type).toBe('oxygen_low');
  });
});

describe('IndexedDB 数据存储测试', () => {
  beforeEach(async () => {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        await clearDB();
      } catch (e) {
        console.log('IndexedDB not available, skipping test setup');
      }
    }
  });

  afterEach(async () => {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        await closeDB();
      } catch (e) {
        console.log('IndexedDB not available, skipping test teardown');
      }
    }
  });

  const isIndexedDBAvailable = () => {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  };

  it('应成功打开数据库连接', async () => {
    if (!isIndexedDBAvailable()) {
      console.log('Skipping IndexedDB test: not available in this environment');
      return;
    }
    const db = await getDB();
    expect(db).toBeDefined();
    expect(db.name).toBe('BoilerPulseDB');
  });

  it('应保存和检索波形快照', async () => {
    if (!isIndexedDBAvailable()) {
      console.log('Skipping IndexedDB test: not available in this environment');
      return;
    }
    const snapshot: WaveformSnapshot = {
      id: generateUUID(),
      startTime: Date.now() - 10000,
      endTime: Date.now(),
      triggerType: 'oxygen_high',
      triggerValue: 7.5,
      threshold: 7.0,
      channels: [
        {
          name: 'oxygen',
          label: '氧含量',
          unit: '%',
          data: Array.from({ length: 30 }, (_, i) => ({ x: i, y: 3.5 + Math.random() * 4 })),
          timestamps: Array.from({ length: 30 }, (_, i) => Date.now() - 10000 + i * 1000)
        }
      ],
      tags: [],
      notes: '',
      createdAt: Date.now()
    };

    const id = await saveSnapshot(snapshot);
    expect(id).toBeDefined();

    const snapshots = await getRecentSnapshots(10);
    expect(snapshots.length).toBe(1);
    expect(snapshots[0].triggerType).toBe('oxygen_high');
  });

  it('应删除波形快照', async () => {
    if (!isIndexedDBAvailable()) {
      console.log('Skipping IndexedDB test: not available in this environment');
      return;
    }
    const snapshot: WaveformSnapshot = {
      id: generateUUID(),
      startTime: Date.now() - 10000,
      endTime: Date.now(),
      triggerType: 'oxygen_low',
      triggerValue: 1.0,
      threshold: 1.5,
      channels: [],
      tags: [],
      notes: '',
      createdAt: Date.now()
    };

    const id = await saveSnapshot(snapshot);
    expect(await getSnapshotCount()).toBe(1);

    await deleteSnapshot(id);
    expect(await getSnapshotCount()).toBe(0);
  });

  it('应清空所有数据', async () => {
    if (!isIndexedDBAvailable()) {
      console.log('Skipping IndexedDB test: not available in this environment');
      return;
    }
    for (let i = 0; i < 5; i++) {
      const snapshot: WaveformSnapshot = {
        id: generateUUID(),
        startTime: Date.now() - 10000 * (i + 1),
        endTime: Date.now() - 10000 * i,
        triggerType: 'oxygen_high',
        triggerValue: 7.5,
        threshold: 7.0,
        channels: [],
        tags: [],
        notes: '',
        createdAt: Date.now()
      };
      await saveSnapshot(snapshot);
    }

    expect(await getSnapshotCount()).toBe(5);
    await clearDB();
    expect(await getSnapshotCount()).toBe(0);
  });
});

describe('数据模拟器测试', () => {
  beforeEach(() => {
    dataSimulator.reset();
  });

  it('应生成 DCS 氧含量数据', () => {
    const data = dataSimulator.generateOxygenData('DCS');
    expect(data.source).toBe('DCS');
    expect(data.value).toBeGreaterThanOrEqual(0);
    expect(data.quality).toBe('good');
  });

  it('应生成 FSSS 氧含量数据', () => {
    const data = dataSimulator.generateOxygenData('FSSS');
    expect(data.source).toBe('FSSS');
    expect(data.value).toBeGreaterThanOrEqual(0);
  });

  it('应生成效率数据', () => {
    const data = dataSimulator.generateEfficiencyData();
    expect(data.value).toBeGreaterThanOrEqual(0);
    expect(data.coalConsumption).toBeGreaterThan(0);
    expect(data.steamOutput).toBeGreaterThan(0);
  });

  it('应生成风机控制数据', () => {
    const data = dataSimulator.generateFanControl();
    expect(data.forcedDraftSpeed).toBeGreaterThanOrEqual(30);
    expect(data.forcedDraftSpeed).toBeLessThanOrEqual(100);
    expect(data.inducedDraftSpeed).toBeGreaterThanOrEqual(30);
    expect(data.inducedDraftSpeed).toBeLessThanOrEqual(100);
  });

  it('应触发异常', () => {
    dataSimulator.triggerAnomaly(15);
    let foundLowValue = false;
    for (let i = 0; i < 10; i++) {
      const data = dataSimulator.generateOxygenData('DCS');
      if (data.value < 3.0) {
        foundLowValue = true;
        break;
      }
    }
    expect(foundLowValue).toBe(true);
  });

  it('应设置风机控制', () => {
    dataSimulator.setFanControl({ forcedDraftSpeed: 80, inducedDraftSpeed: 78 });
    const data = dataSimulator.generateFanControl();
    expect(data.forcedDraftSpeed).toBeCloseTo(80, 0);
    expect(data.inducedDraftSpeed).toBeCloseTo(78, 0);
  });

  it('应设置氧含量设定值', () => {
    dataSimulator.setOxygenSetpoint(4.0);
    const data = dataSimulator.generateFanControl();
    expect(data.oxygenSetpoint).toBe(4.0);
  });
});

describe('核心业务场景集成测试', () => {
  beforeEach(() => {
    syncEngine.reset();
    mpcController.reset();
    anomalyDetector.reset();
    dataSimulator.reset();
  });

  it('场景1: 实时数据采集与语义同步流程', () => {
    for (let i = 0; i < 10; i++) {
      const dcsData = dataSimulator.generateOxygenData('DCS');
      const fsssData = dataSimulator.generateOxygenData('FSSS');
      const efficiencyData = dataSimulator.generateEfficiencyData();
      const fanData = dataSimulator.generateFanControl();

      const syncedDCS = syncEngine.processOxygenData(dcsData);
      const syncedFSSS = syncEngine.processOxygenData(fsssData);
      syncEngine.processEfficiencyData(efficiencyData);
      syncEngine.processFanControl(fanData);

      expect(syncedDCS.uuid).toBeDefined();
      expect(syncedFSSS.uuid).toBeDefined();
      expect(syncedDCS.semanticTag).toBe(syncedFSSS.semanticTag);
    }

    const status = syncEngine.getAllSyncStatus();
    expect(status.some(s => s.source === 'DCS' && s.status === 'running')).toBe(true);
    expect(status.some(s => s.source === 'FSSS' && s.status === 'running')).toBe(true);
  });

  it('场景2: MPC 预测控制优化流程', () => {
    for (let i = 0; i < 20; i++) {
      const oxygen = dataSimulator.generateOxygenData('DCS');
      const efficiency = dataSimulator.generateEfficiencyData();
      const fan = dataSimulator.generateFanControl();
      mpcController.addHistoricalData(oxygen, efficiency, fan);
    }

    const currentFan = dataSimulator.generateFanControl();
    const prediction = mpcController.predict(currentFan);

    expect(prediction).toBeDefined();
    expect(prediction.predictedEfficiency).toBeInstanceOf(Array);
    expect(prediction.predictedEfficiency.length).toBeGreaterThan(0);
    expect(prediction.predictedEfficiency[0]).toBeGreaterThan(80);
    expect(prediction.predictedOxygen).toBeInstanceOf(Array);
    expect(prediction.predictedOxygen.length).toBeGreaterThan(0);
    expect(prediction.predictedOxygen[0]).toBeGreaterThan(0);
    expect(prediction.optimizedParams.forcedDraftSpeed).toBeDefined();
    expect(prediction.optimizedParams.inducedDraftSpeed).toBeDefined();
    expect(prediction.optimizedParams.damperOpening).toBeDefined();
  });

  it('场景3: 异常捕获与波形快照存储', () => {
    let capturedEvent = null;

    anomalyDetector.addAnomalyListener((event) => {
      capturedEvent = event;
    });

    dataSimulator.triggerAnomaly(15);
    for (let i = 0; i < 5; i++) {
      const oxygen = dataSimulator.generateOxygenData('DCS');
      anomalyDetector.processOxygenData(oxygen);
    }

    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent?.type).toBe('oxygen_low');

    const oxygenData: OxygenData[] = Array.from({ length: 10 }, (_, i) => ({
      id: generateUUID(),
      value: 1.0 + Math.random() * 0.5,
      timestamp: Date.now() - 10000 + i * 1000,
      source: 'DCS',
      quality: 'good' as const,
      semanticTag: 'combustion.oxygen'
    }));
    const efficiencyData: EfficiencyData[] = Array.from({ length: 10 }, (_, i) => ({
      id: generateUUID(),
      value: 85 + Math.random() * 5,
      timestamp: Date.now() - 10000 + i * 1000,
      coalConsumption: 50,
      steamOutput: 100,
      airFlow: 200
    }));
    const fanData: FanControl[] = Array.from({ length: 10 }, (_, i) => ({
      id: generateUUID(),
      forcedDraftSpeed: 75,
      inducedDraftSpeed: 72,
      damperOpening: 65,
      oxygenSetpoint: 3.5,
      timestamp: Date.now() - 10000 + i * 1000
    }));

    const snapshot = anomalyDetector.createSnapshot(
      Date.now() - 10000,
      Date.now(),
      'oxygen_low',
      oxygenData,
      efficiencyData,
      fanData
    );

    expect(snapshot).toBeDefined();
    expect(snapshot.triggerType).toBe('oxygen_low');
    expect(snapshot.channels.length).toBe(4);
  });

  it('场景4: 手动/自动控制切换', () => {
    dataSimulator.setFanControl({ forcedDraftSpeed: 80, inducedDraftSpeed: 75, damperOpening: 70 });

    for (let i = 0; i < 20; i++) {
      const oxygen = dataSimulator.generateOxygenData('DCS');
      const efficiency = dataSimulator.generateEfficiencyData();
      const fan = dataSimulator.generateFanControl();
      mpcController.addHistoricalData(oxygen, efficiency, fan);
    }

    const currentFan = dataSimulator.generateFanControl();
    const prediction = mpcController.predict(currentFan);

    expect(prediction.optimizedParams).toBeDefined();
    expect(prediction.confidence).toBeDefined();

    dataSimulator.setFanControl({
      forcedDraftSpeed: prediction.optimizedParams.forcedDraftSpeed,
      inducedDraftSpeed: prediction.optimizedParams.inducedDraftSpeed,
      damperOpening: prediction.optimizedParams.damperOpening
    });

    const newFan = dataSimulator.generateFanControl();
    expect(newFan.forcedDraftSpeed).toBeCloseTo(prediction.optimizedParams.forcedDraftSpeed, 0);
  });

  it('场景5: 数据清空与重置', () => {
    anomalyDetector.updateThresholds({ oxygenMin: 2.0, oxygenMax: 8.0 });
    mpcController.updateConfig({ predictionHorizon: 60 });

    for (let i = 0; i < 10; i++) {
      const oxygen = dataSimulator.generateOxygenData('DCS');
      const efficiency = dataSimulator.generateEfficiencyData();
      const fan = dataSimulator.generateFanControl();
      mpcController.addHistoricalData(oxygen, efficiency, fan);
    }

    expect(anomalyDetector.getThresholds().oxygenMin).toBe(2.0);
    expect(mpcController.getConfig().predictionHorizon).toBe(60);
    expect(mpcController.getDataCount()).toBeGreaterThan(0);

    anomalyDetector.reset();
    anomalyDetector.updateThresholds(DEFAULT_THRESHOLDS);
    mpcController.reset();
    mpcController.updateConfig(DEFAULT_MPC_CONFIG);
    syncEngine.reset();
    dataSimulator.reset();

    expect(anomalyDetector.getThresholds().oxygenMin).toBe(DEFAULT_THRESHOLDS.oxygenMin);
    expect(mpcController.getConfig().predictionHorizon).toBe(DEFAULT_MPC_CONFIG.predictionHorizon);
    expect(mpcController.getDataCount()).toBe(0);
  });
});
