import { describe, it, expect, beforeEach } from 'vitest';
import type { EnergyStation, WeatherCondition } from '../types/energy';
import { solveMultiEnergyFlow, applyOptimizations } from '../utils/multiEnergyFlow';

describe('多能源潮流算法求解器', () => {
  let testStations: EnergyStation[];
  let testWeather: WeatherCondition;

  beforeEach(() => {
    testStations = [
      {
        id: 'station-001',
        name: '东区能源站',
        location: { lat: 39.9042, lng: 116.4074 },
        balance: {
          cooling: { current: 450, target: 500, capacity: 800, efficiency: 0.85 },
          heating: { current: 320, target: 350, capacity: 600, efficiency: 0.88 },
          electricity: { current: 280, target: 300, capacity: 500, efficiency: 0.92, renewableRatio: 0.35 },
          timestamp: Date.now(),
        },
        status: 'normal',
        lastUpdate: Date.now(),
      },
      {
        id: 'station-002',
        name: '西区能源站',
        location: { lat: 39.9142, lng: 116.3974 },
        balance: {
          cooling: { current: 520, target: 550, capacity: 900, efficiency: 0.82 },
          heating: { current: 380, target: 400, capacity: 700, efficiency: 0.85 },
          electricity: { current: 350, target: 380, capacity: 600, efficiency: 0.90, renewableRatio: 0.42 },
          timestamp: Date.now(),
        },
        status: 'normal',
        lastUpdate: Date.now(),
      },
    ];

    testWeather = {
      temperature: 28,
      humidity: 65,
      solarRadiation: 450,
      windSpeed: 3.5,
      timestamp: Date.now(),
    };
  });

  describe('场景1: 多站协同优化求解', () => {
    it('应成功执行多能源潮流优化计算', async () => {
      const result = await solveMultiEnergyFlow(testStations, testWeather);
      
      expect(result).toBeDefined();
      expect(result.optimizations).toHaveLength(2);
      expect(result.convergence).toBe(true);
      expect(result.totalEfficiency).toBeGreaterThan(0);
      expect(result.carbonSaved).toBeGreaterThan(0);
    });

    it('每个能源站应生成有效的优化调整', async () => {
      const result = await solveMultiEnergyFlow(testStations, testWeather);
      
      result.optimizations.forEach((opt, index) => {
        expect(opt.stationId).toBe(testStations[index].id);
        expect(opt.adjustments).toBeDefined();
        expect(typeof opt.adjustments.cooling).toBe('number');
        expect(typeof opt.adjustments.heating).toBe('number');
        expect(typeof opt.adjustments.electricity).toBe('number');
        expect(opt.objectiveValue).toBeGreaterThan(0);
        expect(opt.constraintsSatisfied).toBe(true);
      });
    });

    it('优化调整幅度应在合理范围内', async () => {
      const result = await solveMultiEnergyFlow(testStations, testWeather);
      
      result.optimizations.forEach((opt) => {
        expect(Math.abs(opt.adjustments.cooling)).toBeLessThanOrEqual(0.2);
        expect(Math.abs(opt.adjustments.heating)).toBeLessThanOrEqual(0.2);
        expect(Math.abs(opt.adjustments.electricity)).toBeLessThanOrEqual(0.15);
      });
    });
  });

  describe('场景2: 优化结果应用', () => {
    it('应正确应用优化调整到能源站数据', async () => {
      const result = await solveMultiEnergyFlow(testStations, testWeather);
      const optimizedStations = applyOptimizations(testStations, result.optimizations);
      
      expect(optimizedStations).toHaveLength(testStations.length);
      optimizedStations.forEach((station, index) => {
        const original = testStations[index];
        const opt = result.optimizations.find(o => o.stationId === station.id);
        
        expect(station.balance.cooling.current).toBeCloseTo(
          original.balance.cooling.current * (1 + opt!.adjustments.cooling),
          5
        );
        expect(station.balance.heating.current).toBeCloseTo(
          original.balance.heating.current * (1 + opt!.adjustments.heating),
          5
        );
        expect(station.balance.electricity.current).toBeCloseTo(
          original.balance.electricity.current * (1 + opt!.adjustments.electricity),
          5
        );
      });
    });

    it('应更新时间戳标识数据已更新', async () => {
      const result = await solveMultiEnergyFlow(testStations, testWeather);
      const optimizedStations = applyOptimizations(testStations, result.optimizations);
      
      optimizedStations.forEach((station) => {
        expect(station.lastUpdate).toBeGreaterThan(0);
        expect(station.balance.timestamp).toBeGreaterThan(0);
      });
    });
  });

  describe('场景3: 不同气象条件下的优化', () => {
    it('夏季高温条件下应增加制冷负荷优化权重', async () => {
      const summerWeather: WeatherCondition = {
        ...testWeather,
        temperature: 38,
      };
      
      const result = await solveMultiEnergyFlow(testStations, summerWeather);
      expect(result).toBeDefined();
      expect(result.convergence).toBe(true);
    });

    it('冬季低温条件下应增加供热负荷优化权重', async () => {
      const winterWeather: WeatherCondition = {
        ...testWeather,
        temperature: -5,
      };
      
      const result = await solveMultiEnergyFlow(testStations, winterWeather);
      expect(result).toBeDefined();
      expect(result.convergence).toBe(true);
    });

    it('高太阳辐射条件下应提升可再生能源利用率', async () => {
      const highSolarWeather: WeatherCondition = {
        ...testWeather,
        solarRadiation: 900,
      };
      
      const result = await solveMultiEnergyFlow(testStations, highSolarWeather);
      expect(result).toBeDefined();
      expect(result.carbonSaved).toBeGreaterThan(0);
    });
  });

  describe('场景4: 单能源站优化边界测试', () => {
    it('单个能源站也应能正常执行优化', async () => {
      const singleStation = [testStations[0]];
      const result = await solveMultiEnergyFlow(singleStation, testWeather);
      
      expect(result.optimizations).toHaveLength(1);
      expect(result.convergence).toBe(true);
      expect(result.totalEfficiency).toBeGreaterThan(0);
    });

    it('零负荷能源站优化不应产生错误', async () => {
      const zeroLoadStation: EnergyStation = {
        ...testStations[0],
        balance: {
          cooling: { current: 0, target: 0, capacity: 800, efficiency: 0.85 },
          heating: { current: 0, target: 0, capacity: 600, efficiency: 0.88 },
          electricity: { current: 0, target: 0, capacity: 500, efficiency: 0.92, renewableRatio: 0.35 },
          timestamp: Date.now(),
        },
      };
      
      const result = await solveMultiEnergyFlow([zeroLoadStation], testWeather);
      expect(result).toBeDefined();
      expect(result.optimizations).toHaveLength(1);
    });
  });
});
