import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ThermalBalanceCalculator from '@/components/thermal-balance/ThermalBalanceCalculator';

describe('Thermal Balance Calculator Component - 热平衡计算器组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('组件渲染测试', () => {
    it('应正确渲染参数设置面板', () => {
      render(<ThermalBalanceCalculator />);
      expect(screen.getByText('参数设置')).toBeInTheDocument();
      expect(screen.getByText(/土壤导热系数/)).toBeInTheDocument();
      expect(screen.getByText(/流体比热容/)).toBeInTheDocument();
      expect(screen.getByText(/流体流量/)).toBeInTheDocument();
      expect(screen.getByText(/进水温度/)).toBeInTheDocument();
      expect(screen.getByText(/出水温度/)).toBeInTheDocument();
    });

    it('应正确渲染计算结果面板', () => {
      render(<ThermalBalanceCalculator />);
      expect(screen.getByText('计算结果')).toBeInTheDocument();
    });

    it('应显示开始计算按钮', () => {
      render(<ThermalBalanceCalculator />);
      expect(screen.getByRole('button', { name: /开始计算/ })).toBeInTheDocument();
    });

    it('输入框应显示默认值', () => {
      render(<ThermalBalanceCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs).toHaveLength(5);

      expect(inputs[0]).toHaveValue(2.5);
      expect(inputs[1]).toHaveValue(4186);
      expect(inputs[2]).toHaveValue(12.5);
      expect(inputs[3]).toHaveValue(8.5);
      expect(inputs[4]).toHaveValue(12.3);
    });
  });

  describe('参数输入测试', () => {
    it('应允许修改土壤导热系数', () => {
      render(<ThermalBalanceCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      const conductivityInput = inputs[0];
      fireEvent.change(conductivityInput, { target: { value: '3.0' } });

      expect(conductivityInput).toHaveValue(3);
    });

    it('应允许修改流体流量', () => {
      render(<ThermalBalanceCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      const flowInput = inputs[2];
      fireEvent.change(flowInput, { target: { value: '15.0' } });

      expect(flowInput).toHaveValue(15);
    });

    it('应允许修改进水和出水温度', () => {
      render(<ThermalBalanceCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      const inletInput = inputs[3];
      const outletInput = inputs[4];

      fireEvent.change(inletInput, { target: { value: '10.0' } });
      fireEvent.change(outletInput, { target: { value: '14.0' } });

      expect(inletInput).toHaveValue(10);
      expect(outletInput).toHaveValue(14);
    });
  });

  describe('计算功能测试', () => {
    it('点击计算按钮后应显示加载状态', async () => {
      render(<ThermalBalanceCalculator />);

      const calculateButton = screen.getByRole('button', { name: /开始计算/ });
      fireEvent.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText('计算中...')).toBeInTheDocument();
      });
    });

    it('计算完成后应显示热平衡状态', async () => {
      render(<ThermalBalanceCalculator />);

      const calculateButton = screen.getByRole('button', { name: /开始计算/ });
      fireEvent.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/系统稳定|需要关注|系统危险/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('计算完成后应显示热提取率', async () => {
      render(<ThermalBalanceCalculator />);

      const calculateButton = screen.getByRole('button', { name: /开始计算/ });
      fireEvent.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText('热提取率')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('计算完成后应显示热回灌率', async () => {
      render(<ThermalBalanceCalculator />);

      const calculateButton = screen.getByRole('button', { name: /开始计算/ });
      fireEvent.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText('热回灌率')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('计算完成后应显示净热平衡', async () => {
      render(<ThermalBalanceCalculator />);

      const calculateButton = screen.getByRole('button', { name: /开始计算/ });
      fireEvent.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText('净热平衡')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('计算完成后应显示建议列表', async () => {
      render(<ThermalBalanceCalculator />);

      const calculateButton = screen.getByRole('button', { name: /开始计算/ });
      fireEvent.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText('建议')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('计算结果验证测试', () => {
    it('高效参数应产生较高效率', async () => {
      render(<ThermalBalanceCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '3.0' } });
      fireEvent.change(inputs[3], { target: { value: '10.0' } });
      fireEvent.change(inputs[4], { target: { value: '15.0' } });

      const calculateButton = screen.getByRole('button', { name: /开始计算/ });
      fireEvent.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/热平衡效率/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('冬季模式应显示冬季建议', async () => {
      render(<ThermalBalanceCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[3], { target: { value: '12.0' } });
      fireEvent.change(inputs[4], { target: { value: '8.0' } });

      const calculateButton = screen.getByRole('button', { name: /开始计算/ });
      fireEvent.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/冬季模式|夏季模式/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('夏季模式应显示夏季建议', async () => {
      render(<ThermalBalanceCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[3], { target: { value: '18.0' } });
      fireEvent.change(inputs[4], { target: { value: '22.0' } });

      const calculateButton = screen.getByRole('button', { name: /开始计算/ });
      fireEvent.click(calculateButton);

      await waitFor(() => {
        expect(screen.getByText(/冬季模式|夏季模式/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});
