import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@solidjs/testing-library';
import type { EnergyStation, WeatherCondition, CommandCenterData } from '../types/energy';
import CommandCenter from '../components/CommandCenter';
import ControlPanel from '../components/ControlPanel';
import { solveMultiEnergyFlow, applyOptimizations } from '../utils/multiEnergyFlow';

describe('综合能源系统集成测试', () => {
  let testStations: EnergyStation[];
  let testWeather: WeatherCondition;
  let testCommandCenterData: CommandCenterData;

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
      {
        id: 'station-003',
        name: '南区能源站',
        location: { lat: 39.8942, lng: 116.4174 },
        balance: {
          cooling: { current: 480, target: 520, capacity: 850, efficiency: 0.80 },
          heating: { current: 350, target: 380, capacity: 650, efficiency: 0.86 },
          electricity: { current: 310, target: 340, capacity: 550, efficiency: 0.88, renewableRatio: 0.38 },
          timestamp: Date.now(),
        },
        status: 'warning',
        lastUpdate: Date.now(),
      },
      {
        id: 'station-004',
        name: '北区能源站',
        location: { lat: 39.9242, lng: 116.3874 },
        balance: {
          cooling: { current: 420, target: 480, capacity: 750, efficiency: 0.87 },
          heating: { current: 290, target: 320, capacity: 550, efficiency: 0.90 },
          electricity: { current: 260, target: 290, capacity: 480, efficiency: 0.94, renewableRatio: 0.45 },
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

    testCommandCenterData = {
      stations: testStations,
      totalBalance: {
        cooling: { current: 1870, target: 2050, capacity: 3300, efficiency: 0.835 },
        heating: { current: 1340, target: 1450, capacity: 2500, efficiency: 0.8725 },
        electricity: { current: 1200, target: 1310, capacity: 2130, efficiency: 0.91, renewableRatio: 0.40 },
        timestamp: Date.now(),
      },
      carbonEmission: 456.5,
      carbonReduction: 89.2,
      efficiencyScore: 78.5,
      lastAlignment: Date.now(),
    };
  });

  describe('场景1: 指挥中心数据对齐功能', () => {
    it('应正确渲染指挥中心主界面', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      expect(getByText('🏙️ 智慧城区能源指挥中心')).toBeInTheDocument();
    });

    it('应正确显示总制冷负荷统计', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      expect(getByText('总制冷负荷')).toBeInTheDocument();
      expect(getByText('1870')).toBeInTheDocument();
    });

    it('应正确显示总供热负荷统计', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      expect(getByText('总供热负荷')).toBeInTheDocument();
      expect(getByText('1340')).toBeInTheDocument();
    });

    it('应正确显示总电力负荷统计', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      expect(getByText('总电力负荷')).toBeInTheDocument();
      expect(getByText('1200')).toBeInTheDocument();
    });

    it('应正确显示碳排放监控数据', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      expect(getByText('🌍 碳排放监控')).toBeInTheDocument();
      expect(getByText('456.5')).toBeInTheDocument();
      expect(getByText('89.2')).toBeInTheDocument();
    });

    it('应正确显示气象条件数据', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      expect(getByText('🌤️ 气象条件')).toBeInTheDocument();
      expect(getByText('28.0°C')).toBeInTheDocument();
      expect(getByText('65.0%')).toBeInTheDocument();
      expect(getByText('450')).toBeInTheDocument();
      expect(getByText('3.5 m/s')).toBeInTheDocument();
    });

    it('应正确显示多能互补态势', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      expect(getByText('🔄 多能互补态势')).toBeInTheDocument();
      expect(getByText('✅ 系统运行正常')).toBeInTheDocument();
    });

    it('应正确渲染所有能源站卡片', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      testStations.forEach((station) => {
        expect(getByText(station.name)).toBeInTheDocument();
      });
    });
  });

  describe('场景2: 多能源潮流优化全流程', () => {
    it('优化算法应能处理完整的4站系统', async () => {
      const result = await solveMultiEnergyFlow(testStations, testWeather);
      
      expect(result).toBeDefined();
      expect(result.optimizations).toHaveLength(4);
      expect(result.convergence).toBe(true);
      expect(result.totalEfficiency).toBeGreaterThan(0);
      expect(result.carbonSaved).toBeGreaterThan(0);
    });

    it('优化后应能正确应用到所有能源站', async () => {
      const result = await solveMultiEnergyFlow(testStations, testWeather);
      const optimizedStations = applyOptimizations(testStations, result.optimizations);
      
      expect(optimizedStations).toHaveLength(4);
      optimizedStations.forEach((station) => {
        expect(station.balance.cooling.current).toBeGreaterThanOrEqual(0);
        expect(station.balance.heating.current).toBeGreaterThanOrEqual(0);
        expect(station.balance.electricity.current).toBeGreaterThanOrEqual(0);
      });
    });

    it('优化应提升系统综合效率', async () => {
      const result = await solveMultiEnergyFlow(testStations, testWeather);
      expect(result.totalEfficiency).toBeGreaterThan(0.7);
    });

    it('优化应产生正向碳减排效果', async () => {
      const result = await solveMultiEnergyFlow(testStations, testWeather);
      expect(result.carbonSaved).toBeGreaterThan(0);
    });

    it('所有优化结果应满足约束条件', async () => {
      const result = await solveMultiEnergyFlow(testStations, testWeather);
      
      result.optimizations.forEach((opt) => {
        expect(opt.constraintsSatisfied).toBe(true);
        expect(Math.abs(opt.adjustments.cooling)).toBeLessThanOrEqual(0.2);
        expect(Math.abs(opt.adjustments.heating)).toBeLessThanOrEqual(0.2);
        expect(Math.abs(opt.adjustments.electricity)).toBeLessThanOrEqual(0.15);
      });
    });
  });

  describe('场景3: 极端气象条件下的系统适应性', () => {
    it('夏季极端高温下系统应能正常优化', async () => {
      const extremeHeat: WeatherCondition = {
        ...testWeather,
        temperature: 42,
        humidity: 80,
        solarRadiation: 950,
      };
      
      const result = await solveMultiEnergyFlow(testStations, extremeHeat);
      expect(result.convergence).toBe(true);
      expect(result.optimizations).toHaveLength(4);
    });

    it('冬季极端低温下系统应能正常优化', async () => {
      const extremeCold: WeatherCondition = {
        ...testWeather,
        temperature: -15,
        humidity: 30,
        solarRadiation: 100,
        windSpeed: 12,
      };
      
      const result = await solveMultiEnergyFlow(testStations, extremeCold);
      expect(result.convergence).toBe(true);
      expect(result.optimizations).toHaveLength(4);
    });

    it('台风天气(高风速)下系统应能正常优化', async () => {
      const typhoonWeather: WeatherCondition = {
        ...testWeather,
        temperature: 22,
        humidity: 95,
        windSpeed: 25,
      };
      
      const result = await solveMultiEnergyFlow(testStations, typhoonWeather);
      expect(result.convergence).toBe(true);
      expect(result.optimizations).toHaveLength(4);
    });
  });

  describe('场景4: 低碳运行指标验证', () => {
    it('系统应计算并显示碳减排量', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      expect(getByText('碳减排量')).toBeInTheDocument();
      expect(getByText('89.2')).toBeInTheDocument();
    });

    it('系统应计算并显示减排率', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      expect(getByText('减排率')).toBeInTheDocument();
    });

    it('系统应显示综合效率评分', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      expect(getByText('系统综合效率')).toBeInTheDocument();
      expect(getByText('78.5')).toBeInTheDocument();
    });

    it('各能源站应显示可再生能源比例', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      testStations.forEach((station) => {
        const ratio = (station.balance.electricity.renewableRatio * 100).toFixed(1);
        expect(getByText(`可再生: ${ratio}%`)).toBeInTheDocument();
      });
    });
  });

  describe('场景5: 系统状态与数据更新机制', () => {
    it('应显示数据对齐时间', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      expect(getByText('数据对齐时间')).toBeInTheDocument();
    });

    it('各能源站应显示最后更新时间', () => {
      const { getAllByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      const updateLabels = getAllByText(/最后更新:/);
      expect(updateLabels.length).toBeGreaterThan(0);
    });

    it('控制面板应正确渲染', () => {
      const { getByText } = render(() => <ControlPanel />);
      
      expect(getByText('🎛️ 系统控制')).toBeInTheDocument();
      expect(getByText('🚀 执行多能源潮流优化')).toBeInTheDocument();
      expect(getByText('🔄 数据对齐')).toBeInTheDocument();
      expect(getByText('💾 保存快照')).toBeInTheDocument();
    });

    it('控制面板应显示气象参数调节', () => {
      const { getByText } = render(() => <ControlPanel />);
      
      expect(getByText('🌤️ 气象参数调节')).toBeInTheDocument();
      expect(getByText('🌡️ 温度')).toBeInTheDocument();
      expect(getByText('💧 湿度')).toBeInTheDocument();
      expect(getByText('☀️ 太阳辐射')).toBeInTheDocument();
      expect(getByText('🌬️ 风速')).toBeInTheDocument();
    });

    it('控制面板应显示系统状态信息', () => {
      const { getByText } = render(() => <ControlPanel />);
      
      expect(getByText('⚙️ 系统状态')).toBeInTheDocument();
      expect(getByText('实时对齐')).toBeInTheDocument();
      expect(getByText('数据模拟')).toBeInTheDocument();
      expect(getByText('运行中')).toBeInTheDocument();
    });
  });

  describe('场景6: 混合状态能源站协同', () => {
    it('包含警告状态能源站的系统应正常优化', async () => {
      const mixedStatusStations = testStations.map((s, i) => ({
        ...s,
        status: i % 2 === 0 ? 'normal' : 'warning' as const,
      }));
      
      const result = await solveMultiEnergyFlow(mixedStatusStations, testWeather);
      expect(result.convergence).toBe(true);
      expect(result.optimizations).toHaveLength(4);
    });

    it('包含异常状态能源站的系统应正常优化', async () => {
      const criticalStatusStation: EnergyStation = {
        ...testStations[0],
        status: 'critical',
      };
      const testStationsWithCritical = [criticalStatusStation, ...testStations.slice(1)];
      
      const result = await solveMultiEnergyFlow(testStationsWithCritical, testWeather);
      expect(result.convergence).toBe(true);
      expect(result.optimizations).toHaveLength(4);
    });

    it('不同状态能源站应能在指挥中心正确显示', () => {
      const { getByText } = render(() => (
        <CommandCenter data={testCommandCenterData} weather={testWeather} />
      ));
      
      expect(getByText('正常')).toBeInTheDocument();
      expect(getByText('警告')).toBeInTheDocument();
    });
  });
});
