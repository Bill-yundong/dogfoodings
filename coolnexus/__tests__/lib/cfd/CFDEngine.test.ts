import { AsyncCFDEngine } from '@/lib/cfd/CFDEngine';
import { Rack, PrecisionAC } from '@/lib/types/datacenter';

describe('AsyncCFDEngine', () => {
  let cfdEngine: AsyncCFDEngine;
  let mockRacks: Rack[];
  let mockACs: PrecisionAC[];

  beforeEach(() => {
    cfdEngine = new AsyncCFDEngine({
      gridSize: { x: 10, y: 5, z: 8 },
      iterations: 10,
      relaxationFactor: 0.3,
    });

    mockRacks = [
      {
        id: 'rack-1',
        name: 'Rack 1',
        position: { row: 0, col: 0 },
        servers: [],
        maxPower: 10000,
        currentPower: 5000,
        inletTemperature: 22,
        outletTemperature: 35,
      },
      {
        id: 'rack-2',
        name: 'Rack 2',
        position: { row: 1, col: 1 },
        servers: [],
        maxPower: 10000,
        currentPower: 6000,
        inletTemperature: 23,
        outletTemperature: 38,
      },
    ];

    mockACs = [
      {
        id: 'ac-1',
        name: 'AC 1',
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

  describe('初始化测试', () => {
    it('应该正确初始化网格配置', () => {
      const engine = new AsyncCFDEngine({
        gridSize: { x: 20, y: 10, z: 15 },
        iterations: 50,
        relaxationFactor: 0.5,
      });
      expect(engine).toBeDefined();
    });

    it('应该使用默认配置初始化', () => {
      const engine = new AsyncCFDEngine();
      expect(engine).toBeDefined();
    });
  });

  describe('温度场计算测试', () => {
    it('应该异步计算温度场并返回结果', async () => {
      const progressCallback = jest.fn();
      
      const result = await cfdEngine.computeTemperatureField(
        mockRacks,
        mockACs,
        progressCallback
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('每个温度点应该包含正确的属性', async () => {
      const result = await cfdEngine.computeTemperatureField(mockRacks, mockACs);
      
      const point = result[0];
      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      expect(point).toHaveProperty('z');
      expect(point).toHaveProperty('temperature');
      expect(typeof point.x).toBe('number');
      expect(typeof point.y).toBe('number');
      expect(typeof point.z).toBe('number');
      expect(typeof point.temperature).toBe('number');
    });

    it('温度值应该在合理范围内', async () => {
      const result = await cfdEngine.computeTemperatureField(mockRacks, mockACs);
      
      const temperatures = result.map(p => p.temperature);
      const minTemp = Math.min(...temperatures);
      const maxTemp = Math.max(...temperatures);
      
      expect(minTemp).toBeGreaterThan(10);
      expect(maxTemp).toBeLessThan(60);
    });

    it('应该正确报告计算进度', async () => {
      const progressCallback = jest.fn();
      
      await cfdEngine.computeTemperatureField(
        mockRacks,
        mockACs,
        progressCallback
      );

      const progressValues = progressCallback.mock.calls.map(c => c[0]);
      expect(progressValues.every(v => v >= 0 && v <= 100)).toBe(true);
    });
  });

  describe('气流风险检测测试', () => {
    it('应该检测热点风险', async () => {
      const temperaturePoints = await cfdEngine.computeTemperatureField(mockRacks, mockACs);
      const risks = cfdEngine.detectAirflowRisks(temperaturePoints, mockRacks);
      
      expect(Array.isArray(risks)).toBe(true);
      
      if (risks.length > 0) {
        const risk = risks[0];
        expect(risk).toHaveProperty('id');
        expect(risk).toHaveProperty('type');
        expect(risk).toHaveProperty('severity');
        expect(risk).toHaveProperty('location');
        expect(risk).toHaveProperty('description');
        expect(risk).toHaveProperty('temperature');
      }
    });

    it('风险类型应该是有效值', async () => {
      const temperaturePoints = await cfdEngine.computeTemperatureField(mockRacks, mockACs);
      const risks = cfdEngine.detectAirflowRisks(temperaturePoints, mockRacks);
      
      const validTypes = ['short_circuit', 'hot_spot', 'recirculation'];
      risks.forEach(risk => {
        expect(validTypes).toContain(risk.type);
      });
    });

    it('严重级别应该是有效值', async () => {
      const temperaturePoints = await cfdEngine.computeTemperatureField(mockRacks, mockACs);
      const risks = cfdEngine.detectAirflowRisks(temperaturePoints, mockRacks);
      
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      risks.forEach(risk => {
        expect(validSeverities).toContain(risk.severity);
      });
    });

    it('温度越高应该返回越高的严重级别', async () => {
      const highTempPoints = Array(100).fill(null).map((_, i) => ({
        x: i % 10,
        y: Math.floor(i / 10) % 5,
        z: Math.floor(i / 50),
        temperature: 45 + Math.random() * 10,
      }));

      const risks = cfdEngine.detectAirflowRisks(highTempPoints, mockRacks);
      
      if (risks.length > 0) {
        const hasHighOrCritical = risks.some(r => 
          r.severity === 'high' || r.severity === 'critical'
        );
        expect(hasHighOrCritical).toBe(true);
      }
    });
  });

  describe('边界条件测试', () => {
    it('空机架列表应该能正常计算', async () => {
      const result = await cfdEngine.computeTemperatureField([], mockACs);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('空空调列表应该能正常计算', async () => {
      const result = await cfdEngine.computeTemperatureField(mockRacks, []);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('机柜位置应该影响温度分布', async () => {
      const racksLeft = [{ ...mockRacks[0], position: { row: 0, col: 0 } }];
      const racksRight = [{ ...mockRacks[0], position: { row: 3, col: 3 } }];

      const resultLeft = await cfdEngine.computeTemperatureField(racksLeft, []);
      const resultRight = await cfdEngine.computeTemperatureField(racksRight, []);

      expect(resultLeft).not.toEqual(resultRight);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成计算', async () => {
      const startTime = Date.now();
      
      await cfdEngine.computeTemperatureField(mockRacks, mockACs);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000);
    });

    it('多次计算应该保持一致', async () => {
      const result1 = await cfdEngine.computeTemperatureField(mockRacks, mockACs);
      const result2 = await cfdEngine.computeTemperatureField(mockRacks, mockACs);
      
      expect(result1.length).toBe(result2.length);
    });
  });
});
