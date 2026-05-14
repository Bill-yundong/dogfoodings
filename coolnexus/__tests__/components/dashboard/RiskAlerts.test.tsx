import React from 'react';
import { render, screen } from '@testing-library/react';
import RiskAlerts from '@/components/dashboard/RiskAlerts';

describe('RiskAlerts 组件', () => {
  describe('空状态测试', () => {
    it('没有风险时应该显示空状态', () => {
      render(<RiskAlerts risks={[]} />);
      expect(screen.getByText('暂未检测到风险')).toBeInTheDocument();
    });

    it('空状态应该显示对勾图标', () => {
      render(<RiskAlerts risks={[]} />);
      expect(screen.getByText('✅')).toBeInTheDocument();
    });
  });

  describe('风险显示测试', () => {
    const mockRisks = [
      {
        id: 'risk-1',
        type: 'hot_spot' as const,
        severity: 'high' as const,
        location: { x: 5, y: 2, z: 3 },
        affectedRacks: ['rack-a1', 'rack-a2'],
        description: '检测到局部热点',
        temperature: 42.5,
      },
      {
        id: 'risk-2',
        type: 'short_circuit' as const,
        severity: 'critical' as const,
        location: { x: 8, y: 3, z: 5 },
        affectedRacks: ['rack-b1'],
        description: '检测到潜在气流短路风险',
        temperature: 48.2,
      },
    ];

    it('应该显示正确数量的风险告警', () => {
      render(<RiskAlerts risks={mockRisks} />);
      expect(screen.getByText(/2/)).toBeInTheDocument();
    });

    it('应该显示风险描述', () => {
      render(<RiskAlerts risks={mockRisks} />);
      expect(screen.getByText('检测到局部热点')).toBeInTheDocument();
      expect(screen.getByText('检测到潜在气流短路风险')).toBeInTheDocument();
    });

    it('应该显示温度值', () => {
      render(<RiskAlerts risks={mockRisks} />);
      expect(screen.getByText('42.5°C')).toBeInTheDocument();
      expect(screen.getByText('48.2°C')).toBeInTheDocument();
    });

    it('应该显示受影响的机柜', () => {
      render(<RiskAlerts risks={mockRisks} />);
      expect(screen.getByText('a1')).toBeInTheDocument();
      expect(screen.getByText('a2')).toBeInTheDocument();
      expect(screen.getByText('b1')).toBeInTheDocument();
    });
  });

  describe('风险类型图标测试', () => {
    it('热点风险应该显示火焰图标', () => {
      render(<RiskAlerts risks={[{
        id: '1',
        type: 'hot_spot',
        severity: 'high',
        location: { x: 0, y: 0, z: 0 },
        affectedRacks: [],
        description: '测试',
        temperature: 40,
      }]} />);
      expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    it('气流短路应该显示闪电图标', () => {
      render(<RiskAlerts risks={[{
        id: '1',
        type: 'short_circuit',
        severity: 'critical',
        location: { x: 0, y: 0, z: 0 },
        affectedRacks: [],
        description: '测试',
        temperature: 45,
      }]} />);
      expect(screen.getByText('⚡')).toBeInTheDocument();
    });

    it('回流风险应该显示循环箭头图标', () => {
      render(<RiskAlerts risks={[{
        id: '1',
        type: 'recirculation',
        severity: 'medium',
        location: { x: 0, y: 0, z: 0 },
        affectedRacks: [],
        description: '测试',
        temperature: 38,
      }]} />);
      expect(screen.getByText('🔄')).toBeInTheDocument();
    });
  });

  describe('严重级别颜色测试', () => {
    it('critical 级别应该显示红色', () => {
      const { container } = render(<RiskAlerts risks={[{
        id: '1',
        type: 'hot_spot',
        severity: 'critical',
        location: { x: 0, y: 0, z: 0 },
        affectedRacks: [],
        description: '测试',
        temperature: 50,
      }]} />);
      const riskElement = container.querySelector('.border-red-500\\/50');
      expect(riskElement).toBeInTheDocument();
    });

    it('high 级别应该显示橙色', () => {
      const { container } = render(<RiskAlerts risks={[{
        id: '1',
        type: 'hot_spot',
        severity: 'high',
        location: { x: 0, y: 0, z: 0 },
        affectedRacks: [],
        description: '测试',
        temperature: 42,
      }]} />);
      const riskElement = container.querySelector('.border-orange-500\\/50');
      expect(riskElement).toBeInTheDocument();
    });

    it('medium 级别应该显示黄色', () => {
      const { container } = render(<RiskAlerts risks={[{
        id: '1',
        type: 'hot_spot',
        severity: 'medium',
        location: { x: 0, y: 0, z: 0 },
        affectedRacks: [],
        description: '测试',
        temperature: 38,
      }]} />);
      const riskElement = container.querySelector('.border-amber-500\\/50');
      expect(riskElement).toBeInTheDocument();
    });

    it('low 级别应该显示蓝色', () => {
      const { container } = render(<RiskAlerts risks={[{
        id: '1',
        type: 'hot_spot',
        severity: 'low',
        location: { x: 0, y: 0, z: 0 },
        affectedRacks: [],
        description: '测试',
        temperature: 35,
      }]} />);
      const riskElement = container.querySelector('.border-blue-500\\/50');
      expect(riskElement).toBeInTheDocument();
    });
  });

  describe('布局测试', () => {
    it('应该包含标题和告警图标', () => {
      render(<RiskAlerts risks={[]} />);
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('气流风险告警')).toBeInTheDocument();
    });

    it('应该有正确的 CSS 类', () => {
      const { container } = render(<RiskAlerts risks={[]} />);
      expect(container.firstChild).toHaveClass('rounded-xl');
    });
  });

  describe('大数据量测试', () => {
    it('应该能够处理大量风险告警', () => {
      const manyRisks = Array.from({ length: 20 }, (_, i) => ({
        id: `risk-${i}`,
        type: 'hot_spot' as const,
        severity: 'medium' as const,
        location: { x: i, y: 2, z: 3 },
        affectedRacks: [`rack-${i}`],
        description: `测试风险 ${i}`,
        temperature: 38 + i,
      }));

      const { container } = render(<RiskAlerts risks={manyRisks} />);
      expect(container).toBeInTheDocument();
    });
  });
});
