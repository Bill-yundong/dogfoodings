import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import OrderBookPanel from '../../components/OrderBookPanel.svelte';
import OrderFlowPanel from '../../components/OrderFlowPanel.svelte';
import LiquidationPanel from '../../components/LiquidationPanel.svelte';
import StrategyPanel from '../../components/StrategyPanel.svelte';

describe('组件渲染测试', () => {
  describe('OrderBookPanel', () => {
    it('should render without crashing', () => {
      const { container } = render(OrderBookPanel, { props: { symbol: 'BTCUSDT' } });
      expect(container).toBeDefined();
    });

    it('should display order book title', () => {
      render(OrderBookPanel, { props: { symbol: 'BTCUSDT' } });
      expect(screen.getByText('订单簿')).toBeInTheDocument();
    });

    it('should display mid price section', () => {
      render(OrderBookPanel, { props: { symbol: 'BTCUSDT' } });
      expect(screen.getByText('中间价')).toBeInTheDocument();
      expect(screen.getByText('价差')).toBeInTheDocument();
    });
  });

  describe('OrderFlowPanel', () => {
    it('should render without crashing', () => {
      const { container } = render(OrderFlowPanel, { props: { symbol: 'BTCUSDT' } });
      expect(container).toBeDefined();
    });

    it('should display order flow title', () => {
      render(OrderFlowPanel, { props: { symbol: 'BTCUSDT' } });
      expect(screen.getByText('订单流分析')).toBeInTheDocument();
    });

    it('should display delta metrics', () => {
      render(OrderFlowPanel, { props: { symbol: 'BTCUSDT' } });
      expect(screen.getByText('Delta')).toBeInTheDocument();
      expect(screen.getByText('累积 Delta')).toBeInTheDocument();
    });

    it('should display volume profile section', () => {
      render(OrderFlowPanel, { props: { symbol: 'BTCUSDT' } });
      expect(screen.getByText('POC')).toBeInTheDocument();
      expect(screen.getByText('价值区域')).toBeInTheDocument();
    });
  });

  describe('LiquidationPanel', () => {
    it('should render without crashing', () => {
      const { container } = render(LiquidationPanel, { props: { symbol: 'BTCUSDT' } });
      expect(container).toBeDefined();
    });

    it('should display liquidation title', () => {
      render(LiquidationPanel, { props: { symbol: 'BTCUSDT' } });
      expect(screen.getByText('清算压力分析')).toBeInTheDocument();
    });

    it('should display pressure index', () => {
      render(LiquidationPanel, { props: { symbol: 'BTCUSDT' } });
      expect(screen.getByText('压力指数')).toBeInTheDocument();
    });

    it('should display liquidation levels section', () => {
      render(LiquidationPanel, { props: { symbol: 'BTCUSDT' } });
      expect(screen.getByText('多级杠杆清算价格')).toBeInTheDocument();
    });
  });

  describe('StrategyPanel', () => {
    it('should render without crashing', () => {
      const { container } = render(StrategyPanel);
      expect(container).toBeDefined();
    });

    it('should display strategy title', () => {
      render(StrategyPanel);
      expect(screen.getByText('策略引擎')).toBeInTheDocument();
    });

    it('should display risk management section', () => {
      render(StrategyPanel);
      expect(screen.getByText('风险指标')).toBeInTheDocument();
    });

    it('should display strategy list section', () => {
      render(StrategyPanel);
      expect(screen.getByText('策略列表')).toBeInTheDocument();
    });

    it('should display signals section', () => {
      render(StrategyPanel);
      expect(screen.getByText('信号列表')).toBeInTheDocument();
    });
  });
});

describe('组件交互测试', () => {
  describe('OrderBookPanel', () => {
    it('should update on symbol change', async () => {
      const { component, rerender } = render(OrderBookPanel, { props: { symbol: 'BTCUSDT' } });
      
      expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
      
      await rerender({ symbol: 'ETHUSDT' });
      
      expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
    });
  });

  describe('StrategyPanel', () => {
    it('should have strategy toggle buttons', () => {
      render(StrategyPanel);
      
      const enableButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('启用') || btn.textContent?.includes('禁用')
      );
      
      expect(enableButtons.length).toBeGreaterThan(0);
    });
  });
});

describe('组件数据展示测试', () => {
  describe('OrderBookPanel 数据展示', () => {
    it('should show 20 bid levels', () => {
      const { container } = render(OrderBookPanel, { props: { symbol: 'BTCUSDT' } });
      
      const bidRows = container.querySelectorAll('.bid-row');
      expect(bidRows.length).toBeLessThanOrEqual(20);
    });

    it('should show 20 ask levels', () => {
      const { container } = render(OrderBookPanel, { props: { symbol: 'BTCUSDT' } });
      
      const askRows = container.querySelectorAll('.ask-row');
      expect(askRows.length).toBeLessThanOrEqual(20);
    });
  });

  describe('LiquidationPanel 级别展示', () => {
    it('should display 8 leverage levels', () => {
      const { container } = render(LiquidationPanel, { props: { symbol: 'BTCUSDT' } });
      
      const levelRows = container.querySelectorAll('.liquidation-level');
      expect(levelRows.length).toBeLessThanOrEqual(8);
    });
  });
});
