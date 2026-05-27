import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '@/app/settings/page';

vi.mock('@/app/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

describe('Settings Page - API Key Management - 系统设置页面 API 密钥模块', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('页面渲染测试', () => {
    it('应正确渲染页面标题', () => {
      render(<SettingsPage />);
      expect(screen.getByText('系统设置')).toBeInTheDocument();
      expect(screen.getByText('配置系统参数、管理用户和 API 密钥')).toBeInTheDocument();
    });

    it('应显示所有标签页', () => {
      render(<SettingsPage />);
      const tabs = screen.getAllByText('通用设置');
      expect(tabs.length).toBeGreaterThan(0);
      expect(screen.getByText('用户管理')).toBeInTheDocument();
      expect(screen.getByText('参数配置')).toBeInTheDocument();
      expect(screen.getByText('API 密钥')).toBeInTheDocument();
    });

    it('默认应显示通用设置', () => {
      render(<SettingsPage />);
      expect(screen.getByText('系统名称')).toBeInTheDocument();
    });
  });

  describe('API 密钥标签页测试', () => {
    it('点击 API 密钥标签应显示密钥管理面板', async () => {
      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        expect(screen.getByText('API 密钥管理')).toBeInTheDocument();
      });
    });

    it('应显示两个 API 密钥条目', async () => {
      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        expect(screen.getByText('建筑节能系统 API')).toBeInTheDocument();
        expect(screen.getByText('运维系统 API')).toBeInTheDocument();
      });
    });

    it('应显示密钥状态为已启用', async () => {
      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        const enabledBadges = screen.getAllByText('已启用');
        expect(enabledBadges).toHaveLength(2);
      });
    });

    it('密钥默认应显示为掩码', async () => {
      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        const maskedKeys = screen.getAllByText(/••••••/);
        expect(maskedKeys.length).toBeGreaterThan(0);
      });
    });
  });

  describe('复制功能测试', () => {
    it('点击复制按钮应调用 clipboard API', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
          readText: vi.fn(),
        },
        writable: true,
      });

      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        expect(screen.getByText('建筑节能系统 API')).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByText('复制');
      fireEvent.click(copyButtons[0]);

      expect(mockWriteText).toHaveBeenCalled();
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('sk-live-'));
    });

    it('复制成功后按钮应显示已复制', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
          readText: vi.fn(),
        },
        writable: true,
      });

      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        expect(screen.getByText('建筑节能系统 API')).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByText('复制');
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('已复制')).toBeInTheDocument();
      });
    });

    it('应能复制运维系统 API 密钥', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
          readText: vi.fn(),
        },
        writable: true,
      });

      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        expect(screen.getByText('运维系统 API')).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByText('复制');
      fireEvent.click(copyButtons[1]);

      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });
  });

  describe('显示/隐藏功能测试', () => {
    it('点击眼睛图标应显示密钥明文', async () => {
      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        expect(screen.getByText('建筑节能系统 API')).toBeInTheDocument();
      });

      const eyeButtons = screen.getAllByRole('button', { name: /显示密钥|显示|eye/i });
      expect(eyeButtons.length).toBeGreaterThan(0);
      fireEvent.click(eyeButtons[0]);

      await waitFor(() => {
        const keys = screen.getAllByText(/sk-live-/);
        expect(keys.length).toBeGreaterThan(0);
      });
    });

    it('点击关闭眼睛图标应隐藏密钥', async () => {
      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        expect(screen.getByText('建筑节能系统 API')).toBeInTheDocument();
      });

      const eyeButtons = screen.getAllByRole('button', { name: /显示密钥|显示|eye/i });
      fireEvent.click(eyeButtons[0]);

      await waitFor(() => {
        expect(screen.getAllByText(/sk-live-/).length).toBeGreaterThan(0);
      });

      const eyeOffButtons = screen.getAllByRole('button', { name: /隐藏密钥|隐藏|eye off/i });
      fireEvent.click(eyeOffButtons[0]);

      await waitFor(() => {
        expect(screen.getAllByText(/••••••/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('重新生成功能测试', () => {
    it('点击重新生成按钮应生成新密钥', async () => {
      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        expect(screen.getByText('建筑节能系统 API')).toBeInTheDocument();
      });

      const eyeButtons = screen.getAllByRole('button', { name: /显示密钥|显示|eye/i });
      fireEvent.click(eyeButtons[0]);

      await waitFor(() => {
        expect(screen.getAllByText(/sk-live-/).length).toBeGreaterThan(0);
      });

      const oldKey = screen.getAllByText(/sk-live-/)[0].textContent;

      const regenerateButtons = screen.getAllByText('重新生成');
      fireEvent.click(regenerateButtons[0]);

      await waitFor(() => {
        const newKeys = screen.getAllByText(/sk-live-/);
        expect(newKeys.length).toBeGreaterThan(0);
        expect(newKeys[0].textContent).not.toBe(oldKey);
      });
    });

    it('重新生成的密钥应保持 sk-live- 前缀', async () => {
      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        expect(screen.getByText('建筑节能系统 API')).toBeInTheDocument();
      });

      const eyeButtons = screen.getAllByRole('button', { name: /显示密钥|显示|eye/i });
      fireEvent.click(eyeButtons[0]);

      const regenerateButtons = screen.getAllByText('重新生成');
      fireEvent.click(regenerateButtons[0]);

      await waitFor(() => {
        const keys = screen.getAllByText(/sk-live-/);
        expect(keys.length).toBeGreaterThan(0);
        keys.forEach((key) => {
          expect(key.textContent).toMatch(/^sk-live-[a-z0-9]{32}$/);
        });
      });
    });
  });

  describe('按钮状态测试', () => {
    it('复制按钮应有悬停效果', async () => {
      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        expect(screen.getByText('建筑节能系统 API')).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByText('复制');
      expect(copyButtons[0]).toHaveClass('bg-gray-700');
      expect(copyButtons[0]).toHaveClass('hover:bg-gray-600');
    });

    it('重新生成按钮应有正确样式', async () => {
      render(<SettingsPage />);

      const apiTab = screen.getByText('API 密钥');
      fireEvent.click(apiTab);

      await waitFor(() => {
        expect(screen.getByText('建筑节能系统 API')).toBeInTheDocument();
      });

      const regenerateButtons = screen.getAllByText('重新生成');
      expect(regenerateButtons[0]).toHaveClass('bg-gray-700');
      expect(regenerateButtons[0]).toHaveClass('hover:bg-gray-600');
    });
  });

  describe('其它标签页测试', () => {
    it('用户管理标签应显示用户列表', async () => {
      render(<SettingsPage />);

      const usersTab = screen.getByText('用户管理');
      fireEvent.click(usersTab);

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument();
        expect(screen.getByText('李四')).toBeInTheDocument();
        expect(screen.getByText('王五')).toBeInTheDocument();
      });
    });

    it('参数配置标签应显示参数输入框', async () => {
      render(<SettingsPage />);

      const paramsTab = screen.getByText('参数配置');
      fireEvent.click(paramsTab);

      await waitFor(() => {
        expect(screen.getByText('土壤导热系数')).toBeInTheDocument();
        expect(screen.getByText('流体比热容')).toBeInTheDocument();
        expect(screen.getByText('热扩散率')).toBeInTheDocument();
        expect(screen.getByText('地热梯度')).toBeInTheDocument();
      });
    });
  });
});
