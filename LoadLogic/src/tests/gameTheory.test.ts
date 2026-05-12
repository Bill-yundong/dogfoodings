import { describe, it, expect } from 'vitest';
import { AsyncGameTheory, createGameTheoryAnalyzer, standardPayoffMatrix } from '$lib/modules/gameTheory';
import { ScenarioType } from '$lib/types';

describe('AsyncGameTheory', () => {
  describe('初始化', () => {
    it('应该能够创建博弈论分析器实例', () => {
      const analyzer = createGameTheoryAnalyzer();
      expect(analyzer).toBeInstanceOf(AsyncGameTheory);
    });

    it('应该能够使用自定义配置', () => {
      const analyzer = new AsyncGameTheory({
        maxIterations: 500,
        convergenceThreshold: 1e-8,
        learningRate: 0.05
      });
      expect(analyzer).toBeInstanceOf(AsyncGameTheory);
    });
  });

  describe('单场景分析', () => {
    it('应该能够分析紧急情况场景', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const result = await analyzer.analyzeScenario(ScenarioType.EMERGENCY, 100);
      expect(result.scenario).toBe(ScenarioType.EMERGENCY);
      expect(result.nashEquilibrium).toBeGreaterThan(0);
      expect(result.nashEquilibrium).toBeLessThan(1);
      expect(result.responseProbability).toBeGreaterThan(0);
      expect(result.responseProbability).toBeLessThanOrEqual(1);
      expect(result.expectedReduction).toBeGreaterThan(0);
      expect(result.householdPayoff).toBeDefined();
      expect(result.vppPayoff).toBeDefined();
      expect(result.convergenceIterations).toBeGreaterThan(0);
    });

    it('应该能够分析可再生能源短缺场景', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const result = await analyzer.analyzeScenario(ScenarioType.RENEWABLE_SHORTAGE, 100);
      expect(result.scenario).toBe(ScenarioType.RENEWABLE_SHORTAGE);
      expect(result.nashEquilibrium).toBeGreaterThan(0);
      expect(result.expectedReduction).toBeGreaterThan(0);
    });

    it('应该能够分析削峰填谷场景', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const result = await analyzer.analyzeScenario(ScenarioType.PEAK_SHAVING, 100);
      expect(result.scenario).toBe(ScenarioType.PEAK_SHAVING);
      expect(result.responseProbability).toBeGreaterThan(0);
    });

    it('应该能够分析市场电价场景', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const result = await analyzer.analyzeScenario(ScenarioType.MARKET_PRICE, 100);
      expect(result.scenario).toBe(ScenarioType.MARKET_PRICE);
    });

    it('应该能够分析电网维护场景', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const result = await analyzer.analyzeScenario(ScenarioType.MAINTENANCE, 100);
      expect(result.scenario).toBe(ScenarioType.MAINTENANCE);
    });
  });

  describe('多场景对比分析', () => {
    it('应该能够同时分析所有场景', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const results = await analyzer.analyzeAllScenarios(100);
      const scenarios = Object.values(ScenarioType);
      expect(Object.keys(results).length).toBe(scenarios.length);
      scenarios.forEach(scenario => {
        expect(results[scenario]).toBeDefined();
      });
    });

    it('紧急情况应该有最高的响应概率', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const results = await analyzer.analyzeAllScenarios(100);
      const probabilities = Object.values(results).map(r => r.responseProbability);
      const maxProb = Math.max(...probabilities);
      expect(results[ScenarioType.EMERGENCY].responseProbability).toBeCloseTo(maxProb);
    });

    it('紧急情况应该有最高的预期削减量', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const results = await analyzer.analyzeAllScenarios(100);
      const reductions = Object.values(results).map(r => r.expectedReduction);
      const maxReduction = Math.max(...reductions);
      expect(results[ScenarioType.EMERGENCY].expectedReduction).toBeCloseTo(maxReduction);
    });

    it('维护场景应该有最低的响应概率', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const results = await analyzer.analyzeAllScenarios(100);
      const probabilities = Object.values(results).map(r => r.responseProbability);
      const minProb = Math.min(...probabilities);
      expect(results[ScenarioType.MAINTENANCE].responseProbability).toBeCloseTo(minProb);
    });
  });

  describe('纳什均衡计算', () => {
    it('应该能够计算标准支付矩阵的纳什均衡', () => {
      const analyzer = createGameTheoryAnalyzer();
      const equilibrium = analyzer.calculateNashEquilibriumForTwoPlayers(standardPayoffMatrix);
      expect(equilibrium.player1).toBeGreaterThanOrEqual(0);
      expect(equilibrium.player1).toBeLessThanOrEqual(1);
      expect(equilibrium.player2).toBeGreaterThanOrEqual(0);
      expect(equilibrium.player2).toBeLessThanOrEqual(1);
    });

    it('纳什均衡应该在合理范围内', () => {
      const analyzer = createGameTheoryAnalyzer();
      const equilibrium = analyzer.calculateNashEquilibriumForTwoPlayers(standardPayoffMatrix);
      expect(equilibrium.player1).toBeGreaterThan(0.3);
      expect(equilibrium.player1).toBeLessThan(0.7);
    });
  });

  describe('演化稳定策略', () => {
    it('应该能够生成演化稳定策略种群', () => {
      const analyzer = createGameTheoryAnalyzer();
      const population = analyzer.generateEvolutionaryStableStrategy(50, 100);
      expect(population.length).toBe(50);
      population.forEach(strategy => {
        expect(strategy).toBeGreaterThanOrEqual(0);
        expect(strategy).toBeLessThanOrEqual(1);
      });
    });

    it('演化策略应该具有合理的分布', () => {
      const analyzer = createGameTheoryAnalyzer();
      const population = analyzer.generateEvolutionaryStableStrategy(100, 200);
      const avgStrategy = population.reduce((sum, s) => sum + s, 0) / population.length;
      expect(avgStrategy).toBeGreaterThan(0.3);
      expect(avgStrategy).toBeLessThan(0.7);
    });
  });

  describe('收敛特性', () => {
    it('应该在合理迭代次数内收敛', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const result = await analyzer.analyzeScenario(ScenarioType.EMERGENCY, 100);
      expect(result.convergenceIterations).toBeLessThan(1000);
    });

    it('不同场景应该有不同的收敛特性', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const results = await analyzer.analyzeAllScenarios(100);
      const iterations = Object.values(results).map(r => r.convergenceIterations);
      const allSame = iterations.every(i => i === iterations[0]);
      expect(allSame).toBe(false);
    });
  });

  describe('家庭数量影响分析', () => {
    it('家庭数量越多预期削减量应该越大', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const resultSmall = await analyzer.analyzeScenario(ScenarioType.PEAK_SHAVING, 10);
      const resultLarge = await analyzer.analyzeScenario(ScenarioType.PEAK_SHAVING, 1000);
      expect(resultLarge.expectedReduction).toBeGreaterThan(resultSmall.expectedReduction);
    });

    it('家庭数量不应该显著影响纳什均衡', async () => {
      const analyzer = createGameTheoryAnalyzer();
      const resultSmall = await analyzer.analyzeScenario(ScenarioType.PEAK_SHAVING, 10);
      const resultLarge = await analyzer.analyzeScenario(ScenarioType.PEAK_SHAVING, 1000);
      const diff = Math.abs(resultSmall.nashEquilibrium - resultLarge.nashEquilibrium);
      expect(diff).toBeLessThan(0.1);
    });
  });
});
