import { describe, it, expect, vi } from 'vitest';
import { 
  solveSwingEquation, 
  analyzeStability, 
  generateDefaultParams, 
  generateDefaultConfig 
} from './swing-solver';
import type { SwingEquationParams, SolverConfig } from '$lib/types';

describe('摆动方程求解器', () => {
  describe('默认参数生成', () => {
    it('应生成正确的默认参数', () => {
      const params = generateDefaultParams();
      expect(params.M).toBe(4.0);
      expect(params.D).toBe(1.5);
      expect(params.Pm).toBe(1.0);
      expect(params.Pl).toBe(1.0);
      expect(params.E).toBe(1.05);
      expect(params.V).toBe(1.0);
      expect(params.X).toBe(0.5);
      expect(params.delta0).toBeCloseTo(0.5236);
      expect(params.omega0).toBe(0);
    });

    it('应生成正确的默认配置', () => {
      const config = generateDefaultConfig();
      expect(config.method).toBe('rk4');
      expect(config.dt).toBe(0.001);
      expect(config.tEnd).toBe(20);
    });
  });

  describe('方程求解 - RK4 方法', () => {
    const params: SwingEquationParams = {
      ...generateDefaultParams(),
      Pl: 1.2
    };
    const config: SolverConfig = {
      ...generateDefaultConfig(),
      tEnd: 5,
      dt: 0.01
    };

    it('应返回正确的结果结构', () => {
      const result = solveSwingEquation(params, config);
      expect(result).toHaveProperty('time');
      expect(result).toHaveProperty('delta');
      expect(result).toHaveProperty('omega');
      expect(result).toHaveProperty('frequency');
      expect(result).toHaveProperty('pe');
    });

    it('返回数组长度应匹配时间步数', () => {
      const result = solveSwingEquation(params, config);
      const expectedSteps = Math.ceil(config.tEnd / config.dt);
      expect(result.time.length).toBe(expectedSteps);
      expect(result.delta.length).toBe(expectedSteps);
      expect(result.omega.length).toBe(expectedSteps);
      expect(result.frequency.length).toBe(expectedSteps);
      expect(result.pe.length).toBe(expectedSteps);
    });

    it('初始条件应正确设置', () => {
      const result = solveSwingEquation(params, config);
      expect(result.time[0]).toBe(0);
      expect(result.delta[0]).toBeCloseTo(params.delta0, 5);
      expect(result.omega[0]).toBeCloseTo(params.omega0, 5);
    });

    it('应报告进度回调', () => {
      const onProgress = vi.fn();
      solveSwingEquation(params, config, onProgress);
      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(100);
    });
  });

  describe('方程求解 - 欧拉法', () => {
    const params: SwingEquationParams = generateDefaultParams();
    const config: SolverConfig = {
      ...generateDefaultConfig(),
      method: 'euler',
      tEnd: 2,
      dt: 0.01
    };

    it('应使用欧拉法正确求解', () => {
      const result = solveSwingEquation(params, config);
      expect(result.frequency.length).toBeGreaterThan(0);
      expect(result.time[0]).toBe(0);
    });
  });

  describe('方程求解 - 梯形法', () => {
    const params: SwingEquationParams = generateDefaultParams();
    const config: SolverConfig = {
      ...generateDefaultConfig(),
      method: 'trapezoidal',
      tEnd: 2,
      dt: 0.01
    };

    it('应使用梯形法正确求解', () => {
      const result = solveSwingEquation(params, config);
      expect(result.frequency.length).toBeGreaterThan(0);
      expect(result.time[0]).toBe(0);
    });
  });

  describe('稳定性分析', () => {
    it('应正确识别稳定系统', () => {
      const time = new Float64Array(1000);
      const frequency = new Float64Array(1000);
      
      for (let i = 0; i < 1000; i++) {
        time[i] = i * 0.01;
        frequency[i] = 50 + Math.exp(-i / 100) * Math.sin(i / 20) * 0.1;
      }

      const analysis = analyzeStability(frequency, time);
      expect(analysis.isStable).toBe(true);
      expect(analysis.nadir).toBeLessThan(50.1);
      expect(analysis.nadir).toBeGreaterThan(49.9);
    });

    it('应正确识别不稳定系统', () => {
      const time = new Float64Array(1000);
      const frequency = new Float64Array(1000);
      
      for (let i = 0; i < 1000; i++) {
        time[i] = i * 0.01;
        frequency[i] = 50 + Math.exp(i / 200) * Math.sin(i / 20) * 0.05;
      }

      const analysis = analyzeStability(frequency, time);
      expect(analysis.isStable).toBe(false);
    });

    it('应正确计算稳定裕度', () => {
      const time = new Float64Array(100);
      const frequency = new Float64Array(100);
      
      for (let i = 0; i < 100; i++) {
        time[i] = i * 0.1;
        frequency[i] = 50;
      }

      const analysis = analyzeStability(frequency, time);
      expect(analysis.margin).toBeCloseTo(0.5, 1);
      expect(analysis.maxDeviation).toBe(0);
    });

    it('应正确计算 ROCOF', () => {
      const time = new Float64Array(100);
      const frequency = new Float64Array(100);
      
      for (let i = 0; i < 100; i++) {
        time[i] = i * 0.1;
        frequency[i] = 50 + i * 0.001;
      }

      const analysis = analyzeStability(frequency, time);
      expect(analysis.rocof).toBeCloseTo(0.01, 2);
    });
  });

  describe('负荷跳变场景测试', () => {
    const params: SwingEquationParams = {
      ...generateDefaultParams(),
      Pl: 1.3
    };
    const config: SolverConfig = {
      ...generateDefaultConfig(),
      tEnd: 10,
      dt: 0.01
    };

    it('负荷跳变后频率应先下降然后恢复', () => {
      const result = solveSwingEquation(params, config);
      const preDisturbanceFreq = result.frequency.slice(0, 100);
      const postDisturbanceFreq = result.frequency.slice(100, 200);
      
      const avgPre = preDisturbanceFreq.reduce((a, b) => a + b, 0) / preDisturbanceFreq.length;
      const minPost = Math.min(...postDisturbanceFreq);
      
      expect(minPost).toBeLessThan(avgPre);
    });

    it('应检测到频率最低点', () => {
      const result = solveSwingEquation(params, config);
      const analysis = analyzeStability(result.frequency, result.time);
      
      expect(analysis.nadir).toBeLessThan(50);
      expect(analysis.maxDeviation).toBeGreaterThan(0);
    });
  });

  describe('数值方法对比', () => {
    const params: SwingEquationParams = generateDefaultParams();
    const baseConfig: SolverConfig = {
      ...generateDefaultConfig(),
      tEnd: 5,
      dt: 0.005
    };

    it('三种方法应产生相似结果', () => {
      const rk4Result = solveSwingEquation(params, { ...baseConfig, method: 'rk4' });
      const eulerResult = solveSwingEquation(params, { ...baseConfig, method: 'euler' });
      const trapResult = solveSwingEquation(params, { ...baseConfig, method: 'trapezoidal' });

      expect(rk4Result.frequency.length).toBe(eulerResult.frequency.length);
      expect(rk4Result.frequency.length).toBe(trapResult.frequency.length);

      const rk4FinalFreq = rk4Result.frequency[rk4Result.frequency.length - 1];
      const eulerFinalFreq = eulerResult.frequency[eulerResult.frequency.length - 1];
      const trapFinalFreq = trapResult.frequency[trapResult.frequency.length - 1];

      expect(Math.abs(rk4FinalFreq - eulerFinalFreq)).toBeLessThan(1);
      expect(Math.abs(rk4FinalFreq - trapFinalFreq)).toBeLessThan(1);
    });
  });
});
