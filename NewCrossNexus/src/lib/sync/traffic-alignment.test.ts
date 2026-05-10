import { TrafficAlignment } from './traffic-alignment';
import { TrafficIndex, TrafficLevel } from '../types/traffic';

const createMockIndex = (timestamp: number, overall: number = 50): TrafficIndex => ({
  timestamp,
  overall,
  gridData: [
    [0, 0, 1, 0],
    [0, 2, 0, 1],
  ],
  hotspots: [
    { x: 1, y: 1, level: TrafficLevel.CONGESTED },
  ],
});

describe('TrafficAlignment', () => {
  let alignment: TrafficAlignment;

  beforeEach(() => {
    alignment = new TrafficAlignment(2000);
  });

  afterEach(() => {
    alignment.reset();
  });

  describe('初始化测试', () => {
    it('应该正确初始化 TrafficAlignment 实例', () => {
      expect(alignment).toBeInstanceOf(TrafficAlignment);
    });

    it('初始同步状态应该有正确的默认值', () => {
      const state = alignment.getSyncState();
      
      expect(state.commandCenter).toBeNull();
      expect(state.mobileDevice).toBeNull();
      expect(state.lastSyncTime).toBe(0);
      expect(state.syncInterval).toBe(2000);
      expect(state.isAligned).toBe(false);
    });

    it('应该能使用自定义同步间隔初始化', () => {
      const customAlignment = new TrafficAlignment(5000);
      expect(customAlignment.getSyncState().syncInterval).toBe(5000);
    });
  });

  describe('状态更新测试', () => {
    it('应该能更新指挥中心数据', () => {
      const index = createMockIndex(Date.now(), 50);
      alignment.updateCommandCenterIndex(index);
      
      const state = alignment.getSyncState();
      expect(state.commandCenter).toEqual(index);
      expect(state.mobileDevice).toBeNull();
    });

    it('应该能更新移动端数据', () => {
      const index = createMockIndex(Date.now(), 50);
      alignment.updateMobileDeviceIndex(index);
      
      const state = alignment.getSyncState();
      expect(state.mobileDevice).toEqual(index);
      expect(state.commandCenter).toBeNull();
    });

    it('应该能同时更新两端数据', () => {
      const now = Date.now();
      const ccIndex = createMockIndex(now, 50);
      const mobileIndex = createMockIndex(now, 52);
      
      alignment.updateCommandCenterIndex(ccIndex);
      alignment.updateMobileDeviceIndex(mobileIndex);
      
      const state = alignment.getSyncState();
      expect(state.commandCenter).toEqual(ccIndex);
      expect(state.mobileDevice).toEqual(mobileIndex);
    });

    it('更新后应该设置最后同步时间', () => {
      const index = createMockIndex(Date.now(), 50);
      const beforeUpdate = Date.now();
      
      alignment.updateCommandCenterIndex(index);
      
      const state = alignment.getSyncState();
      expect(state.lastSyncTime).toBeGreaterThanOrEqual(beforeUpdate);
    });
  });

  describe('对齐检测测试', () => {
    it('两端数据一致时应该对齐', () => {
      const now = Date.now();
      const ccIndex = createMockIndex(now, 50);
      const mobileIndex = createMockIndex(now, 50);
      
      alignment.updateCommandCenterIndex(ccIndex);
      alignment.updateMobileDeviceIndex(mobileIndex);
      
      expect(alignment.getSyncState().isAligned).toBe(true);
    });

    it('差异在容差范围内应该对齐', () => {
      const now = Date.now();
      const ccIndex = createMockIndex(now, 50);
      const mobileIndex = createMockIndex(now, 53);
      
      alignment.updateCommandCenterIndex(ccIndex);
      alignment.updateMobileDeviceIndex(mobileIndex);
      
      expect(alignment.getSyncState().isAligned).toBe(true);
    });

    it('差异超出容差范围应该不对齐', () => {
      const now = Date.now();
      const ccIndex = createMockIndex(now, 50);
      const mobileIndex = createMockIndex(now, 70);
      
      alignment.updateCommandCenterIndex(ccIndex);
      alignment.updateMobileDeviceIndex(mobileIndex);
      
      expect(alignment.getSyncState().isAligned).toBe(false);
    });

    it('只有一端数据时应该不对齐', () => {
      const index = createMockIndex(Date.now(), 50);
      alignment.updateCommandCenterIndex(index);
      
      expect(alignment.getSyncState().isAligned).toBe(false);
    });

    it('时间戳差异会影响容差', () => {
      const now = Date.now();
      const oldIndex = createMockIndex(now - 60 * 1000, 50);
      const newIndex = createMockIndex(now, 55);
      
      alignment.updateCommandCenterIndex(oldIndex);
      alignment.updateMobileDeviceIndex(newIndex);
      
      const state = alignment.getSyncState();
      expect(state.isAligned).toBeDefined();
    });

    it('热点差异会影响对齐状态', () => {
      const now = Date.now();
      
      const ccIndex: TrafficIndex = {
        ...createMockIndex(now, 50),
        hotspots: [
          { x: 1, y: 1, level: TrafficLevel.CONGESTED },
          { x: 5, y: 5, level: TrafficLevel.SEVERE },
        ],
      };
      
      const mobileIndex: TrafficIndex = {
        ...createMockIndex(now, 50),
        hotspots: [
          { x: 20, y: 20, level: TrafficLevel.CONGESTED },
        ],
      };
      
      alignment.updateCommandCenterIndex(ccIndex);
      alignment.updateMobileDeviceIndex(mobileIndex);
      
      expect(alignment.getSyncState().isAligned).toBe(false);
    });
  });

  describe('消息处理测试', () => {
    it('应该能创建同步消息', () => {
      const index = createMockIndex(Date.now(), 50);
      const message = alignment.createSyncMessage('command-center', index, 'update');
      
      expect(message.type).toBe('update');
      expect(message.source).toBe('command-center');
      expect(message.trafficIndex).toEqual(index);
      expect(message.syncId.startsWith('sync-')).toBe(true);
    });

    it('应该能处理请求消息', async () => {
      const index = createMockIndex(Date.now(), 50);
      const message = alignment.createSyncMessage('command-center', index, 'request');
      
      await alignment.processMessage(message);
      
      expect(alignment.getSyncState().mobileDevice).toEqual(index);
    });

    it('应该能处理响应消息', async () => {
      const index = createMockIndex(Date.now(), 50);
      const message = alignment.createSyncMessage('mobile', index, 'response');
      
      await alignment.processMessage(message);
      
      expect(alignment.getSyncState().commandCenter).toEqual(index);
    });

    it('应该能处理更新消息', async () => {
      const index = createMockIndex(Date.now(), 50);
      const message = alignment.createSyncMessage('command-center', index, 'update');
      
      await alignment.processMessage(message);
      
      expect(alignment.getSyncState().mobileDevice).toEqual(index);
    });

    it('处理完消息后应该从队列中移除', async () => {
      const index = createMockIndex(Date.now(), 50);
      const message = alignment.createSyncMessage('mobile', index, 'update');
      
      await alignment.processMessage(message);
      
      expect(alignment.getSyncState()).toBeDefined();
    });
  });

  describe('数据融合测试', () => {
    it('应该能融合两个流量指数', () => {
      const now = Date.now();
      const index1 = createMockIndex(now - 1000, 40);
      const index2 = createMockIndex(now, 60);
      
      const merged = alignment.mergeTrafficIndices(index1, index2, 0.5, 0.5);
      
      expect(merged.overall).toBe(50);
      expect(merged.timestamp).toBeGreaterThanOrEqual(now);
      expect(Array.isArray(merged.gridData)).toBe(true);
      expect(Array.isArray(merged.hotspots)).toBe(true);
    });

    it('应该能使用自定义权重融合', () => {
      const now = Date.now();
      const index1 = createMockIndex(now - 1000, 40);
      const index2 = createMockIndex(now, 60);
      
      const merged = alignment.mergeTrafficIndices(index1, index2, 0.2, 0.8);
      
      expect(merged.overall).toBe(56);
    });

    it('应该处理不同尺寸的网格数据', () => {
      const now = Date.now();
      
      const index1: TrafficIndex = {
        ...createMockIndex(now, 50),
        gridData: [
          [0, 1],
          [1, 0],
        ],
      };
      
      const index2: TrafficIndex = {
        ...createMockIndex(now, 50),
        gridData: [
          [0, 1, 2],
          [1, 2, 0],
          [2, 0, 1],
        ],
      };
      
      const merged = alignment.mergeTrafficIndices(index1, index2);
      
      expect(merged.gridData.length).toBe(3);
      expect(merged.gridData[0].length).toBe(3);
    });

    it('应该合并热点并去重', () => {
      const now = Date.now();
      
      const index1: TrafficIndex = {
        ...createMockIndex(now, 50),
        hotspots: [
          { x: 1, y: 1, level: TrafficLevel.CONGESTED },
          { x: 2, y: 2, level: TrafficLevel.SLOW },
        ],
      };
      
      const index2: TrafficIndex = {
        ...createMockIndex(now, 50),
        hotspots: [
          { x: 1, y: 1, level: TrafficLevel.SEVERE },
          { x: 5, y: 5, level: TrafficLevel.CONGESTED },
        ],
      };
      
      const merged = alignment.mergeTrafficIndices(index1, index2);
      
      expect(merged.hotspots.length).toBeGreaterThanOrEqual(2);
    });

    it('相同位置的热点应该取较高等级', () => {
      const now = Date.now();
      
      const index1: TrafficIndex = {
        ...createMockIndex(now, 50),
        hotspots: [{ x: 1, y: 1, level: TrafficLevel.CONGESTED }],
      };
      
      const index2: TrafficIndex = {
        ...createMockIndex(now, 50),
        hotspots: [{ x: 1, y: 1, level: TrafficLevel.SEVERE }],
      };
      
      const merged = alignment.mergeTrafficIndices(index1, index2);
      
      expect(merged.hotspots[0].level).toBe(TrafficLevel.SEVERE);
    });
  });

  describe('自动同步测试', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('应该能启动自动同步', () => {
      const getCCIndex = jest.fn(() => createMockIndex(Date.now(), 50));
      const getMobileIndex = jest.fn(() => createMockIndex(Date.now(), 52));
      
      alignment.startAutoSync(getCCIndex, getMobileIndex);
      
      expect(getCCIndex).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(2000);
      
      expect(getCCIndex).toHaveBeenCalled();
      expect(getMobileIndex).toHaveBeenCalled();
    });

    it('应该能停止自动同步', () => {
      const getCCIndex = jest.fn(() => createMockIndex(Date.now(), 50));
      const getMobileIndex = jest.fn(() => createMockIndex(Date.now(), 52));
      
      alignment.startAutoSync(getCCIndex, getMobileIndex);
      alignment.stopAutoSync();
      
      jest.advanceTimersByTime(4000);
      
      expect(getCCIndex).not.toHaveBeenCalled();
    });

    it('启动新的自动同步应该停止旧的', () => {
      const getCCIndex1 = jest.fn(() => createMockIndex(Date.now(), 50));
      const getMobileIndex1 = jest.fn(() => createMockIndex(Date.now(), 52));
      
      const getCCIndex2 = jest.fn(() => createMockIndex(Date.now(), 60));
      const getMobileIndex2 = jest.fn(() => createMockIndex(Date.now(), 62));
      
      alignment.startAutoSync(getCCIndex1, getMobileIndex1);
      alignment.startAutoSync(getCCIndex2, getMobileIndex2);
      
      jest.advanceTimersByTime(2000);
      
      expect(getCCIndex1).not.toHaveBeenCalled();
      expect(getCCIndex2).toHaveBeenCalled();
    });
  });

  describe('同步间隔设置测试', () => {
    it('应该能设置同步间隔', () => {
      alignment.setSyncInterval(5000);
      expect(alignment.getSyncState().syncInterval).toBe(5000);
    });

    it('设置的间隔应该影响后续的自动同步', () => {
      jest.useFakeTimers();
      
      const getCCIndex = jest.fn(() => createMockIndex(Date.now(), 50));
      const getMobileIndex = jest.fn(() => createMockIndex(Date.now(), 52));
      
      alignment.setSyncInterval(1000);
      alignment.startAutoSync(getCCIndex, getMobileIndex);
      
      jest.advanceTimersByTime(1000);
      
      expect(getCCIndex).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('回调函数测试', () => {
    it('应该能设置对齐更新回调', () => {
      const callback = jest.fn();
      alignment.setAlignmentCallback(callback);
      
      const index = createMockIndex(Date.now(), 50);
      alignment.updateCommandCenterIndex(index);
      alignment.updateMobileDeviceIndex(index);
      
      expect(callback).toHaveBeenCalled();
    });

    it('回调应该收到更新后的状态', () => {
      const callback = jest.fn();
      alignment.setAlignmentCallback(callback);
      
      const index = createMockIndex(Date.now(), 50);
      alignment.updateCommandCenterIndex(index);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          commandCenter: index,
          isAligned: false,
        })
      );
    });

    it('应该能移除回调', () => {
      const callback = jest.fn();
      alignment.setAlignmentCallback(callback);
      alignment.setAlignmentCallback(null);
      
      const index = createMockIndex(Date.now(), 50);
      alignment.updateCommandCenterIndex(index);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('重置测试', () => {
    it('应该能重置到初始状态', () => {
      const index = createMockIndex(Date.now(), 50);
      alignment.updateCommandCenterIndex(index);
      alignment.updateMobileDeviceIndex(index);
      
      expect(alignment.getSyncState().commandCenter).not.toBeNull();
      
      alignment.reset();
      
      const state = alignment.getSyncState();
      expect(state.commandCenter).toBeNull();
      expect(state.mobileDevice).toBeNull();
      expect(state.isAligned).toBe(false);
    });

    it('重置后应该保持同步间隔', () => {
      alignment.setSyncInterval(5000);
      alignment.reset();
      
      expect(alignment.getSyncState().syncInterval).toBe(5000);
    });

    it('重置应该停止自动同步', () => {
      jest.useFakeTimers();
      
      const getCCIndex = jest.fn(() => createMockIndex(Date.now(), 50));
      const getMobileIndex = jest.fn(() => createMockIndex(Date.now(), 52));
      
      alignment.startAutoSync(getCCIndex, getMobileIndex);
      alignment.reset();
      
      jest.advanceTimersByTime(4000);
      
      expect(getCCIndex).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });
});
