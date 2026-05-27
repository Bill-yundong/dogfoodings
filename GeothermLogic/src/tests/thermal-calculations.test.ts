import { describe, it, expect, vi } from 'vitest';
import { calculateThermalBalance, predictThermalDrift } from '@/lib/thermal-calculations';
import type { ThermalBalanceRequest, ThermalDriftRequest } from '@/types';

describe('Thermal Balance Calculations - 热平衡计算核心模块', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('计算功能正确性测试', () => {
    it('应正确计算冬季供热模式下的热平衡', () => {
      const request: ThermalBalanceRequest = {
        boreholeId: 'test-001',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.000Z',
        parameters: {
          groundThermalConductivity: 2.5,
          specificHeatCapacity: 4186,
          fluidFlowRate: 12.5,
          inletTemperature: 8.5,
          outletTemperature: 12.3,
        },
      };

      const result = calculateThermalBalance(request);

      const deltaT = 12.3 - 8.5;
      const expectedHeatExtraction = 12.5 * 4186 * Math.abs(deltaT) * 3.6;
      expect(result.heatExtractionRate).toBeCloseTo(Math.round(expectedHeatExtraction * 100) / 100, 0);
      expect(['stable', 'warning', 'critical']).toContain(result.balanceStatus);
      expect(result.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.efficiency).toBeLessThanOrEqual(100);
    });

    it('应正确识别夏季制冷模式', () => {
      const request: ThermalBalanceRequest = {
        boreholeId: 'test-002',
        startDate: '2024-07-01T00:00:00.000Z',
        endDate: '2024-07-31T23:59:59.000Z',
        parameters: {
          groundThermalConductivity: 2.5,
          specificHeatCapacity: 4186,
          fluidFlowRate: 10.0,
          inletTemperature: 18.0,
          outletTemperature: 20.0,
        },
      };

      const result = calculateThermalBalance(request);

      expect(result.recommendations).toContain('夏季模式：当前为制冷状态，热量正在回灌至土壤');
      expect(result.recommendations).not.toContain('冬季模式：当前为供热状态，注意监测土壤温度下降趋势');
    });

    it('应正确识别冬季供热模式', () => {
      const request: ThermalBalanceRequest = {
        boreholeId: 'test-003',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.000Z',
        parameters: {
          groundThermalConductivity: 2.5,
          specificHeatCapacity: 4186,
          fluidFlowRate: 15.0,
          inletTemperature: 12.0,
          outletTemperature: 8.0,
        },
      };

      const result = calculateThermalBalance(request);

      expect(result.recommendations).toContain('冬季模式：当前为供热状态，注意监测土壤温度下降趋势');
    });

    it('应在低效率时返回 warning 或 critical 状态', () => {
      const request: ThermalBalanceRequest = {
        boreholeId: 'test-004',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.000Z',
        parameters: {
          groundThermalConductivity: 1.0,
          specificHeatCapacity: 1000,
          fluidFlowRate: 5.0,
          inletTemperature: 10.0,
          outletTemperature: 10.5,
        },
      };

      const result = calculateThermalBalance(request);

      expect(['warning', 'critical']).toContain(result.balanceStatus);
      expect(result.recommendations).toContain('建议降低热提取速率以恢复土壤热平衡');
      expect(result.recommendations).toContain('考虑增加热回灌量来补充土壤热量');
    });
  });

  describe('边界条件测试', () => {
    it('效率值应限制在 0-100 范围内', () => {
      for (let i = 0; i < 10; i++) {
        const request: ThermalBalanceRequest = {
          boreholeId: `test-${i}`,
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.000Z',
          parameters: {
            groundThermalConductivity: Math.random() * 5,
            specificHeatCapacity: 1000 + Math.random() * 4000,
            fluidFlowRate: Math.random() * 20,
            inletTemperature: 5 + Math.random() * 20,
            outletTemperature: 5 + Math.random() * 20,
          },
        };

        const result = calculateThermalBalance(request);

        expect(result.efficiency).toBeGreaterThanOrEqual(0);
        expect(result.efficiency).toBeLessThanOrEqual(100);
      }
    });

    it('应在土壤热容量不足时给出建议', () => {
      const request: ThermalBalanceRequest = {
        boreholeId: 'test-005',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.000Z',
        parameters: {
          groundThermalConductivity: 0.5,
          specificHeatCapacity: 4186,
          fluidFlowRate: 20.0,
          inletTemperature: 10.0,
          outletTemperature: 15.0,
        },
      };

      const result = calculateThermalBalance(request);

      expect(result.recommendations).toContain('土壤热容量不足，建议优化运行策略');
    });

    it('应正确处理零温差情况', () => {
      const request: ThermalBalanceRequest = {
        boreholeId: 'test-006',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.000Z',
        parameters: {
          groundThermalConductivity: 2.5,
          specificHeatCapacity: 4186,
          fluidFlowRate: 12.5,
          inletTemperature: 10.0,
          outletTemperature: 10.0,
        },
      };

      const result = calculateThermalBalance(request);

      expect(result.heatExtractionRate).toBe(0);
      expect(result.efficiency).toBe(0);
      expect(result.balanceStatus).toBe('critical');
    });
  });

  describe('状态分类测试', () => {
    it('高导热系数和大温差应产生较高效率', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);
      const request: ThermalBalanceRequest = {
        boreholeId: 'test-stable',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.000Z',
        parameters: {
          groundThermalConductivity: 3.0,
          specificHeatCapacity: 4186,
          fluidFlowRate: 10.0,
          inletTemperature: 10.0,
          outletTemperature: 12.0,
        },
      };

      const result = calculateThermalBalance(request);
      expect(result.efficiency).toBeGreaterThan(10);
    });

    it('efficiency <= 40 应为 critical 状态', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const request: ThermalBalanceRequest = {
        boreholeId: 'test-critical',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.000Z',
        parameters: {
          groundThermalConductivity: 1.0,
          specificHeatCapacity: 1000,
          fluidFlowRate: 2.0,
          inletTemperature: 10.0,
          outletTemperature: 10.1,
        },
      };

      const result = calculateThermalBalance(request);
      expect(result.balanceStatus).toBe('critical');
    });
  });
});

describe('Thermal Drift Prediction - 热漂移预测核心模块', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('预测模型功能测试', () => {
    it('保守场景下预测10年应保持低风险', () => {
      const request: ThermalDriftRequest = {
        boreholeIds: ['bh-001', 'bh-002'],
        predictionYears: 10,
        scenario: 'conservative',
      };

      const result = predictThermalDrift(request);

      expect(result.status).toBe('completed');
      expect(result.results).toHaveLength(10);
      expect(result.results[0].year).toBe(1);
      expect(result.results[9].year).toBe(10);
      expect(result.results[0].overdrawRisk).toBe('low');
      expect(result.results[9].overdrawRisk).toBe('low');
    });

    it('激进场景下预测30年地温应显著下降', () => {
      const request: ThermalDriftRequest = {
        boreholeIds: ['bh-001'],
        predictionYears: 30,
        scenario: 'aggressive',
      };

      const result = predictThermalDrift(request);

      expect(result.results).toHaveLength(30);

      const firstResult = result.results[0];
      const lastResult = result.results[result.results.length - 1];
      expect(lastResult.groundTemperature).toBeLessThan(firstResult.groundTemperature);
      expect(lastResult.thermalSaturation).toBeLessThan(firstResult.thermalSaturation);
    });

    it('不同场景预测结果应存在显著差异', () => {
      const conservativeRequest: ThermalDriftRequest = {
        boreholeIds: ['bh-001'],
        predictionYears: 20,
        scenario: 'conservative',
      };

      const aggressiveRequest: ThermalDriftRequest = {
        ...conservativeRequest,
        scenario: 'aggressive',
      };

      const conservativeResult = predictThermalDrift(conservativeRequest);
      const aggressiveResult = predictThermalDrift(aggressiveRequest);

      const lastConservative = conservativeResult.results[conservativeResult.results.length - 1];
      const lastAggressive = aggressiveResult.results[aggressiveResult.results.length - 1];

      expect(lastAggressive.groundTemperature).toBeLessThan(lastConservative.groundTemperature);
      expect(lastAggressive.thermalSaturation).toBeLessThan(lastConservative.thermalSaturation);
    });
  });

  describe('预测模型参数验证', () => {
    it('应生成有效的 predictionId', () => {
      const request: ThermalDriftRequest = {
        boreholeIds: ['bh-001'],
        predictionYears: 5,
        scenario: 'moderate',
      };

      const result = predictThermalDrift(request);

      expect(result.predictionId).toBeDefined();
      expect(result.predictionId).toContain('test-uuid-');
    });

    it('模型参数应在合理范围内', () => {
      const request: ThermalDriftRequest = {
        boreholeIds: ['bh-001'],
        predictionYears: 5,
        scenario: 'moderate',
      };

      const result = predictThermalDrift(request);

      expect(result.modelParameters.thermalDiffusivity).toBeGreaterThanOrEqual(0.8);
      expect(result.modelParameters.thermalDiffusivity).toBeLessThanOrEqual(1.2);
      expect(result.modelParameters.geothermalGradient).toBeGreaterThanOrEqual(0.03);
      expect(result.modelParameters.geothermalGradient).toBeLessThanOrEqual(0.04);
      expect(result.modelParameters.heatPumpCoefficient).toBeGreaterThanOrEqual(3.5);
      expect(result.modelParameters.heatPumpCoefficient).toBeLessThanOrEqual(4.0);
    });

    it('地温应逐年下降', () => {
      const request: ThermalDriftRequest = {
        boreholeIds: ['bh-001'],
        predictionYears: 15,
        scenario: 'moderate',
      };

      const result = predictThermalDrift(request);

      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i].groundTemperature).toBeLessThan(result.results[i - 1].groundTemperature);
      }
    });

    it('热饱和度应逐年下降', () => {
      const request: ThermalDriftRequest = {
        boreholeIds: ['bh-001'],
        predictionYears: 15,
        scenario: 'moderate',
      };

      const result = predictThermalDrift(request);

      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i].thermalSaturation).toBeLessThanOrEqual(result.results[i - 1].thermalSaturation);
      }
    });
  });

  describe('风险等级评估测试', () => {
    it('热饱和度 > 70 应为 low 风险', () => {
      const request: ThermalDriftRequest = {
        boreholeIds: ['bh-001'],
        predictionYears: 5,
        scenario: 'conservative',
      };

      const result = predictThermalDrift(request);

      result.results.forEach((r) => {
        if (r.thermalSaturation > 70) {
          expect(r.overdrawRisk).toBe('low');
        }
      });
    });

    it('热饱和度 <= 40 应为 high 风险', () => {
      const request: ThermalDriftRequest = {
        boreholeIds: ['bh-001'],
        predictionYears: 30,
        scenario: 'aggressive',
      };

      const result = predictThermalDrift(request);

      const highRiskResults = result.results.filter((r) => r.thermalSaturation <= 40);
      highRiskResults.forEach((r) => {
        expect(r.overdrawRisk).toBe('high');
      });
    });
  });
});
