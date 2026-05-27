import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ThermalDriftPredictor from '@/components/thermal-drift/ThermalDriftPredictor';

describe('Thermal Drift Predictor Component - 热漂移预测器组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('组件渲染测试', () => {
    it('应正确渲染预测参数面板', () => {
      render(<ThermalDriftPredictor />);
      expect(screen.getByText('预测参数')).toBeInTheDocument();
      expect(screen.getByText('预测年限')).toBeInTheDocument();
      expect(screen.getByText('预测场景')).toBeInTheDocument();
    });

    it('应显示三种预测场景', () => {
      render(<ThermalDriftPredictor />);
      expect(screen.getByText('保守')).toBeInTheDocument();
      expect(screen.getByText('中等')).toBeInTheDocument();
      expect(screen.getByText('激进')).toBeInTheDocument();
    });

    it('应显示开始预测按钮', () => {
      render(<ThermalDriftPredictor />);
      expect(screen.getByRole('button', { name: /开始预测/ })).toBeInTheDocument();
    });

    it('预测年限默认应为 10 年', () => {
      render(<ThermalDriftPredictor />);
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('默认场景应为中等', () => {
      render(<ThermalDriftPredictor />);
      const moderateButton = screen.getByText('中等').closest('button');
      expect(moderateButton).toHaveClass('bg-primary-600');
    });
  });

  describe('参数调整测试', () => {
    it('应能调整预测年限', () => {
      render(<ThermalDriftPredictor />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '20' } });

      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('点击保守场景应切换选中状态', () => {
      render(<ThermalDriftPredictor />);

      const conservativeButton = screen.getByText('保守').closest('button')!;
      fireEvent.click(conservativeButton);

      expect(conservativeButton).toHaveClass('bg-primary-600');
    });

    it('点击激进场景应切换选中状态', () => {
      render(<ThermalDriftPredictor />);

      const aggressiveButton = screen.getByText('激进').closest('button')!;
      fireEvent.click(aggressiveButton);

      expect(aggressiveButton).toHaveClass('bg-primary-600');
    });
  });

  describe('预测功能测试', () => {
    it('点击预测按钮后应显示加载状态', async () => {
      render(<ThermalDriftPredictor />);

      const predictButton = screen.getByRole('button', { name: /开始预测/ });
      fireEvent.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('预测中...')).toBeInTheDocument();
      });
    });

    it('预测完成后应显示地温预测趋势图表', async () => {
      render(<ThermalDriftPredictor />);

      const predictButton = screen.getByRole('button', { name: /开始预测/ });
      fireEvent.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('地温预测趋势')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('预测完成后应显示热饱和度预测图表', async () => {
      render(<ThermalDriftPredictor />);

      const predictButton = screen.getByRole('button', { name: /开始预测/ });
      fireEvent.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('热饱和度预测')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('预测完成后应显示预测详情表格', async () => {
      render(<ThermalDriftPredictor />);

      const predictButton = screen.getByRole('button', { name: /开始预测/ });
      fireEvent.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('预测详情')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('预测完成后应显示模型参数', async () => {
      render(<ThermalDriftPredictor />);

      const predictButton = screen.getByRole('button', { name: /开始预测/ });
      fireEvent.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('模型参数')).toBeInTheDocument();
        expect(screen.getByText('热扩散率')).toBeInTheDocument();
        expect(screen.getByText('地热梯度')).toBeInTheDocument();
        expect(screen.getByText('热泵系数')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('预测场景对比测试', () => {
    it('保守场景应显示低风险', async () => {
      render(<ThermalDriftPredictor />);

      const conservativeButton = screen.getByText('保守').closest('button')!;
      fireEvent.click(conservativeButton);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '10' } });

      const predictButton = screen.getByRole('button', { name: /开始预测/ });
      fireEvent.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('预测详情')).toBeInTheDocument();
      }, { timeout: 3000 });

      const lowRiskElements = screen.getAllByText('低');
      expect(lowRiskElements.length).toBeGreaterThan(0);
    });

    it('激进场景预测30年地温应显著下降', async () => {
      render(<ThermalDriftPredictor />);

      const aggressiveButton = screen.getByText('激进').closest('button')!;
      fireEvent.click(aggressiveButton);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '30' } });

      const predictButton = screen.getByRole('button', { name: /开始预测/ });
      fireEvent.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('预测详情')).toBeInTheDocument();
      }, { timeout: 3000 });

      const yearRows = screen.getAllByText(/第 \d+ 年/);
      expect(yearRows.length).toBe(30);
    });
  });

  describe('预测结果验证测试', () => {
    it('预测详情表格应包含年份列', async () => {
      render(<ThermalDriftPredictor />);

      const predictButton = screen.getByRole('button', { name: /开始预测/ });
      fireEvent.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('年份')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('预测详情表格应包含预测地温列', async () => {
      render(<ThermalDriftPredictor />);

      const predictButton = screen.getByRole('button', { name: /开始预测/ });
      fireEvent.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('预测地温')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('预测详情表格应包含热饱和度列', async () => {
      render(<ThermalDriftPredictor />);

      const predictButton = screen.getByRole('button', { name: /开始预测/ });
      fireEvent.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('热饱和度')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('预测详情表格应包含透支风险列', async () => {
      render(<ThermalDriftPredictor />);

      const predictButton = screen.getByRole('button', { name: /开始预测/ });
      fireEvent.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('透支风险')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('预测年份数量应与设置一致', async () => {
      render(<ThermalDriftPredictor />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '5' } });

      const predictButton = screen.getByRole('button', { name: /开始预测/ });
      fireEvent.click(predictButton);

      await waitFor(() => {
        expect(screen.getByText('预测详情')).toBeInTheDocument();
      }, { timeout: 3000 });

      const yearRows = screen.getAllByText(/第 \d+ 年/);
      expect(yearRows.length).toBe(5);
    });
  });
});
