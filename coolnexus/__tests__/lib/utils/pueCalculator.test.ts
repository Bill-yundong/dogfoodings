import { calculatePUE, calculatePUEStats, getPUEColor, getPUEBackgroundColor } from '@/lib/utils/pueCalculator';
import { PowerSnapshot } from '@/lib/types/datacenter';

describe('PUE Calculator', () => {
  describe('calculatePUE 函数测试', () => {
    it('应该正确计算 PUE 值', () => {
      const itPower = 1000;
      const coolingPower = 400;
      const otherPower = 100;
      
      const pue = calculatePUE(itPower, coolingPower, otherPower);
      expect(pue).toBe((1000 + 400 + 100) / 1000);
    });

    it('当 otherPower 为 0 时应该正确计算', () => {
      const itPower = 1000;
      const coolingPower = 400;
      
      const pue = calculatePUE(itPower, coolingPower);
      expect(pue).toBe(1.4);
    });

    it('PUE 应该总是大于等于 1', () => {
      expect(calculatePUE(1000, 0)).toBe(1);
      expect(calculatePUE(1000, 500)).toBe(1.5);
      expect(calculatePUE(500, 1000)).toBe(3);
    });

    it('当 IT 功率为 0 时应该返回 1', () => {
      const pue = calculatePUE(0, 500);
      expect(pue).toBe(1);
    });

    it('应该正确处理大数值', () => {
      const itPower = 1000000;
      const coolingPower = 500000;
      
      const pue = calculatePUE(itPower, coolingPower);
      expect(pue).toBe(1.5);
    });

    it('应该正确处理小数值', () => {
      const itPower = 10;
      const coolingPower = 5;
      
      const pue = calculatePUE(itPower, coolingPower);
      expect(pue).toBe(1.5);
    });
  });

  describe('calculatePUEStats 函数测试', () => {
    const createSnapshots = (count: number, basePUE: number): PowerSnapshot[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `snapshot-${i}`,
        timestamp: Date.now() - (count - i) * 60000,
        totalITPower: 1000,
        totalCoolingPower: 1000 * (basePUE - 1),
        totalPower: 1000 * basePUE,
        pue: basePUE,
        rackPowers: [],
        acPowers: [],
      }));
    };

    it('空快照列表应该返回默认值', () => {
      const stats = calculatePUEStats([]);
      
      expect(stats.currentPUE).toBe(1);
      expect(stats.targetPUE).toBe(1.4);
      expect(stats.dailyAverage).toBe(1);
      expect(stats.weeklyAverage).toBe(1);
      expect(stats.monthlyAverage).toBe(1);
      expect(stats.trend).toBe('stable');
    });

    it('应该正确计算当前 PUE', () => {
      const snapshots = createSnapshots(5, 1.4);
      const stats = calculatePUEStats(snapshots);
      
      expect(stats.currentPUE).toBe(1.4);
    });

    it('应该正确计算日平均值', () => {
      const snapshots = createSnapshots(10, 1.4);
      const stats = calculatePUEStats(snapshots);
      
      expect(stats.dailyAverage).toBe(1.4);
    });

    it('应该正确计算周平均值', () => {
      const snapshots = createSnapshots(20, 1.4);
      const stats = calculatePUEStats(snapshots);
      
      expect(stats.weeklyAverage).toBe(1.4);
    });

    it('应该正确计算月平均值', () => {
      const snapshots = createSnapshots(30, 1.4);
      const stats = calculatePUEStats(snapshots);
      
      expect(stats.monthlyAverage).toBe(1.4);
    });

    it('应该正确识别改善趋势', () => {
      const snapshots: PowerSnapshot[] = [];
      for (let i = 0; i < 10; i++) {
        snapshots.push({
          id: `snapshot-${i}`,
          timestamp: Date.now() - (10 - i) * 60000,
          totalITPower: 1000,
          totalCoolingPower: 1000 * (1.8 - i * 0.05),
          totalPower: 1000 * (1.8 - i * 0.05),
          pue: 1.8 - i * 0.05,
          rackPowers: [],
          acPowers: [],
        });
      }
      
      const stats = calculatePUEStats(snapshots);
      expect(stats.trend).toBe('improving');
    });

    it('应该正确识别恶化趋势', () => {
      const snapshots: PowerSnapshot[] = [];
      for (let i = 0; i < 10; i++) {
        snapshots.push({
          id: `snapshot-${i}`,
          timestamp: Date.now() - (10 - i) * 60000,
          totalITPower: 1000,
          totalCoolingPower: 1000 * (1.2 + i * 0.05),
          totalPower: 1000 * (1.2 + i * 0.05),
          pue: 1.2 + i * 0.05,
          rackPowers: [],
          acPowers: [],
        });
      }
      
      const stats = calculatePUEStats(snapshots);
      expect(stats.trend).toBe('worsening');
    });

    it('应该正确识别稳定趋势', () => {
      const snapshots = createSnapshots(10, 1.4);
      const stats = calculatePUEStats(snapshots);
      
      expect(stats.trend).toBe('stable');
    });

    it('目标 PUE 应该始终为 1.4', () => {
      const snapshots = createSnapshots(5, 1.6);
      const stats = calculatePUEStats(snapshots);
      
      expect(stats.targetPUE).toBe(1.4);
    });

    it('应该正确处理变化的 PUE 值', () => {
      const snapshots: PowerSnapshot[] = [
        { id: '1', timestamp: Date.now() - 300000, totalITPower: 1000, totalCoolingPower: 600, totalPower: 1600, pue: 1.6, rackPowers: [], acPowers: [] },
        { id: '2', timestamp: Date.now() - 240000, totalITPower: 1000, totalCoolingPower: 550, totalPower: 1550, pue: 1.55, rackPowers: [], acPowers: [] },
        { id: '3', timestamp: Date.now() - 180000, totalITPower: 1000, totalCoolingPower: 500, totalPower: 1500, pue: 1.5, rackPowers: [], acPowers: [] },
        { id: '4', timestamp: Date.now() - 120000, totalITPower: 1000, totalCoolingPower: 450, totalPower: 1450, pue: 1.45, rackPowers: [], acPowers: [] },
        { id: '5', timestamp: Date.now() - 60000, totalITPower: 1000, totalCoolingPower: 400, totalPower: 1400, pue: 1.4, rackPowers: [], acPowers: [] },
      ];
      
      const stats = calculatePUEStats(snapshots);
      expect(stats.currentPUE).toBe(1.4);
      expect(stats.dailyAverage).toBe((1.6 + 1.55 + 1.5 + 1.45 + 1.4) / 5);
    });
  });

  describe('getPUEColor 函数测试', () => {
    it('PUE < 1.3 应该返回绿色', () => {
      expect(getPUEColor(1.2)).toBe('text-green-400');
      expect(getPUEColor(1.0)).toBe('text-green-400');
    });

    it('1.3 <= PUE < 1.5 应该返回黄色', () => {
      expect(getPUEColor(1.3)).toBe('text-yellow-400');
      expect(getPUEColor(1.4)).toBe('text-yellow-400');
    });

    it('1.5 <= PUE < 1.8 应该返回橙色', () => {
      expect(getPUEColor(1.5)).toBe('text-orange-400');
      expect(getPUEColor(1.6)).toBe('text-orange-400');
      expect(getPUEColor(1.7)).toBe('text-orange-400');
    });

    it('PUE >= 1.8 应该返回红色', () => {
      expect(getPUEColor(1.8)).toBe('text-red-400');
      expect(getPUEColor(2.0)).toBe('text-red-400');
      expect(getPUEColor(3.0)).toBe('text-red-400');
    });
  });

  describe('getPUEBackgroundColor 函数测试', () => {
    it('PUE < 1.3 应该返回绿色背景', () => {
      expect(getPUEBackgroundColor(1.2)).toBe('bg-green-500/20');
      expect(getPUEBackgroundColor(1.0)).toBe('bg-green-500/20');
    });

    it('1.3 <= PUE < 1.5 应该返回黄色背景', () => {
      expect(getPUEBackgroundColor(1.3)).toBe('bg-yellow-500/20');
      expect(getPUEBackgroundColor(1.4)).toBe('bg-yellow-500/20');
    });

    it('1.5 <= PUE < 1.8 应该返回橙色背景', () => {
      expect(getPUEBackgroundColor(1.5)).toBe('bg-orange-500/20');
      expect(getPUEBackgroundColor(1.6)).toBe('bg-orange-500/20');
    });

    it('PUE >= 1.8 应该返回红色背景', () => {
      expect(getPUEBackgroundColor(1.8)).toBe('bg-red-500/20');
      expect(getPUEBackgroundColor(2.0)).toBe('bg-red-500/20');
    });
  });

  describe('边界条件测试', () => {
    it('PUE = 1 应该正确处理', () => {
      expect(calculatePUE(1000, 0)).toBe(1);
      expect(getPUEColor(1)).toBe('text-green-400');
    });

    it('非常高的 PUE 值应该被标记为红色', () => {
      expect(getPUEColor(10)).toBe('text-red-400');
    });

    it('应该正确处理浮点数精度问题', () => {
      const pue = calculatePUE(100, 33);
      expect(pue).toBeCloseTo(1.33, 2);
    });
  });

  describe('颜色映射一致性测试', () => {
    const testCases = [
      { pue: 1.0, expectedColor: 'text-green-400', expectedBg: 'bg-green-500/20' },
      { pue: 1.2, expectedColor: 'text-green-400', expectedBg: 'bg-green-500/20' },
      { pue: 1.3, expectedColor: 'text-yellow-400', expectedBg: 'bg-yellow-500/20' },
      { pue: 1.4, expectedColor: 'text-yellow-400', expectedBg: 'bg-yellow-500/20' },
      { pue: 1.5, expectedColor: 'text-orange-400', expectedBg: 'bg-orange-500/20' },
      { pue: 1.7, expectedColor: 'text-orange-400', expectedBg: 'bg-orange-500/20' },
      { pue: 1.8, expectedColor: 'text-red-400', expectedBg: 'bg-red-500/20' },
      { pue: 2.0, expectedColor: 'text-red-400', expectedBg: 'bg-red-500/20' },
    ];

    testCases.forEach(({ pue, expectedColor, expectedBg }) => {
      it(`PUE ${pue} 应该返回一致的颜色映射`, () => {
        expect(getPUEColor(pue)).toBe(expectedColor);
        expect(getPUEBackgroundColor(pue)).toBe(expectedBg);
      });
    });
  });
});
