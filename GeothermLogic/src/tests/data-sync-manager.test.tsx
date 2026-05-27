import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DataSyncManager from '@/components/data-sync/DataSyncManager';
import { useAppStore } from '@/store/use-app-store';

vi.mock('@/store/use-app-store', () => ({
  useAppStore: vi.fn(),
}));

const mockSemanticMappings = [
  { id: '1', sourceField: 'heat_extraction_rate', targetField: 'thermal_output', transformation: 'value * 3.6', description: '热提取率单位转换' },
  { id: '2', sourceField: 'ground_temperature', targetField: 'soil_temp', transformation: 'value', description: '地温数据直传' },
];

describe('Data Sync Manager Component - 数据同步管理器组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as unknown as vi.Mock).mockImplementation((selector: unknown) => {
      const state = {
        semanticMappings: mockSemanticMappings,
      };
      if (typeof selector === 'function') {
        return selector(state);
      }
      return state;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('组件渲染测试', () => {
    it('应正确渲染数据同步配置标题', () => {
      render(<DataSyncManager />);
      expect(screen.getByText('数据同步配置')).toBeInTheDocument();
    });

    it('应显示同步方向选项', () => {
      render(<DataSyncManager />);
      expect(screen.getByText('源系统')).toBeInTheDocument();
      expect(screen.getByText('目标系统')).toBeInTheDocument();
    });

    it('应显示数据类型选择', () => {
      render(<DataSyncManager />);
      expect(screen.getByText('选择数据类型')).toBeInTheDocument();
    });

    it('应显示开始同步按钮', () => {
      render(<DataSyncManager />);
      expect(screen.getByRole('button', { name: /开始同步/ })).toBeInTheDocument();
    });

    it('应显示语义映射配置', () => {
      render(<DataSyncManager />);
      expect(screen.getByText('语义映射配置')).toBeInTheDocument();
    });

    it('应显示同步队列状态', () => {
      render(<DataSyncManager />);
      expect(screen.getByText('同步队列状态')).toBeInTheDocument();
    });

    it('应显示同步历史记录', () => {
      render(<DataSyncManager />);
      expect(screen.getByText('同步历史记录')).toBeInTheDocument();
    });
  });

  describe('数据类型选择测试', () => {
    it('应显示所有可选择的数据类型', () => {
      render(<DataSyncManager />);
      expect(screen.getByText('热提取率')).toBeInTheDocument();
      expect(screen.getByText('地温数据')).toBeInTheDocument();
      expect(screen.getByText('泵效率')).toBeInTheDocument();
      expect(screen.getByText('热平衡')).toBeInTheDocument();
      expect(screen.getByText('钻孔参数')).toBeInTheDocument();
    });

    it('点击数据类型应切换选中状态', () => {
      render(<DataSyncManager />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCheckbox = checkboxes[0];
      const initialChecked = firstCheckbox.checked;
      fireEvent.click(firstCheckbox);

      expect(firstCheckbox.checked).toBe(!initialChecked);
    });

    it('未选择数据类型时同步按钮应禁用', () => {
      render(<DataSyncManager />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((cb) => {
        if (cb.checked) {
          fireEvent.click(cb);
        }
      });

      const syncButton = screen.getByRole('button', { name: /开始同步/ });
      expect(syncButton).toBeDisabled();
    });

    it('选择数据类型后同步按钮应可用', () => {
      render(<DataSyncManager />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((cb) => {
        if (!cb.checked) {
          fireEvent.click(cb);
        }
      });

      const syncButton = screen.getByRole('button', { name: /开始同步/ });
      expect(syncButton).not.toBeDisabled();
    });
  });

  describe('同步功能测试', () => {
    it('点击同步按钮应显示同步中状态', async () => {
      render(<DataSyncManager />);

      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes[0] && !checkboxes[0].checked) {
        fireEvent.click(checkboxes[0]);
      }

      const syncButton = screen.getByRole('button', { name: /开始同步/ });
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText(/同步中|正在同步/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('同步完成后应显示成功状态', async () => {
      render(<DataSyncManager />);

      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes[0] && !checkboxes[0].checked) {
        fireEvent.click(checkboxes[0]);
      }

      const syncButton = screen.getByRole('button', { name: /开始同步/ });
      fireEvent.click(syncButton);

      await waitFor(() => {
        const completedElements = screen.getAllByText('已完成');
        expect(completedElements.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });

  describe('语义映射测试', () => {
    it('应显示语义映射列表', () => {
      render(<DataSyncManager />);
      expect(screen.getByText('热提取率单位转换')).toBeInTheDocument();
      expect(screen.getByText('地温数据直传')).toBeInTheDocument();
    });

    it('应显示转换规则', () => {
      render(<DataSyncManager />);
      expect(screen.getByText('heat_extraction_rate')).toBeInTheDocument();
      expect(screen.getByText('thermal_output')).toBeInTheDocument();
    });
  });

  describe('同步历史测试', () => {
    it('应显示同步历史表格', async () => {
      render(<DataSyncManager />);

      await waitFor(() => {
        expect(screen.getByText('同步类型')).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(screen.getByText('状态')).toBeInTheDocument();
      expect(screen.getByText('时间')).toBeInTheDocument();
      expect(screen.getByText('处理记录数')).toBeInTheDocument();
    });

    it('应显示已完成的同步任务', async () => {
      render(<DataSyncManager />);

      await waitFor(() => {
        const completedElements = screen.getAllByText('已完成');
        expect(completedElements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('系统选择测试', () => {
    it('应允许切换源系统', () => {
      render(<DataSyncManager />);

      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it('应允许切换目标系统', () => {
      render(<DataSyncManager />);

      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });
  });
});
