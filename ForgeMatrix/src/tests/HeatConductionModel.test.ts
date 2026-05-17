import { describe, it, expect, beforeEach } from 'vitest';
import { AsyncHeatConductionModel } from '../models/HeatConductionModel';
import { ProcessParams } from '../types';

const DEFAULT_PARAMS: ProcessParams = {
  materialConductivity: 50,
  density: 7850,
  specificHeat: 450,
  ambientTemperature: 25,
  convectionCoefficient: 100,
  timeStep: 1,
  gridSize: 6
};

describe('AsyncHeatConductionModel', () => {
  let model: AsyncHeatConductionModel;

  beforeEach(() => {
    model = new AsyncHeatConductionModel(DEFAULT_PARAMS);
  });

  describe('初始化', () => {
    it('应该正确初始化网格', () => {
      const slice = model.getTemperatureSlice();
      expect(slice.length).toBe(DEFAULT_PARAMS.gridSize);
      expect(slice[0].length).toBe(DEFAULT_PARAMS.gridSize);
    });

    it('应该将初始温度设置为环境温度', () => {
      const slice = model.getTemperatureSlice();
      slice.forEach(row => {
        row.forEach(point => {
          expect(point.temperature).toBeCloseTo(DEFAULT_PARAMS.ambientTemperature, 0);
        });
      });
    });
  });

  describe('温度设置', () => {
    it('应该正确设置初始温度', () => {
      const targetTemp = 1150;
      model.setInitialTemperature(targetTemp);
      
      const avgTemp = model.getAverageTemperature();
      expect(avgTemp).toBeCloseTo(targetTemp, 0);
    });

    it('应该正确计算平均温度', () => {
      model.setInitialTemperature(500);
      const avg = model.getAverageTemperature();
      expect(avg).toBeGreaterThan(499);
      expect(avg).toBeLessThan(501);
    });

    it('应该正确计算最高温度', () => {
      model.setInitialTemperature(800);
      expect(model.getMaxTemperature()).toBeGreaterThan(799);
    });

    it('应该正确计算最低温度', () => {
      model.setInitialTemperature(300);
      expect(model.getMinTemperature()).toBeLessThan(301);
    });
  });

  describe('热传导模拟', () => {
    it('应该异步执行模拟步骤', async () => {
      model.setInitialTemperature(1000);
      const result = await model.simulateStepAsync();
      expect(result).toBeDefined();
      expect(result.length).toBe(DEFAULT_PARAMS.gridSize);
    });

    it('模拟后温度应该降低（冷却过程）', async () => {
      model.setInitialTemperature(1000);
      const initialAvg = model.getAverageTemperature();
      
      await model.simulateStepAsync();
      const afterAvg = model.getAverageTemperature();
      
      expect(afterAvg).toBeLessThan(initialAvg);
    });

    it('应该返回正确的温度切片', () => {
      const slice = model.getTemperatureSlice(0);
      expect(slice.length).toBe(DEFAULT_PARAMS.gridSize);
      
      const midSlice = model.getTemperatureSlice(Math.floor(DEFAULT_PARAMS.gridSize / 2));
      expect(midSlice.length).toBe(DEFAULT_PARAMS.gridSize);
    });

    it('应该获取所有温度点', () => {
      const allTemps = model.getAllTemperatures();
      expect(allTemps.length).toBe(DEFAULT_PARAMS.gridSize ** 3);
      
      allTemps.forEach(point => {
        expect(point).toHaveProperty('x');
        expect(point).toHaveProperty('y');
        expect(point).toHaveProperty('z');
        expect(point).toHaveProperty('temperature');
      });
    });
  });

  describe('冷却速率计算', () => {
    it('应该正确计算冷却速率', () => {
      const prevTemp = 1000;
      const currentTemp = 900;
      const rate = model.calculateCoolingRate(prevTemp, currentTemp);
      
      expect(rate).toBe((1000 - 900) / DEFAULT_PARAMS.timeStep);
    });

    it('温度升高时冷却速率应该为负值', () => {
      const rate = model.calculateCoolingRate(800, 900);
      expect(rate).toBeLessThan(0);
    });
  });

  describe('应力预测', () => {
    it('应该生成正确数量的应力点', () => {
      model.setInitialTemperature(600);
      const stressPoints = model.predictStressDistribution();
      
      expect(stressPoints.length).toBe(DEFAULT_PARAMS.gridSize ** 3);
    });

    it('每个应力点应该包含必要属性', () => {
      model.setInitialTemperature(600);
      const stressPoints = model.predictStressDistribution();
      
      stressPoints.forEach(point => {
        expect(point).toHaveProperty('x');
        expect(point).toHaveProperty('y');
        expect(point).toHaveProperty('z');
        expect(point).toHaveProperty('stress');
        expect(point).toHaveProperty('principalStress');
        expect(Array.isArray(point.principalStress)).toBe(true);
        expect(point.principalStress.length).toBe(3);
      });
    });

    it('温度越高应力应该越大', () => {
      model.setInitialTemperature(200);
      const lowStress = model.predictStressDistribution();
      const lowAvg = lowStress.reduce((s, p) => s + p.stress, 0) / lowStress.length;

      const model2 = new AsyncHeatConductionModel(DEFAULT_PARAMS);
      model2.setInitialTemperature(1000);
      const highStress = model2.predictStressDistribution();
      const highAvg = highStress.reduce((s, p) => s + p.stress, 0) / highStress.length;

      expect(highAvg).toBeGreaterThan(lowAvg);
    });
  });

  describe('边界条件', () => {
    it('边界点温度应该低于内部点（冷却时）', async () => {
      model.setInitialTemperature(800);
      await model.simulateStepAsync();
      
      const allTemps = model.getAllTemperatures();
      const boundaryTemps: number[] = [];
      const innerTemps: number[] = [];
      
      allTemps.forEach(point => {
        const isBoundary = point.x === 0 || point.x === DEFAULT_PARAMS.gridSize - 1 ||
                          point.y === 0 || point.y === DEFAULT_PARAMS.gridSize - 1 ||
                          point.z === 0 || point.z === DEFAULT_PARAMS.gridSize - 1;
        
        if (isBoundary) {
          boundaryTemps.push(point.temperature);
        } else {
          innerTemps.push(point.temperature);
        }
      });
      
      const boundaryAvg = boundaryTemps.reduce((a, b) => a + b, 0) / boundaryTemps.length;
      const innerAvg = innerTemps.reduce((a, b) => a + b, 0) / innerTemps.length;
      
      expect(boundaryAvg).toBeLessThan(innerAvg);
    });
  });

  describe('参数更新', () => {
    it('应该正确更新参数', () => {
      const newConductivity = 100;
      model.updateParams({ materialConductivity: newConductivity });
      
      model.setInitialTemperature(1000);
      expect(model.getMaxTemperature()).toBeCloseTo(1000, 0);
    });
  });
});
