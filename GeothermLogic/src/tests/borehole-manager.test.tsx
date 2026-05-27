import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BoreholeManager from '@/components/boreholes/BoreholeManager';
import { useAppStore } from '@/store/use-app-store';

vi.mock('@/store/use-app-store', () => ({
  useAppStore: vi.fn(),
}));

vi.mock('@/lib/idb-db', () => ({
  initDB: vi.fn().mockResolvedValue({}),
  getBoreholes: vi.fn().mockResolvedValue([]),
  saveBoreholes: vi.fn().mockResolvedValue(undefined),
  saveTemperatureSnapshots: vi.fn().mockResolvedValue(undefined),
  getSnapshotsByBorehole: vi.fn().mockResolvedValue([]),
  clearOldSnapshots: vi.fn().mockResolvedValue(0),
  getDBStats: vi.fn().mockResolvedValue({ size: 0, stores: [] }),
}));

vi.mock('@/lib/mock-data', () => ({
  generateBoreholes: vi.fn((count: number) => {
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push({
        id: `test-${String(i + 1).padStart(4, '0')}`,
        name: `BH-${String(i + 1).padStart(4, '0')}`,
        depth: 100,
        diameter: 0.2,
        location: { lat: 39.9042, lng: 116.4074 },
        status: 'active' as const,
        currentTemperature: 15.5,
        lastSyncTime: '2024-01-01T00:00:00.000Z',
      });
    }
    return result;
  }),
  generateTemperatureSnapshots: vi.fn(() => [
    {
      id: 'snap-001',
      boreholeId: 'test-001',
      timestamp: '2024-01-01T00:00:00.000Z',
      temperature: 15.5,
      depth: 100,
    },
  ]),
}));

const mockBoreholes = [
  {
    id: 'test-001',
    name: 'BH-0001',
    depth: 100,
    diameter: 0.2,
    location: { lat: 39.9042, lng: 116.4074 },
    status: 'active' as const,
    currentTemperature: 15.5,
    lastSyncTime: '2024-01-01T00:00:00.000Z',
  },
];

describe('Borehole Manager Component - 换热孔管理器组件', () => {
  const mockSetBoreholes = vi.fn();
  const mockSetSelectedBorehole = vi.fn();
  const mockSetDbInitialized = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as unknown as vi.Mock).mockImplementation((selector: unknown) => {
      const state = {
        boreholes: mockBoreholes,
        setBoreholes: mockSetBoreholes,
        selectedBorehole: null,
        setSelectedBorehole: mockSetSelectedBorehole,
        dbInitialized: false,
        setDbInitialized: mockSetDbInitialized,
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
    it('应正确渲染换热孔管理标题', () => {
      render(<BoreholeManager />);
      expect(screen.getByText('换热孔管理')).toBeInTheDocument();
    });

    it('应显示搜索框', () => {
      render(<BoreholeManager />);
      expect(screen.getByPlaceholderText('搜索换热孔名称...')).toBeInTheDocument();
    });

    it('应显示状态筛选按钮', () => {
      render(<BoreholeManager />);
      expect(screen.getByText('全部')).toBeInTheDocument();
      expect(screen.getByText('活跃')).toBeInTheDocument();
      expect(screen.getByText('停用')).toBeInTheDocument();
      expect(screen.getByText('维护')).toBeInTheDocument();
    });

    it('应显示生成更多数据按钮', () => {
      render(<BoreholeManager />);
      expect(screen.getByText('生成更多数据')).toBeInTheDocument();
    });

    it('应显示清理过期数据按钮', () => {
      render(<BoreholeManager />);
      expect(screen.getByText('清理过期数据')).toBeInTheDocument();
    });

    it('应显示本地缓存状态', () => {
      render(<BoreholeManager />);
      expect(screen.getByText(/本地缓存/)).toBeInTheDocument();
    });
  });

  describe('数据表格测试', () => {
    it('应显示数据表格表头', async () => {
      render(<BoreholeManager />);

      await waitFor(() => {
        expect(screen.getByText('名称')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText(/深度/)).toBeInTheDocument();
      expect(screen.getByText(/直径/)).toBeInTheDocument();
      expect(screen.getByText(/当前地温/)).toBeInTheDocument();
      expect(screen.getByText('状态')).toBeInTheDocument();
      expect(screen.getByText('最后同步')).toBeInTheDocument();
      expect(screen.getByText('操作')).toBeInTheDocument();
    });
  });

  describe('搜索功能测试', () => {
    it('应允许输入搜索关键词', () => {
      render(<BoreholeManager />);

      const searchInput = screen.getByPlaceholderText('搜索换热孔名称...');
      fireEvent.change(searchInput, { target: { value: 'BH-0001' } });

      expect(searchInput).toHaveValue('BH-0001');
    });
  });

  describe('状态筛选测试', () => {
    it('点击活跃按钮应筛选活跃换热孔', () => {
      render(<BoreholeManager />);

      const activeButton = screen.getByText('活跃').closest('button');
      fireEvent.click(activeButton!);

      expect(activeButton).toHaveClass('bg-primary-600');
    });

    it('点击停用按钮应筛选停用换热孔', () => {
      render(<BoreholeManager />);

      const inactiveButton = screen.getByText('停用').closest('button');
      fireEvent.click(inactiveButton!);

      expect(inactiveButton).toHaveClass('bg-primary-600');
    });

    it('点击维护按钮应筛选维护中换热孔', () => {
      render(<BoreholeManager />);

      const maintenanceButton = screen.getByText('维护').closest('button');
      fireEvent.click(maintenanceButton!);

      expect(maintenanceButton).toHaveClass('bg-primary-600');
    });

    it('点击全部按钮应显示所有换热孔', () => {
      render(<BoreholeManager />);

      const allButton = screen.getByText('全部').closest('button');
      fireEvent.click(allButton!);

      expect(allButton).toHaveClass('bg-primary-600');
    });
  });

  describe('数据操作测试', () => {
    it('点击生成更多数据应生成新数据', async () => {
      render(<BoreholeManager />);

      await waitFor(() => {
        expect(screen.getByText('换热孔管理')).toBeInTheDocument();
      }, { timeout: 3000 });

      const generateButton = screen.getByText('生成更多数据');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockSetBoreholes).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('点击清理过期数据应清理快照', async () => {
      render(<BoreholeManager />);

      await waitFor(() => {
        expect(screen.getByText('换热孔管理')).toBeInTheDocument();
      }, { timeout: 3000 });

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const clearButton = screen.getByText('清理过期数据');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      }, { timeout: 3000 });

      alertSpy.mockRestore();
    });
  });

  describe('换热孔选择测试', () => {
    it('点击换热孔行应显示详情', async () => {
      render(<BoreholeManager />);

      await waitFor(() => {
        expect(screen.getByText('BH-0001')).toBeInTheDocument();
      }, { timeout: 3000 });

      const row = screen.getByText('BH-0001').closest('tr');
      fireEvent.click(row!);

      expect(mockSetSelectedBorehole).toHaveBeenCalledWith(mockBoreholes[0]);
    });

    it('选中后应显示快照信息', async () => {
      (useAppStore as unknown as vi.Mock).mockImplementation((selector: unknown) => {
        const state = {
          boreholes: mockBoreholes,
          setBoreholes: mockSetBoreholes,
          selectedBorehole: mockBoreholes[0],
          setSelectedBorehole: mockSetSelectedBorehole,
          dbInitialized: true,
          setDbInitialized: mockSetDbInitialized,
        };
        if (typeof selector === 'function') {
          return selector(state);
        }
        return state;
      });

      render(<BoreholeManager />);

      await waitFor(() => {
        expect(screen.getByText('BH-0001')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText(/历史地温快照/)).toBeInTheDocument();
    });
  });
});
