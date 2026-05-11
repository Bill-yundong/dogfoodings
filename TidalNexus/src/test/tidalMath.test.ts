import { describe, it, expect } from 'vitest';
import {
  calculatePowerDensity,
  calculateTurbinePower,
  generateSyntheticTidalData,
  calculateVectorComponents,
  calculateSpringNeapCycle,
  calculateCapacityFactor,
  calculateAnnualEnergyProduction,
} from '../utils/tidalMath';
import { GeoLocation, Turbine } from '../types/tidal';

describe('TidalMath - 潮流能数学计算工具', () => {
  describe('calculatePowerDensity - 功率密度计算', () => {
    it('应该正确计算给定流速下的功率密度', () => {
      const velocity = 2;
      const expected = 0.5 * 1025 * Math.pow(2, 3);
      expect(calculatePowerDensity(velocity)).toBe(expected);
    });

    it('流速为0时功率密度应为0', () => {
      expect(calculatePowerDensity(0)).toBe(0);
    });

    it('高流速时功率密度应符合立方定律', () => {
      const pd1 = calculatePowerDensity(1);
      const pd2 = calculatePowerDensity(2);
      expect(pd2).toBe(pd1 * 8);
    });
  });

  describe('calculateTurbinePower - 涡轮机功率计算', () => {
    const testTurbine: Turbine = {
      id: 'test',
      location: { latitude: 30, longitude: 120 },
      ratedPower: 1000,
      efficiency: 0.4,
      rotorDiameter: 20,
      cutInSpeed: 0.8,
      cutOutSpeed: 4.5,
    };

    it('低于切入转速时输出功率为0', () => {
      expect(calculateTurbinePower(0.5, testTurbine)).toBe(0);
    });

    it('高于切出转速时输出功率为0', () => {
      expect(calculateTurbinePower(5, testTurbine)).toBe(0);
    });

    it('正常工作范围内应正确计算功率', () => {
      const sweptArea = Math.PI * Math.pow(10, 2);
      const availablePower = 0.5 * 1025 * sweptArea * Math.pow(2, 3);
      const expectedPower = availablePower * 0.4;
      expect(calculateTurbinePower(2, testTurbine)).toBeCloseTo(expectedPower, 5);
    });

    it('不应超过额定功率', () => {
      const power = calculateTurbinePower(10, {
        ...testTurbine,
        cutOutSpeed: 20,
      });
      expect(power).toBeLessThanOrEqual(testTurbine.ratedPower);
    });
  });

  describe('generateSyntheticTidalData - 合成潮汐数据生成', () => {
    const location: GeoLocation = { latitude: 30, longitude: 120 };
    const startTime = Date.now();

    it('应生成正确数量的数据点', () => {
      const data = generateSyntheticTidalData(location, startTime, 24, 60);
      expect(data.length).toBe(24);
    });

    it('生成的数据应包含时间戳、水位和流速信息', () => {
      const data = generateSyntheticTidalData(location, startTime, 10, 60);
      data.forEach((point) => {
        expect(point.timestamp).toBeDefined();
        expect(typeof point.timestamp).toBe('number');
        expect(point.waterLevel).toBeDefined();
        expect(point.velocity).toBeDefined();
        expect(point.velocity.magnitude).toBeGreaterThan(0);
        expect(point.velocity.direction).toBeGreaterThanOrEqual(0);
        expect(point.velocity.direction).toBeLessThan(360);
      });
    });

    it('时间戳应按时间顺序递增', () => {
      const data = generateSyntheticTidalData(location, startTime, 10, 60);
      for (let i = 1; i < data.length; i++) {
        expect(data[i].timestamp).toBeGreaterThan(data[i - 1].timestamp);
      }
    });

    it('水位应呈现周期性变化', () => {
      const data = generateSyntheticTidalData(location, startTime, 24, 60);
      const waterLevels = data.map((d) => d.waterLevel);
      const maxLevel = Math.max(...waterLevels);
      const minLevel = Math.min(...waterLevels);
      expect(maxLevel).toBeGreaterThan(minLevel);
    });
  });

  describe('calculateVectorComponents - 向量分量计算', () => {
    it('应正确计算东向（u）和北向（v）分量', () => {
      const magnitude = 2;
      const direction = 0;
      const components = calculateVectorComponents(magnitude, direction);
      expect(components.u).toBeCloseTo(2, 5);
      expect(components.v).toBeCloseTo(0, 5);
    });

    it('90度方向时北向分量应等于幅值', () => {
      const components = calculateVectorComponents(2, 90);
      expect(components.u).toBeCloseTo(0, 5);
      expect(components.v).toBeCloseTo(2, 5);
    });
  });

  describe('calculateSpringNeapCycle - 大小潮周期计算', () => {
    it('返回值应在0-1范围内', () => {
      const result = calculateSpringNeapCycle(Date.now());
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('相隔半个月的时间点应呈现不同相位', () => {
      const now = Date.now();
      const halfMonthLater = now + 15 * 24 * 60 * 60 * 1000;
      const r1 = calculateSpringNeapCycle(now);
      const r2 = calculateSpringNeapCycle(halfMonthLater);
      expect(Math.abs(r1 - r2)).toBeGreaterThan(0.1);
    });
  });

  describe('calculateCapacityFactor - 容量因子计算', () => {
    const testTurbine: Turbine = {
      id: 'test',
      location: { latitude: 30, longitude: 120 },
      ratedPower: 1000,
      efficiency: 0.4,
      rotorDiameter: 20,
      cutInSpeed: 0.8,
      cutOutSpeed: 4.5,
    };

    it('空数据应返回0', () => {
      expect(calculateCapacityFactor([], testTurbine)).toBe(0);
    });

    it('容量因子应在0-1范围内', () => {
      const location: GeoLocation = { latitude: 30, longitude: 120 };
      const tidalData = generateSyntheticTidalData(location, Date.now(), 72, 10);
      const capacityFactor = calculateCapacityFactor(tidalData, testTurbine);
      expect(capacityFactor).toBeGreaterThanOrEqual(0);
      expect(capacityFactor).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateAnnualEnergyProduction - 年发电量计算', () => {
    const testTurbine: Turbine = {
      id: 'test',
      location: { latitude: 30, longitude: 120 },
      ratedPower: 1000,
      efficiency: 0.4,
      rotorDiameter: 20,
      cutInSpeed: 0.8,
      cutOutSpeed: 4.5,
    };

    it('应基于容量因子计算年发电量', () => {
      const location: GeoLocation = { latitude: 30, longitude: 120 };
      const tidalData = generateSyntheticTidalData(location, Date.now(), 72, 10);
      const annualEnergy = calculateAnnualEnergyProduction(tidalData, testTurbine);
      expect(annualEnergy).toBeGreaterThan(0);
      expect(annualEnergy).toBeLessThanOrEqual(1000 * 8760);
    });
  });
});
