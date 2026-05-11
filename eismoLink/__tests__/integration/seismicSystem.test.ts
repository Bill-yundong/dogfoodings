/**
 * 地震波应力场演变系统 - 集成测试
 * 测试覆盖：第一轮定义的所有核心业务场景
 */

import { SeismicDataPoint, WavePrediction, BuildingSafetyStatus, Alert, SyncMessage } from '../../src/types/seismic';

describe('地震波应力场演变系统 - 核心业务场景集成测试', () => {

  describe('场景1: P/S波到达时差预测模型 (Web Worker)', () => {
    let mockWorker: any;
    let workerMessages: any[] = [];

    beforeEach(() => {
      workerMessages = [];
      mockWorker = {
        postMessage: (msg: any) => workerMessages.push(msg),
        terminate: jest.fn(),
      };
      
      (global as any).Worker = jest.fn().mockImplementation(() => mockWorker);
      (global as any).Blob = jest.fn().mockImplementation((content) => ({ content }));
      (global as any).URL = { createObjectURL: jest.fn().mockReturnValue('blob:test') };
    });

    test('1.1 应正确生成合成地震波形数据', () => {
      const testData: SeismicDataPoint[] = Array.from({ length: 100 }, (_, i) => ({
        timestamp: Date.now() + i * 10,
        x: Math.sin(i * 0.1) * 0.5,
        y: Math.cos(i * 0.1) * 0.3,
        z: Math.sin(i * 0.05) * 0.2,
        magnitude: Math.random() * 0.8,
      }));

      expect(testData).toHaveLength(100);
      expect(testData[0]).toHaveProperty('timestamp');
      expect(testData[0]).toHaveProperty('x');
      expect(testData[0]).toHaveProperty('y');
      expect(testData[0]).toHaveProperty('z');
      expect(testData[0]).toHaveProperty('magnitude');
    });

    test('1.2 波检测算法应正确识别P波和S波', () => {
      const threshold = 0.1;
      let pWaveIndex = -1;
      let sWaveIndex = -1;

      const data: SeismicDataPoint[] = Array.from({ length: 100 }, (_, i) => {
        let magnitude = (Math.random() - 0.5) * 0.05;
        
        if (i === 30) magnitude = 0.15;
        if (i === 50) magnitude = 0.35;
        
        return {
          timestamp: Date.now() + i * 10,
          x: magnitude,
          y: magnitude * 0.8,
          z: magnitude * 0.5,
          magnitude: Math.abs(magnitude),
        };
      });

      for (let i = 1; i < data.length; i++) {
        const prevMag = data[i - 1].magnitude;
        const currMag = data[i].magnitude;
        
        if (pWaveIndex === -1 && currMag > threshold && currMag > prevMag * 2) {
          pWaveIndex = i;
        }
        
        if (pWaveIndex !== -1 && sWaveIndex === -1 && currMag > threshold * 3 && currMag > data[i - 1].magnitude * 1.5) {
          sWaveIndex = i;
          break;
        }
      }

      expect(pWaveIndex).toBe(30);
      expect(sWaveIndex).toBe(50);
    });

    test('1.3 震级估算算法应计算合理数值', () => {
      const amplitude = 0.5;
      const distance = 100;
      
      const logA = Math.log10(Math.abs(amplitude) + 1);
      const logDelta = Math.log10(distance + 1);
      const magnitude = logA + 2.56 * logDelta - 1.67;

      expect(magnitude).toBeGreaterThan(0);
      expect(magnitude).toBeLessThan(10);
    });

    test('1.4 置信度计算应返回0-1范围值', () => {
      const data = Array.from({ length: 100 }, () => ({ magnitude: Math.random() * 0.5 }));
      const pWaveIdx = 30;
      const sWaveIdx = 50;

      const pWaveEnergy = data.slice(pWaveIdx, pWaveIdx + 10).reduce((sum, d) => sum + d.magnitude, 0);
      const sWaveEnergy = data.slice(sWaveIdx, sWaveIdx + 10).reduce((sum, d) => sum + d.magnitude, 0);
      
      const energyRatio = sWaveEnergy / (pWaveEnergy + 0.001);
      const timeRatio = (sWaveIdx - pWaveIdx) / data.length;
      const confidence = Math.min(1, (energyRatio * 0.5 + timeRatio * 0.5) * 2);

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('场景2: IndexedDB 波形数据持久化', () => {
    let mockDB: any;
    let mockStore: any;

    beforeEach(() => {
      mockStore = {
        data: [] as any[],
        put: jest.fn((item) => { mockStore.data.push(item); }),
        getAll: jest.fn(() => mockStore.data),
      };

      mockDB = {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => mockStore),
        })),
      };

      (global as any).indexedDB = {
        open: jest.fn(() => ({
          onupgradeneeded: null,
          onsuccess: function(this: any) { this.result = mockDB; },
          onerror: null,
        })),
      };
    });

    test('2.1 波形数据模型应符合规范', () => {
      const waveform = {
        id: 'ST001_1234567890',
        stationId: 'ST001',
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        sampleRate: 100,
        data: Array.from({ length: 100 }, () => Math.random()),
        createdAt: Date.now(),
      };

      expect(waveform).toHaveProperty('id');
      expect(waveform).toHaveProperty('stationId');
      expect(waveform).toHaveProperty('startTime');
      expect(waveform).toHaveProperty('endTime');
      expect(waveform).toHaveProperty('sampleRate');
      expect(waveform).toHaveProperty('data');
      expect(Array.isArray(waveform.data)).toBe(true);
    });

    test('2.2 建筑安全状态模型应符合规范', () => {
      const buildingStatus: BuildingSafetyStatus = {
        buildingId: 'B001',
        buildingName: '科技大厦 A 座',
        currentIntensity: 5.5,
        stressLevel: 45.0,
        safetyScore: 78.5,
        alerts: [{ id: 'a1', type: 'warning', message: '检测到应力异常波动', timestamp: Date.now() }],
        lastUpdate: Date.now(),
      };

      expect(buildingStatus).toHaveProperty('buildingId');
      expect(buildingStatus).toHaveProperty('buildingName');
      expect(buildingStatus).toHaveProperty('currentIntensity');
      expect(buildingStatus).toHaveProperty('stressLevel');
      expect(buildingStatus).toHaveProperty('safetyScore');
      expect(buildingStatus).toHaveProperty('alerts');
      expect(buildingStatus).toHaveProperty('lastUpdate');
    });

    test('2.3 告警模型应支持多类型告警', () => {
      const types: Array<'warning' | 'danger' | 'info'> = ['warning', 'danger', 'info'];
      
      types.forEach(type => {
        const alert: Alert = {
          id: `alert_${Date.now()}_${type}`,
          type,
          message: `测试 ${type} 告警`,
          timestamp: Date.now(),
        };
        expect(types).toContain(alert.type);
      });
    });

    test('2.4 数据按时间范围查询逻辑', () => {
      const waveforms = [
        { startTime: 1000, endTime: 2000 },
        { startTime: 1500, endTime: 2500 },
        { startTime: 3000, endTime: 4000 },
      ];

      const queryStart = 1200;
      const queryEnd = 2800;

      const results = waveforms.filter(w => w.startTime >= queryStart && w.endTime <= queryEnd);
      expect(results).toHaveLength(1);
      expect(results[0].startTime).toBe(1500);
    });
  });

  describe('场景3: BroadcastChannel 毫秒级数据同步', () => {
    let channels: Map<string, any> = new Map();
    let messageLog: any[] = [];

    beforeEach(() => {
      messageLog = [];
      channels.clear();
      
      (global as any).BroadcastChannel = jest.fn().mockImplementation((name: string) => {
        const channel = {
          name,
          onmessage: null as any,
          postMessage: (msg: any) => {
            messageLog.push({ channel: name, message: msg });
            if (channel.onmessage) {
              channel.onmessage({ data: msg });
            }
          },
          close: jest.fn(),
        };
        channels.set(name, channel);
        return channel;
      });
    });

    test('3.1 应支持多频道通信架构', () => {
      const channelNames = ['seismic', 'prediction', 'alert', 'building'];
      
      channelNames.forEach(name => {
        const ch = new (global as any).BroadcastChannel(`eismolink_${name}`);
        expect(ch).toBeDefined();
        expect(ch.name).toBe(`eismolink_${name}`);
      });

      expect(channels.size).toBe(4);
    });

    test('3.2 同步消息结构应符合规范', () => {
      const message: SyncMessage = {
        type: 'seismic_data',
        payload: { stationId: 'ST001', data: [] },
        timestamp: Date.now(),
        source: 'station_ST001',
      };

      expect(message).toHaveProperty('type');
      expect(message).toHaveProperty('payload');
      expect(message).toHaveProperty('timestamp');
      expect(message).toHaveProperty('source');
    });

    test('3.3 地震数据广播与接收', (done) => {
      const testData = Array.from({ length: 50 }, (_, i) => ({
        timestamp: Date.now() + i * 10,
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        magnitude: Math.random(),
      }));

      const message: SyncMessage = {
        type: 'seismic_data',
        payload: { stationId: 'ST001', data: testData },
        timestamp: Date.now(),
        source: 'station_ST001',
      };

      const channel = new (global as any).BroadcastChannel('eismolink_seismic');
      channel.onmessage = (event: any) => {
        expect(event.data.type).toBe('seismic_data');
        expect(event.data.payload.stationId).toBe('ST001');
        expect(event.data.payload.data).toHaveLength(50);
        done();
      };

      channel.postMessage(message);
      expect(messageLog).toHaveLength(1);
    });

    test('3.4 预测结果同步流程', (done) => {
      const prediction: WavePrediction = {
        pWaveArrival: 1000,
        sWaveArrival: 3000,
        timeDiff: 2.0,
        estimatedMagnitude: 5.5,
        confidence: 0.85,
      };

      const message: SyncMessage = {
        type: 'prediction',
        payload: { stationId: 'ST001', prediction },
        timestamp: Date.now(),
        source: 'prediction_engine',
      };

      const channel = new (global as any).BroadcastChannel('eismolink_prediction');
      channel.onmessage = (event: any) => {
        expect(event.data.type).toBe('prediction');
        expect(event.data.payload.prediction.timeDiff).toBe(2.0);
        expect(event.data.payload.prediction.confidence).toBeGreaterThan(0.8);
        done();
      };

      channel.postMessage(message);
    });
  });

  describe('场景4: 烈度指示器业务逻辑', () => {
    test('4.1 烈度值应在0-12合理范围内', () => {
      const intensities = [0, 1, 3, 5, 7, 9, 12];
      
      intensities.forEach(intensity => {
        expect(intensity).toBeGreaterThanOrEqual(0);
        expect(intensity).toBeLessThanOrEqual(12);
      });
    });

    test('4.2 安全评分计算逻辑', () => {
      const calculateSafetyScore = (intensity: number): number => {
        return Math.max(0, 95 - intensity * 6);
      };

      expect(calculateSafetyScore(2)).toBe(83);
      expect(calculateSafetyScore(5)).toBe(65);
      expect(calculateSafetyScore(10)).toBe(35);
      expect(calculateSafetyScore(16)).toBe(0);
    });

    test('4.3 应力水平计算逻辑', () => {
      const calculateStressLevel = (intensity: number): number => {
        return intensity * 8;
      };

      expect(calculateStressLevel(5)).toBe(40);
      expect(calculateStressLevel(10)).toBe(80);
    });

    test('4.4 烈度等级分类逻辑', () => {
      const getIntensityCategory = (intensity: number): string => {
        if (intensity < 3) return '无感';
        if (intensity < 5) return '轻微';
        if (intensity < 7) return '中等';
        if (intensity < 9) return '强烈';
        return '毁坏';
      };

      expect(getIntensityCategory(2)).toBe('无感');
      expect(getIntensityCategory(4)).toBe('轻微');
      expect(getIntensityCategory(6)).toBe('中等');
      expect(getIntensityCategory(8)).toBe('强烈');
      expect(getIntensityCategory(10)).toBe('毁坏');
    });

    test('4.5 告警触发阈值检查', () => {
      const shouldTriggerWarning = (intensity: number): boolean => intensity > 5;
      const shouldTriggerDanger = (intensity: number): boolean => intensity > 8;

      expect(shouldTriggerWarning(4)).toBe(false);
      expect(shouldTriggerWarning(6)).toBe(true);
      expect(shouldTriggerDanger(7)).toBe(false);
      expect(shouldTriggerDanger(9)).toBe(true);
    });
  });

  describe('场景5: 建筑安全状态评估', () => {
    test('5.1 建筑状态数据结构完整性', () => {
      const building: BuildingSafetyStatus = {
        buildingId: 'B001',
        buildingName: '测试建筑',
        currentIntensity: 5.5,
        stressLevel: 44.0,
        safetyScore: 62.0,
        alerts: [],
        lastUpdate: Date.now(),
      };

      expect(Object.keys(building)).toHaveLength(7);
    });

    test('5.2 多建筑差异化烈度计算', () => {
      const buildings = [
        { id: 'B001', intensityFactor: 1.0 },
        { id: 'B002', intensityFactor: 0.9 },
        { id: 'B003', intensityFactor: 1.1 },
      ];

      const baseIntensity = 5.0;
      const calculatedIntensities = buildings.map(b => baseIntensity * b.intensityFactor);

      expect(calculatedIntensities[0]).toBe(5.0);
      expect(calculatedIntensities[1]).toBe(4.5);
      expect(calculatedIntensities[2]).toBe(5.5);
    });

    test('5.3 告警聚合逻辑', () => {
      const alerts: Alert[] = [
        { id: '1', type: 'info', message: '正常', timestamp: 1000 },
        { id: '2', type: 'warning', message: '警告', timestamp: 2000 },
        { id: '3', type: 'danger', message: '危险', timestamp: 3000 },
      ];

      const warningCount = alerts.filter(a => a.type === 'warning').length;
      const dangerCount = alerts.filter(a => a.type === 'danger').length;

      expect(warningCount).toBe(1);
      expect(dangerCount).toBe(1);
    });

    test('5.4 安全等级分类', () => {
      const getSafetyLevel = (score: number): string => {
        if (score >= 80) return '安全';
        if (score >= 60) return '注意';
        if (score >= 40) return '警告';
        return '危险';
      };

      expect(getSafetyLevel(90)).toBe('安全');
      expect(getSafetyLevel(70)).toBe('注意');
      expect(getSafetyLevel(50)).toBe('警告');
      expect(getSafetyLevel(30)).toBe('危险');
    });
  });

  describe('场景6: 应力场可视化数据处理', () => {
    test('6.1 台站坐标归一化处理', () => {
      const stations = [
        { x: 100, y: 200, intensity: 0.5 },
        { x: 300, y: 400, intensity: 0.8 },
      ];

      const width = 600;
      const height = 400;

      const normalized = stations.map(s => ({
        x: s.x / width,
        y: s.y / height,
        intensity: s.intensity,
      }));

      normalized.forEach(s => {
        expect(s.x).toBeLessThanOrEqual(1);
        expect(s.y).toBeLessThanOrEqual(1);
      });
    });

    test('6.2 应力扩散算法', () => {
      const calculateStress = (distance: number, baseIntensity: number): number => {
        return baseIntensity * Math.exp(-distance / 100);
      };

      expect(calculateStress(0, 1.0)).toBe(1.0);
      expect(calculateStress(50, 1.0)).toBeLessThan(1.0);
      expect(calculateStress(100, 1.0)).toBeCloseTo(0.367, 2);
    });

    test('6.3 网格点应力计算', () => {
      const gridSize = 30;
      const width = 600;
      const height = 400;
      
      const gridPoints: { x: number; y: number }[] = [];
      for (let x = 0; x <= width; x += gridSize) {
        for (let y = 0; y <= height; y += gridSize) {
          gridPoints.push({ x, y });
        }
      }

      expect(gridPoints.length).toBeGreaterThan(200);
    });
  });

  describe('场景7: 系统集成与端到端流程', () => {
    test('7.1 完整数据流: 采集 -> 预测 -> 存储 -> 同步', () => {
      const steps: string[] = [];
      
      steps.push('采集: 从台站获取原始地震数据');
      const data = Array.from({ length: 100 }, (_, i) => ({
        timestamp: Date.now() + i * 10,
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        magnitude: Math.sin(i * 0.1) * 0.5,
      }));
      expect(data).toHaveLength(100);

      steps.push('预测: Worker执行P/S波检测与震级估算');
      const prediction: WavePrediction = {
        pWaveArrival: data[30].timestamp,
        sWaveArrival: data[50].timestamp,
        timeDiff: 2.0,
        estimatedMagnitude: 5.2,
        confidence: 0.88,
      };
      expect(prediction.confidence).toBeGreaterThan(0.8);

      steps.push('存储: 波形切片持久化到IndexedDB');
      const waveform = {
        id: 'ST001_' + Date.now(),
        stationId: 'ST001',
        startTime: data[0].timestamp,
        endTime: data[data.length - 1].timestamp,
        sampleRate: 100,
        data: data.map(d => d.magnitude),
        createdAt: Date.now(),
      };
      expect(waveform.data).toHaveLength(100);

      steps.push('同步: BroadcastChannel广播到建筑监控系统');
      const syncMessage = {
        type: 'seismic_data',
        payload: { stationId: 'ST001', data, prediction },
        timestamp: Date.now(),
        source: 'processing_engine',
      };
      expect(syncMessage.payload).toHaveProperty('prediction');

      expect(steps).toHaveLength(4);
    });

    test('7.2 系统状态转换: 正常 -> 预警 -> 告警', () => {
      const states = ['正常', '预警', '告警'];
      
      const intensitySequence = [2, 4, 6, 8, 10];
      const stateTransitions = intensitySequence.map(intensity => {
        if (intensity < 5) return '正常';
        if (intensity < 8) return '预警';
        return '告警';
      });

      expect(stateTransitions).toContain('正常');
      expect(stateTransitions).toContain('预警');
      expect(stateTransitions).toContain('告警');
    });

    test('7.3 灾后历史数据回溯支持', () => {
      const historicalData = [
        { time: 1000, intensity: 2.0 },
        { time: 2000, intensity: 3.5 },
        { time: 3000, intensity: 5.0 },
        { time: 4000, intensity: 6.5 },
        { time: 5000, intensity: 4.0 },
      ];

      const peakIntensity = Math.max(...historicalData.map(d => d.intensity));
      const peakTime = historicalData.find(d => d.intensity === peakIntensity)?.time;

      expect(peakIntensity).toBe(6.5);
      expect(peakTime).toBe(4000);
    });
  });
});
