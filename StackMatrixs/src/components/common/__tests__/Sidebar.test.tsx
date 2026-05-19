import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { useWarehouseStore } from '@/store/useWarehouseStore';

vi.mock('@/store/useWarehouseStore', () => ({
  useWarehouseStore: vi.fn(),
}));

const mockStore = {
  alerts: [
    { id: '1', title: '测试告警', message: '测试消息', type: 'warning', read: false, timestamp: new Date(), source: 'wms' },
  ],
  unreadCount: 1,
  markAlertRead: vi.fn(),
  markAllAlertsRead: vi.fn(),
  getStats: () => ({
    totalLocations: 2000,
    occupiedLocations: 1500,
    emptyLocations: 400,
    reservedLocations: 100,
    maintenanceLocations: 0,
    totalCapacity: 200000,
    usedCapacity: 150000,
    utilizationRate: 75,
    fragmentationIndex: 15,
    totalSKUs: 1000,
    activeSKUs: 800,
    pendingInboundTasks: 20,
    pendingOutboundTasks: 15,
    avgStackerEfficiency: 92,
    todayThroughput: 750,
  }),
};

describe('Sidebar 组件', () => {
  beforeEach(() => {
    vi.mocked(useWarehouseStore).mockReturnValue(mockStore as any);
  });

  it('应正确渲染导航菜单', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('综合仪表盘')).toBeInTheDocument();
    expect(screen.getByText('货位分配')).toBeInTheDocument();
    expect(screen.getByText('堆垛机监控')).toBeInTheDocument();
    expect(screen.getByText('空间管理')).toBeInTheDocument();
    expect(screen.getByText('SKU 分析')).toBeInTheDocument();
  });

  it('应显示系统Logo和名称', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('WMS')).toBeInTheDocument();
    expect(screen.getByText('智能仓储系统')).toBeInTheDocument();
  });

  it('应显示告警按钮和未读计数', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText(/条未读/)).toBeInTheDocument();
  });

  it('应显示系统设置按钮', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('系统设置')).toBeInTheDocument();
  });

  it('点击导航项应高亮当前项', () => {
    render(
      <MemoryRouter initialEntries={['/allocation']}>
        <Sidebar />
      </MemoryRouter>
    );

    const allocationLink = screen.getByText('货位分配');
    expect(allocationLink.closest('a')).toHaveClass('bg-wms-primary/15');
  });
});
