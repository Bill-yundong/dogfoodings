import React from 'react';
import { render, screen } from '@testing-library/react';
import PUEIndicator from '@/components/dashboard/PUEIndicator';

describe('PUEIndicator 组件', () => {
  const baseStats = {
    currentPUE: 1.4,
    targetPUE: 1.4,
    dailyAverage: 1.4,
    weeklyAverage: 1.4,
    monthlyAverage: 1.4,
    trend: 'stable' as const,
  };

  describe('渲染测试', () => {
    it('应该正确渲染组件', () => {
      render(<PUEIndicator stats={baseStats} />);
      expect(screen.getByText('PUE 能效指标')).toBeInTheDocument();
    });

    it('应该显示当前 PUE 值', () => {
      render(<PUEIndicator stats={{ ...baseStats, currentPUE: 1.45 }} />);
      expect(screen.getByText('1.45')).toBeInTheDocument();
    });

    it('应该显示目标 PUE 值', () => {
      render(<PUEIndicator stats={baseStats} />);
      expect(screen.getByText(/目标:/)).toBeInTheDocument();
      expect(screen.getByText('1.4')).toBeInTheDocument();
    });

    it('应该显示日平均、周平均、月平均', () => {
      render(<PUEIndicator stats={{ ...baseStats, dailyAverage: 1.4, weeklyAverage: 1.45, monthlyAverage: 1.5 }} />);
      expect(screen.getByText('日均')).toBeInTheDocument();
      expect(screen.getByText('周均')).toBeInTheDocument();
      expect(screen.getByText('月均')).toBeInTheDocument();
    });
  });

  describe('趋势指示器测试', () => {
    it('应该显示稳定趋势', () => {
      render(<PUEIndicator stats={{ ...baseStats, trend: 'stable' }} />);
      expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('应该显示改善趋势', () => {
      render(<PUEIndicator stats={{ ...baseStats, trend: 'improving' }} />);
      expect(screen.getByText('↓')).toBeInTheDocument();
    });

    it('应该显示恶化趋势', () => {
      render(<PUEIndicator stats={{ ...baseStats, trend: 'worsening' }} />);
      expect(screen.getByText('↑')).toBeInTheDocument();
    });
  });

  describe('颜色编码测试', () => {
    it('优秀 PUE 值应该显示绿色', () => {
      const { container } = render(<PUEIndicator stats={{ ...baseStats, currentPUE: 1.2 }} />);
      const pueElement = container.querySelector('.text-green-400');
      expect(pueElement).toBeInTheDocument();
    });

    it('良好 PUE 值应该显示黄色', () => {
      const { container } = render(<PUEIndicator stats={{ ...baseStats, currentPUE: 1.4 }} />);
      const pueElement = container.querySelector('.text-yellow-400');
      expect(pueElement).toBeInTheDocument();
    });

    it('较差 PUE 值应该显示橙色', () => {
      const { container } = render(<PUEIndicator stats={{ ...baseStats, currentPUE: 1.6 }} />);
      const pueElement = container.querySelector('.text-orange-400');
      expect(pueElement).toBeInTheDocument();
    });

    it('很差 PUE 值应该显示红色', () => {
      const { container } = render(<PUEIndicator stats={{ ...baseStats, currentPUE: 2.0 }} />);
      const pueElement = container.querySelector('.text-red-400');
      expect(pueElement).toBeInTheDocument();
    });
  });

  describe('进度条测试', () => {
    it('应该包含进度条元素', () => {
      const { container } = render(<PUEIndicator stats={baseStats} />);
      const progressBar = container.querySelector('.bg-gray-700');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('数据精度测试', () => {
    it('应该正确显示两位小数', () => {
      render(<PUEIndicator stats={{ ...baseStats, currentPUE: 1.4567 }} />);
      expect(screen.getByText('1.46')).toBeInTheDocument();
    });

    it('平均值应该正确显示', () => {
      render(<PUEIndicator stats={{ 
        ...baseStats, 
        dailyAverage: 1.42,
        weeklyAverage: 1.48,
        monthlyAverage: 1.55 
      }} />);
      expect(screen.getByText('1.42')).toBeInTheDocument();
      expect(screen.getByText('1.48')).toBeInTheDocument();
      expect(screen.getByText('1.55')).toBeInTheDocument();
    });
  });

  describe('布局测试', () => {
    it('应该包含正确的 CSS 类', () => {
      const { container } = render(<PUEIndicator stats={baseStats} />);
      expect(container.firstChild).toHaveClass('rounded-xl');
    });

    it('应该有三列平均值显示', () => {
      const { container } = render(<PUEIndicator stats={baseStats} />);
      const grid = container.querySelector('.grid-cols-3');
      expect(grid).toBeInTheDocument();
    });
  });
});
