import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketClient } from '../../data/WebSocketClient';

vi.mock('../../storage/IndexedDBStore', () => ({
  dbStore: {
    updateKlineIncremental: vi.fn().mockResolvedValue(true),
    insertOrderBook: vi.fn().mockResolvedValue(undefined),
    insertOrderFlow: vi.fn().mockResolvedValue(undefined),
  }
}));

describe('WebSocketClient - WebSocket 数据接入层', () => {
  let wsClient: WebSocketClient;

  beforeEach(() => {
    vi.useRealTimers();
    wsClient = new WebSocketClient({
      symbol: 'BTCUSDT',
      simulationMode: true,
      pingInterval: 30000
    });
  });

  afterEach(async () => {
    wsClient.disconnectAll();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('连接管理', () => {
    it('should initialize with correct configuration', () => {
      expect(wsClient).toBeDefined();
      expect(wsClient['config'].symbol).toBe('BTCUSDT');
      expect(wsClient['config'].simulationMode).toBe(true);
    });

    it('should connect to all data streams in simulation mode', async () => {
      await wsClient.connectAll();
      
      expect(wsClient.getConnectionStatus('kline')).toBe(true);
      expect(wsClient.getConnectionStatus('orderbook')).toBe(true);
      expect(wsClient.getConnectionStatus('trades')).toBe(true);
      expect(wsClient.getConnectionStatus('liquidation')).toBe(true);
    });

    it('should disconnect from all streams', async () => {
      await wsClient.connectAll();
      wsClient.disconnectAll();
      
      expect(wsClient.getConnectionStatus('kline')).toBe(false);
      expect(wsClient.getConnectionStatus('orderbook')).toBe(false);
    });

    it('should connect to specific type', async () => {
      await wsClient.connect('kline');
      
      expect(wsClient.getConnectionStatus('kline')).toBe(true);
      expect(wsClient.getConnectionStatus('orderbook')).toBe(false);
    });

    it('should disconnect from specific type', async () => {
      await wsClient.connectAll();
      wsClient.disconnect('kline');
      
      expect(wsClient.getConnectionStatus('kline')).toBe(false);
      expect(wsClient.getConnectionStatus('orderbook')).toBe(true);
    });
  });

  describe('事件订阅', () => {
    it('should subscribe to events and return unsubscribe function', () => {
      const mockCallback = vi.fn();
      const unsubscribe = wsClient.on('kline', mockCallback);
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should handle multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsub1 = wsClient.on('kline', callback1);
      const unsub2 = wsClient.on('kline', callback2);
      
      expect(typeof unsub1).toBe('function');
      expect(typeof unsub2).toBe('function');
      
      unsub1();
      unsub2();
    });
  });

  describe('延迟计算', () => {
    it('should return -1 when not connected', () => {
      expect(wsClient.getLatency('kline')).toBe(-1);
    });

    it('should calculate latency when connected', async () => {
      await wsClient.connect('kline');
      
      const latency = wsClient.getLatency('kline');
      expect(latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('模拟数据生成验证', () => {
    it('should emit kline events in simulation mode', async () => {
      const klineData: any[] = [];
      const unsub = wsClient.on('kline', (data: any) => klineData.push(data));
      
      await wsClient.connect('kline');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      expect(klineData.length).toBeGreaterThan(0);
      expect(klineData[0]).toHaveProperty('symbol');
      expect(klineData[0]).toHaveProperty('kline');
      expect(klineData[0].kline).toHaveProperty('time');
      expect(klineData[0].kline).toHaveProperty('open');
      expect(klineData[0].kline).toHaveProperty('close');
      
      unsub();
    });

    it('should emit orderbook events in simulation mode', async () => {
      const orderBookData: any[] = [];
      const unsub = wsClient.on('orderbook', (data: any) => orderBookData.push(data));
      
      await wsClient.connect('orderbook');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      expect(orderBookData.length).toBeGreaterThan(0);
      expect(orderBookData[0]).toHaveProperty('bids');
      expect(orderBookData[0]).toHaveProperty('asks');
      expect(orderBookData[0].bids.length).toBe(20);
      expect(orderBookData[0].asks.length).toBe(20);
      
      unsub();
    });

    it('should emit trade events in simulation mode', async () => {
      const tradeData: any[] = [];
      const unsub = wsClient.on('trades', (data: any) => tradeData.push(data));
      
      await wsClient.connect('trades');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      expect(tradeData.length).toBeGreaterThan(0);
      expect(tradeData[0]).toHaveProperty('id');
      expect(tradeData[0]).toHaveProperty('price');
      expect(tradeData[0]).toHaveProperty('quantity');
      expect(tradeData[0]).toHaveProperty('side');
      
      unsub();
    });

    it('should generate valid kline data structure', async () => {
      const klineData: any[] = [];
      const unsub = wsClient.on('kline', (data: any) => klineData.push(data));
      
      await wsClient.connect('kline');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (klineData.length > 0) {
        const kline = klineData[0].kline;
        expect(kline.high).toBeGreaterThanOrEqual(Math.min(kline.open, kline.close));
        expect(kline.low).toBeLessThanOrEqual(Math.max(kline.open, kline.close));
        expect(kline.volume).toBeGreaterThan(0);
      }
      
      unsub();
    });

    it('should generate valid orderbook structure', async () => {
      const orderBookData: any[] = [];
      const unsub = wsClient.on('orderbook', (data: any) => orderBookData.push(data));
      
      await wsClient.connect('orderbook');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (orderBookData.length > 0) {
        const ob = orderBookData[0];
        expect(ob.midPrice).toBeGreaterThan(0);
        expect(ob.spread).toBeGreaterThan(0);
        expect(ob.bids[0].price).toBeGreaterThan(ob.bids[1].price);
        expect(ob.asks[0].price).toBeLessThan(ob.asks[1].price);
      }
      
      unsub();
    });
  });

  describe('重连机制', () => {
    it('should handle connection loss gracefully', async () => {
      await wsClient.connect('kline');
      expect(wsClient.getConnectionStatus('kline')).toBe(true);
      
      wsClient.disconnect('kline');
      expect(wsClient.getConnectionStatus('kline')).toBe(false);
      
      await wsClient.connect('kline');
      expect(wsClient.getConnectionStatus('kline')).toBe(true);
    });
  });

  describe('模拟数据的 isConnected 状态', () => {
    it('should set isConnected when starting simulation', async () => {
      expect(wsClient.getConnectionStatus('kline')).toBe(false);
      
      await wsClient.connect('kline');
      
      expect(wsClient.getConnectionStatus('kline')).toBe(true);
    });

    it('should clear isConnected when disconnecting simulation', async () => {
      await wsClient.connect('kline');
      expect(wsClient.getConnectionStatus('kline')).toBe(true);
      
      wsClient.disconnect('kline');
      
      expect(wsClient.getConnectionStatus('kline')).toBe(false);
    });
  });
});
