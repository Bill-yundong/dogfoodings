import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../Header';
import { useWarehouseStore } from '@/store/useWarehouseStore';

vi.mock('@/store/useWarehouseStore', () => ({
  useWarehouseStore: vi.fn(),
}));

const mockStore = {
  lastUpdate: new Date(),
  alerts: [
    { id: '1', title: '测试告警', message: '测试消息', type: 'warning', read: false, timestamp: new Date(), source: 'wms' },
    { id: '2', title: '系统通知', message: '系统正常运行', type: 'info', read: true, timestamp: new Date(Date.now() - 3600000), source: 'wms' },
  ],
  skus: [
    { id: 'SKU-001', name: '商品1', category: '电子产品', totalStock: 100, unit: '件' },
    { id: 'SKU-002', name: '商品2', category: '服装', totalStock: 200, unit: '件' },
  ],
  locations: [
    { id: 'LOC-A01-01-01', aisle: 1, rack: 1, level: 1, status: 'empty' },
    { id: 'LOC-A02-03-04', aisle: 2, rack: 3, level: 4, status: 'occupied' },
  ],
  markAlertRead: vi.fn(),
};

describe('Header 组件', () => {
  beforeEach(() => {
    vi.mocked(useWarehouseStore).mockReturnValue(mockStore as any);
  });

  it('应正确渲染标题和更新时间', () => {
    render(
      <MemoryRouter>
        <Header title="综合仪表盘" />
      </MemoryRouter>
    );

    expect(screen.getByText('综合仪表盘')).toBeInTheDocument();
    expect(screen.getByText(/最后更新:/)).toBeInTheDocument();
  });

  it('应显示搜索框', () => {
    render(
      <MemoryRouter>
        <Header title="测试" />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('搜索 SKU、货位...')).toBeInTheDocument();
  });

  it('应显示告警按钮和未读计数', () => {
    render(
      <MemoryRouter>
        <Header title="测试" />
      </MemoryRouter>
    );

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('应显示用户信息', () => {
    render(
      <MemoryRouter>
        <Header title="测试" />
      </MemoryRouter>
    );

    expect(screen.getByText('管理员')).toBeInTheDocument();
    expect(screen.getByText('系统管理员')).toBeInTheDocument();
  });
});
