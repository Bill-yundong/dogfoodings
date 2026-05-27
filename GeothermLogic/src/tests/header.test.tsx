import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/use-app-store';

vi.mock('@/store/use-app-store', () => ({
  useAppStore: vi.fn(),
}));

const mockSystemStats = {
  totalBoreholes: 12580,
  activeBoreholes: 12456,
  avgGroundTemp: 15.8,
  thermalBalanceStatus: 'stable' as const,
  overdrawRisk: 'low' as const,
  lastUpdateTime: '2024-01-01T00:00:00.000Z',
};

describe('Header Component - 顶部导航栏组件', () => {
  const mockRefreshSystemStats = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as unknown as vi.Mock).mockImplementation((selector: unknown) => {
      if (typeof selector === 'function') {
        return selector({
          systemStats: mockSystemStats,
          refreshSystemStats: mockRefreshSystemStats,
        });
      }
      return {
        systemStats: mockSystemStats,
        refreshSystemStats: mockRefreshSystemStats,
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const getBellButton = () => screen.getByRole('button', { name: '消息通知' });

  describe('组件渲染测试', () => {
    it('应正确渲染系统标题', () => {
      render(<Header />);
      expect(screen.getByText('地热能源管理系统')).toBeInTheDocument();
    });

    it('应正确显示最后更新时间', () => {
      render(<Header />);
      expect(screen.getByText(/最后更新/)).toBeInTheDocument();
    });

    it('应正确显示刷新按钮', () => {
      render(<Header />);
      expect(screen.getByTitle('刷新数据')).toBeInTheDocument();
    });

    it('应正确显示通知铃铛按钮', () => {
      render(<Header />);
      expect(getBellButton()).toBeInTheDocument();
    });

    it('应正确显示用户信息', () => {
      render(<Header />);
      expect(screen.getByText('管理员')).toBeInTheDocument();
      expect(screen.getByText('系统管理员')).toBeInTheDocument();
    });

    it('应显示通知小红点', () => {
      render(<Header />);
      const notificationDot = getBellButton().querySelector('span');
      expect(notificationDot).toHaveClass('bg-accent-500');
    });
  });

  describe('通知功能测试', () => {
    it('点击铃铛按钮应显示通知面板', async () => {
      render(<Header />);

      fireEvent.click(getBellButton());

      await waitFor(() => {
        expect(screen.getByText('消息通知')).toBeInTheDocument();
      });
    });

    it('通知面板应包含三条通知', async () => {
      render(<Header />);

      fireEvent.click(getBellButton());

      await waitFor(() => {
        expect(screen.getByText('消息通知')).toBeInTheDocument();
      });

      expect(screen.getByText('热漂移预警')).toBeInTheDocument();
      expect(screen.getByText('数据同步完成')).toBeInTheDocument();
      expect(screen.getByText('系统状态正常')).toBeInTheDocument();
    });

    it('点击关闭按钮应关闭通知面板', async () => {
      render(<Header />);

      fireEvent.click(getBellButton());

      await waitFor(() => {
        expect(screen.getByText('消息通知')).toBeInTheDocument();
      });

      const allButtons = screen.getAllByRole('button');
      const closeButton = allButtons.find(btn => btn.querySelector('.lucide-x'));
      expect(closeButton).toBeDefined();
      if (closeButton) {
        fireEvent.click(closeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('消息通知')).not.toBeInTheDocument();
      });
    });

    it('通知应正确显示类型标签', async () => {
      render(<Header />);

      fireEvent.click(getBellButton());

      await waitFor(() => {
        expect(screen.getByText('警告')).toBeInTheDocument();
        expect(screen.getByText('通知')).toBeInTheDocument();
        expect(screen.getByText('成功')).toBeInTheDocument();
      });
    });

    it('通知应显示时间信息', async () => {
      render(<Header />);

      fireEvent.click(getBellButton());

      await waitFor(() => {
        expect(screen.getByText('5分钟前')).toBeInTheDocument();
        expect(screen.getByText('30分钟前')).toBeInTheDocument();
        expect(screen.getByText('1小时前')).toBeInTheDocument();
      });
    });
  });

  describe('刷新功能测试', () => {
    it('点击刷新按钮应调用 refreshSystemStats', () => {
      render(<Header />);

      const refreshButton = screen.getByTitle('刷新数据');
      fireEvent.click(refreshButton);

      expect(mockRefreshSystemStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('样式和可访问性测试', () => {
    it('铃铛按钮应有正确的悬停状态', () => {
      render(<Header />);
      const bellButton = getBellButton();
      expect(bellButton).toHaveClass('text-gray-400');
    });

    it('通知面板应在正确位置', async () => {
      render(<Header />);

      fireEvent.click(getBellButton());

      await waitFor(() => {
        expect(screen.getByText('消息通知')).toBeInTheDocument();
      });

      const panel = screen.getByText('消息通知').closest('div');
      expect(panel).toBeTruthy();
    });
  });
});
