import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TidalChart } from '../components/TidalChart';
import { LocationAnalysisCard } from '../components/LocationAnalysisCard';
import { TurbineArray } from '../components/TurbineArray';
import { TidalData, LocationAnalysis, ArrayLayout, GeoLocation } from '../types/tidal';

describe('UI Components - 组件集成测试', () => {
  describe('TidalChart - 潮汐图表组件', () => {
    const testTidalData: TidalData[] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: Date.now() + i * 3600000,
      waterLevel: Math.sin(i / 5),
      velocity: {
        magnitude: 1.5 + Math.random(),
        direction: 90,
      },
    }));

    it('应正确渲染图表标题', () => {
      render(<TidalChart data={testTidalData} title="测试潮汐数据" />);
      expect(screen.getByText('测试潮汐数据')).toBeInTheDocument();
    });

    it('应渲染三个子图表（水位、流速、功率密度）', () => {
      const { container } = render(<TidalChart data={testTidalData} />);
      const charts = container.querySelectorAll('.recharts-wrapper');
      expect(charts.length).toBe(3);
    });

    it('空数据也应正常渲染', () => {
      const { container } = render(<TidalChart data={[]} />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('LocationAnalysisCard - 位点分析卡片组件', () => {
    const testAnalysis: LocationAnalysis = {
      locationId: 'loc_30.0000_120.5000',
      location: { latitude: 30.0, longitude: 120.5 },
      avgPowerDensity: 1000.5,
      maxPowerDensity: 2500.75,
      minPowerDensity: 450.25,
      capacityFactor: 0.352,
      annualEnergyProduction: 3000000,
    };

    it('应正确渲染组件标题', () => {
      render(<LocationAnalysisCard analysis={testAnalysis} />);
      expect(screen.getByText('位点能源产出分析')).toBeInTheDocument();
    });

    it('应显示平均功率密度', () => {
      render(<LocationAnalysisCard analysis={testAnalysis} />);
      expect(screen.getByText('平均功率密度')).toBeInTheDocument();
      expect(screen.getByText('1000.50')).toBeInTheDocument();
    });

    it('应显示最大功率密度', () => {
      render(<LocationAnalysisCard analysis={testAnalysis} />);
      expect(screen.getByText('最大功率密度')).toBeInTheDocument();
      expect(screen.getByText('2500.75')).toBeInTheDocument();
    });

    it('应显示容量因子（百分比格式）', () => {
      render(<LocationAnalysisCard analysis={testAnalysis} />);
      expect(screen.getByText('容量因子')).toBeInTheDocument();
      expect(screen.getByText('35.2')).toBeInTheDocument();
    });

    it('应显示年发电量（转换为兆瓦时）', () => {
      render(<LocationAnalysisCard analysis={testAnalysis} />);
      expect(screen.getByText('年发电量')).toBeInTheDocument();
      expect(screen.getByText('3.00')).toBeInTheDocument();
    });

    it('应显示位点坐标信息', () => {
      render(<LocationAnalysisCard analysis={testAnalysis} />);
      expect(screen.getByText(/30.0000/)).toBeInTheDocument();
      expect(screen.getByText(/120.5000/)).toBeInTheDocument();
    });
  });

  describe('TurbineArray - 涡轮机阵列组件', () => {
    const centerLocation: GeoLocation = { latitude: 30.0, longitude: 120.5 };
    const testLayout: ArrayLayout = {
      turbines: [
        {
          id: 't1',
          location: { latitude: 29.999, longitude: 120.499 },
          ratedPower: 1000,
          efficiency: 0.4,
          rotorDiameter: 20,
          cutInSpeed: 0.8,
          cutOutSpeed: 4.5,
        },
        {
          id: 't2',
          location: { latitude: 30.001, longitude: 120.501 },
          ratedPower: 1000,
          efficiency: 0.4,
          rotorDiameter: 20,
          cutInSpeed: 0.8,
          cutOutSpeed: 4.5,
        },
      ],
      centerLocation,
      spacing: {
        longitudinal: 100,
        lateral: 80,
      },
    };

    it('应正确渲染组件标题', () => {
      render(<TurbineArray layout={testLayout} />);
      expect(screen.getByText('潮流能发电阵列布局')).toBeInTheDocument();
    });

    it('应显示涡轮机数量', () => {
      render(<TurbineArray layout={testLayout} />);
      expect(screen.getByText('涡轮机数量')).toBeInTheDocument();
      expect(screen.getByText('2 台')).toBeInTheDocument();
    });

    it('应显示纵向间距', () => {
      render(<TurbineArray layout={testLayout} />);
      expect(screen.getByText('纵向间距')).toBeInTheDocument();
      expect(screen.getByText('100.0 m')).toBeInTheDocument();
    });

    it('应显示横向间距', () => {
      render(<TurbineArray layout={testLayout} />);
      expect(screen.getByText('横向间距')).toBeInTheDocument();
      expect(screen.getByText('80.0 m')).toBeInTheDocument();
    });

    it('应包含SVG图表元素', () => {
      const { container } = render(<TurbineArray layout={testLayout} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('SVG图表应包含正确数量的涡轮机元素', () => {
      const { container } = render(<TurbineArray layout={testLayout} />);
      const turbineCircles = container.querySelectorAll('circle[r="5"]');
      expect(turbineCircles.length).toBe(2);
    });

    it('单涡轮机也应正常渲染', () => {
      const singleTurbineLayout: ArrayLayout = {
        ...testLayout,
        turbines: [testLayout.turbines[0]],
      };
      const { container } = render(<TurbineArray layout={singleTurbineLayout} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });
});

describe('Component Integration - 组件集成场景测试', () => {
  describe('完整数据分析流程集成', () => {
    const testLocation: GeoLocation = { latitude: 30.0, longitude: 120.5 };
    const testTidalData: TidalData[] = Array.from({ length: 72 }, (_, i) => ({
      timestamp: Date.now() + i * 3600000,
      waterLevel: Math.sin(i / 12),
      velocity: {
        magnitude: 1.2 + Math.sin(i / 6) * 0.8,
        direction: 90 + Math.sin(i / 24) * 30,
      },
    }));

    it('应支持从潮汐数据到位点分析的完整展示流程', () => {
      const avgPowerDensity = testTidalData.reduce((sum, d) => 
        sum + 0.5 * 1025 * Math.pow(d.velocity.magnitude, 3), 0) / testTidalData.length;
      
      const analysis: LocationAnalysis = {
        locationId: `loc_${testLocation.latitude.toFixed(4)}_${testLocation.longitude.toFixed(4)}`,
        location: testLocation,
        avgPowerDensity,
        maxPowerDensity: Math.max(...testTidalData.map(d => 0.5 * 1025 * Math.pow(d.velocity.magnitude, 3))),
        minPowerDensity: Math.min(...testTidalData.map(d => 0.5 * 1025 * Math.pow(d.velocity.magnitude, 3))),
        capacityFactor: 0.35,
        annualEnergyProduction: 3000000,
      };

      const { container: chartContainer } = render(<TidalChart data={testTidalData} />);
      const { container: cardContainer } = render(<LocationAnalysisCard analysis={analysis} />);

      expect(chartContainer).toBeInTheDocument();
      expect(cardContainer).toBeInTheDocument();
    });
  });

  describe('响应式布局适配', () => {
    it('组件应在窄屏环境下正常渲染', () => {
      const testAnalysis: LocationAnalysis = {
        locationId: 'loc_30.0000_120.5000',
        location: { latitude: 30.0, longitude: 120.5 },
        avgPowerDensity: 1000,
        maxPowerDensity: 2000,
        minPowerDensity: 500,
        capacityFactor: 0.35,
        annualEnergyProduction: 3000000,
      };

      const originalInnerWidth = window.innerWidth;
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));

      const { container } = render(<LocationAnalysisCard analysis={testAnalysis} />);
      expect(container).toBeInTheDocument();

      window.innerWidth = originalInnerWidth;
      window.dispatchEvent(new Event('resize'));
    });
  });
});
