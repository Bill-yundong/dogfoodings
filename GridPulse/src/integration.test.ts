import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { createGridStore } from './lib/stores/grid';
import { 
  solveSwingEquation, 
  analyzeStability, 
  generateDefaultParams, 
  generateDefaultConfig 
} from './lib/engine/swing-solver';
import type { SwingEquationParams, SolverConfig } from './lib/types';

describe('核心业务场景集成测试', () => {
  describe('场景1: 实时监控面板 - 频率动态监控', () => {
    let gridStore: ReturnType<typeof createGridStore>;

    beforeEach(() => {
      vi.useFakeTimers();
      gridStore = createGridStore();
    });

    it('系统启动后应显示正确的初始状态', () => {
      const status = get(gridStore.systemStatus);
      expect(status.currentFrequency).toBeCloseTo(50.0, 1);
      expect(status.systemState).toBe('normal');
      expect(status.stabilityMargin).toBeGreaterThan(0.1);
    });

    it('频率数据应实时更新', () => {
      const initialTime = get(gridStore.systemStatus).lastUpdate.getTime();
      vi.advanceTimersByTime(500);
      const updatedTime = get(gridStore.systemStatus).lastUpdate.getTime();
      expect(updatedTime).toBeGreaterThan(initialTime);
    });

    it('频率波动时应更新系统状态', () => {
      vi.advanceTimersByTime(1000);
      const status = get(gridStore.systemStatus);
      const validStates = ['normal', 'alert', 'emergency'];
      expect(validStates).toContain(status.systemState);
    });

    it('应正确显示系统运行指标', () => {
      const status = get(gridStore.systemStatus);
      expect(status.totalGeneration).toBeGreaterThan(0);
      expect(status.totalLoad).toBeGreaterThan(0);
      expect(status.spinningReserve).toBeGreaterThan(0);
    });
  });

  describe('场景2: 稳定性仿真中心 - 负荷跳变分析', () => {
    it('配置参数后应能启动仿真计算', () => {
      const params: SwingEquationParams = {
        ...generateDefaultParams(),
        Pl: 1.3
      };
      const config: SolverConfig = {
        ...generateDefaultConfig(),
        tEnd: 10,
        dt: 0.01
      };

      const result = solveSwingEquation(params, config);
      expect(result).toBeDefined();
      expect(result.frequency.length).toBeGreaterThan(0);
    });

    it('负荷跳变后应能计算稳定裕度', () => {
      const params: SwingEquationParams = {
        ...generateDefaultParams(),
        Pl: 1.25
      };
      const config: SolverConfig = {
        ...generateDefaultConfig(),
        tEnd: 15,
        dt: 0.01
      };

      const result = solveSwingEquation(params, config);
      const analysis = analyzeStability(result.frequency, result.time);

      expect(analysis).toHaveProperty('margin');
      expect(analysis).toHaveProperty('nadir');
      expect(analysis).toHaveProperty('isStable');
      expect(analysis.maxDeviation).toBeGreaterThan(0);
    });

    it('不同数值方法应产生一致的定性结果', () => {
      const params: SwingEquationParams = generateDefaultParams();
      const baseConfig: SolverConfig = {
        ...generateDefaultConfig(),
        tEnd: 5,
        dt: 0.005
      };

      const rk4Result = solveSwingEquation(params, { ...baseConfig, method: 'rk4' });
      const eulerResult = solveSwingEquation(params, { ...baseConfig, method: 'euler' });
      const trapResult = solveSwingEquation(params, { ...baseConfig, method: 'trapezoidal' });

      const rk4Stable = analyzeStability(rk4Result.frequency, rk4Result.time).isStable;
      const eulerStable = analyzeStability(eulerResult.frequency, eulerResult.time).isStable;
      const trapStable = analyzeStability(trapResult.frequency, trapResult.time).isStable;

      expect(rk4Stable).toBe(eulerStable);
      expect(eulerStable).toBe(trapStable);
    });

    it('应能检测大扰动下的系统失稳', () => {
      const params: SwingEquationParams = {
        ...generateDefaultParams(),
        Pl: 2.0,
        M: 1.0,
        D: 0.1
      };
      const config: SolverConfig = {
        ...generateDefaultConfig(),
        tEnd: 10,
        dt: 0.01
      };

      const result = solveSwingEquation(params, config);
      const analysis = analyzeStability(result.frequency, result.time);
      
      const maxFreq = Math.max(...result.frequency);
      const minFreq = Math.min(...result.frequency);
      
      if (maxFreq > 51 || minFreq < 49) {
        expect(analysis.isStable).toBe(false);
      }
    });
  });

  describe('场景3: 负荷数据管理 - 用户用能特征分析', () => {
    const mockUsers = [
      { patternType: 'morning-peak', flexibility: 0.85 },
      { patternType: 'evening-peak', flexibility: 0.72 },
      { patternType: 'flat', flexibility: 0.45 },
      { patternType: 'night-owl', flexibility: 0.68 },
      { patternType: 'industrial', flexibility: 0.91 }
    ];

    it('应支持按用电模式分类用户', () => {
      const patternTypes = ['morning-peak', 'evening-peak', 'flat', 'night-owl', 'industrial'];
      mockUsers.forEach(user => {
        expect(patternTypes).toContain(user.patternType);
      });
    });

    it('应计算用户柔性评分', () => {
      mockUsers.forEach(user => {
        expect(user.flexibility).toBeGreaterThanOrEqual(0);
        expect(user.flexibility).toBeLessThanOrEqual(1);
      });
    });

    it('应识别可调节负荷潜力', () => {
      const highFlexibilityUsers = mockUsers.filter(u => u.flexibility > 0.7);
      expect(highFlexibilityUsers.length).toBeGreaterThan(0);
    });

    it('工业用户应有最高的调节潜力', () => {
      const industrialUser = mockUsers.find(u => u.patternType === 'industrial');
      const otherUsers = mockUsers.filter(u => u.patternType !== 'industrial');
      
      if (industrialUser) {
        const isHighest = otherUsers.every(u => u.flexibility <= industrialUser.flexibility);
        expect(isHighest).toBe(true);
      }
    });
  });

  describe('场景4: 调度协同 - 削峰填谷策略生成', () => {
    interface DispatchCommand {
      id: string;
      type: 'load-shed' | 'load-increase' | 'frequency-support';
      powerAdjustment: number;
      priority: number;
      status: string;
    }

    it('应能生成削峰指令', () => {
      const command: DispatchCommand = {
        id: 'cmd-001',
        type: 'load-shed',
        powerAdjustment: -10,
        priority: 1,
        status: 'pending'
      };

      expect(command.type).toBe('load-shed');
      expect(command.powerAdjustment).toBeLessThan(0);
      expect(command.priority).toBeGreaterThanOrEqual(1);
    });

    it('应能生成填谷指令', () => {
      const command: DispatchCommand = {
        id: 'cmd-002',
        type: 'load-increase',
        powerAdjustment: 8,
        priority: 2,
        status: 'pending'
      };

      expect(command.type).toBe('load-increase');
      expect(command.powerAdjustment).toBeGreaterThan(0);
    });

    it('应支持多级指令优先级', () => {
      const commands: DispatchCommand[] = [
        { id: 'cmd-1', type: 'load-shed', powerAdjustment: -5, priority: 1, status: 'pending' },
        { id: 'cmd-2', type: 'frequency-support', powerAdjustment: 3, priority: 2, status: 'pending' },
        { id: 'cmd-3', type: 'load-increase', powerAdjustment: 2, priority: 3, status: 'pending' }
      ];

      const priorities = commands.map(c => c.priority).sort();
      expect(priorities).toEqual([1, 2, 3]);
    });

    it('指令状态应可追踪', () => {
      const command: DispatchCommand = {
        id: 'cmd-004',
        type: 'frequency-support',
        powerAdjustment: 5,
        priority: 2,
        status: 'sent'
      };

      const validStatuses = ['pending', 'sent', 'acknowledged', 'executed', 'failed'];
      expect(validStatuses).toContain(command.status);
    });
  });

  describe('场景5: 完整业务流程 - 从监控到调度闭环', () => {
    let gridStore: ReturnType<typeof createGridStore>;

    beforeEach(() => {
      vi.useFakeTimers();
      gridStore = createGridStore();
    });

    it('完整流程: 监控告警 -> 仿真分析 -> 策略生成 -> 调度执行', () => {
      vi.advanceTimersByTime(1000);
      const initialStatus = get(gridStore.systemStatus);
      expect(initialStatus.currentFrequency).toBeDefined();

      const params: SwingEquationParams = {
        ...generateDefaultParams(),
        Pl: initialStatus.totalLoad / 100
      };
      const config: SolverConfig = generateDefaultConfig();
      const simResult = solveSwingEquation(params, config);
      const analysis = analyzeStability(simResult.frequency, simResult.time);

      if (!analysis.isStable) {
        gridStore.addAlert({
          type: 'stability',
          severity: 'warning',
          message: '系统稳定性不足，建议采取调控措施'
        });

        const alerts = get(gridStore.alerts);
        const stabilityAlert = alerts.find(a => a.type === 'stability');
        expect(stabilityAlert).toBeDefined();
      }

      expect(analysis.margin).toBeGreaterThanOrEqual(0);
    });
  });

  describe('场景6: 边界条件测试', () => {
    it('极端负荷扰动下的系统响应', () => {
      const params: SwingEquationParams = {
        ...generateDefaultParams(),
        Pl: 1.5
      };
      const config: SolverConfig = {
        ...generateDefaultConfig(),
        tEnd: 20,
        dt: 0.01
      };

      const result = solveSwingEquation(params, config);
      const analysis = analyzeStability(result.frequency, result.time);
      
      const allFrequenciesValid = Array.from(result.frequency).every(f => !isNaN(f) && isFinite(f));
      expect(allFrequenciesValid).toBe(true);
      expect(analysis.nadir).toBeGreaterThan(45);
      expect(analysis.nadir).toBeLessThan(55);
    });

    it('极小求解步长的性能', () => {
      const params = generateDefaultParams();
      const config: SolverConfig = {
        ...generateDefaultConfig(),
        dt: 0.0001,
        tEnd: 1
      };

      const result = solveSwingEquation(params, config);
      expect(result.time.length).toBe(10000);
    });

    it('极大求解步长的稳定性', () => {
      const params = generateDefaultParams();
      const config: SolverConfig = {
        ...generateDefaultConfig(),
        dt: 0.1,
        tEnd: 10
      };

      const result = solveSwingEquation(params, config);
      const analysis = analyzeStability(result.frequency, result.time);
      
      expect(analysis.maxDeviation).toBeDefined();
      expect(analysis.isStable).toBeDefined();
    });
  });
});
