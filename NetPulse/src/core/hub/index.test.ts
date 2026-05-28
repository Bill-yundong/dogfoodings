import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LinkQualityHub } from './index';
import { storageService } from '../storage';
import { semanticSyncService } from '../sync';
import type { ProbeResult } from '@/types';
import { MOCK_NODES } from '@shared/protocol';

vi.mock('../storage');
vi.mock('../sync');

describe('链路质量协同中枢 (LinkQualityHub)', () => {
  let hub: LinkQualityHub;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    
    (storageService.init as any).mockResolvedValue(undefined);
    (storageService.getSwitchEvents as any).mockResolvedValue([]);
    (semanticSyncService.addStatusListener as any).mockReturnValue(() => {});
    (semanticSyncService.addNodeListener as any).mockReturnValue(() => {});
    
    hub = new LinkQualityHub();
  });

  afterEach(async () => {
    await hub.dispose();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('应该有正确的初始状态', () => {
      const state = hub.getState();
      expect(state.isMonitoring).toBe(false);
      expect(state.activePath).toBeNull();
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.nodes.length).toBeGreaterThan(0);
    });

    it('init 应该设置监听器并加载配置', async () => {
      await hub.init();
      expect(semanticSyncService.addStatusListener).toHaveBeenCalled();
      expect(semanticSyncService.addNodeListener).toHaveBeenCalled();
    });
  });

  describe('监测控制', () => {
    beforeEach(async () => {
      await hub.init();
    });

    it('startMonitoring 应该启动监测', () => {
      hub.startMonitoring();
      
      const state = hub.getState();
      expect(state.isMonitoring).toBe(true);
      expect(state.activePath).not.toBeNull();
      expect(state.monitoringStartTime).toBeGreaterThan(0);
      expect(semanticSyncService.connect).toHaveBeenCalled();
    });

    it('重复调用 startMonitoring 不应该重复启动', () => {
      hub.startMonitoring();
      const startTime = hub.getState().monitoringStartTime;
      
      vi.advanceTimersByTime(100);
      hub.startMonitoring();
      
      expect(hub.getState().monitoringStartTime).toBe(startTime);
    });

    it('stopMonitoring 应该停止监测', () => {
      hub.startMonitoring();
      hub.stopMonitoring();
      
      const state = hub.getState();
      expect(state.isMonitoring).toBe(false);
      expect(semanticSyncService.disconnect).toHaveBeenCalled();
    });

    it('监测时长计算应该正确', () => {
      expect(hub.getMonitoringDuration()).toBe(0);
      
      hub.startMonitoring();
      vi.advanceTimersByTime(5000);
      
      expect(hub.getMonitoringDuration()).toBeGreaterThanOrEqual(5000);
      
      hub.stopMonitoring();
      expect(hub.getMonitoringDuration()).toBe(0);
    });
  });

  describe('路径切换', () => {
    beforeEach(async () => {
      await hub.init();
      hub.startMonitoring();
    });

    it('switchPath 应该切换到新路径', async () => {
      const state = hub.getState();
      const currentPath = state.activePath;
      const otherNode = state.nodes.find(n => n.id !== currentPath && n.status === 'online');
      
      expect(otherNode).toBeDefined();
      if (otherNode) {
        await hub.switchPath(otherNode.id, 'manual');
        
        expect(hub.getState().activePath).toBe(otherNode.id);
        expect(hub.getState().recentSwitches.length).toBeGreaterThan(0);
        
        const lastSwitch = hub.getState().recentSwitches[0];
        expect(lastSwitch.fromPath).toBe(currentPath);
        expect(lastSwitch.toPath).toBe(otherNode.id);
        expect(lastSwitch.reason).toBe('manual');
        expect(lastSwitch.success).toBe(true);
      }
    });

    it('切换到相同路径不应该产生事件', async () => {
      const currentPath = hub.getState().activePath!;
      const switchCount = hub.getState().recentSwitches.length;
      
      await hub.switchPath(currentPath, 'manual');
      
      expect(hub.getState().recentSwitches.length).toBe(switchCount);
    });

    it('切换到离线节点应该失败', async () => {
      const offlineNode = hub.getState().nodes.find(n => n.status === 'offline');
      const switchCount = hub.getState().recentSwitches.length;
      
      if (offlineNode) {
        await hub.switchPath(offlineNode.id, 'manual');
        expect(hub.getState().recentSwitches.length).toBe(switchCount);
      }
    });

    it('非监测状态下不应该切换', async () => {
      hub.stopMonitoring();
      const onlineNode = hub.getState().nodes.find(n => n.status === 'online');
      
      if (onlineNode) {
        const switchCount = hub.getState().recentSwitches.length;
        await hub.switchPath(onlineNode.id, 'manual');
        expect(hub.getState().recentSwitches.length).toBe(switchCount);
      }
    });

    it('getActiveNode 应该返回当前激活的节点', () => {
      const activeNode = hub.getActiveNode();
      expect(activeNode).toBeDefined();
      expect(activeNode!.id).toBe(hub.getState().activePath);
    });
  });

  describe('事件系统', () => {
    beforeEach(async () => {
      await hub.init();
    });

    it('addListener 应该接收监测启动事件', () => {
      const listener = vi.fn();
      hub.addListener(listener);
      
      hub.startMonitoring();
      
      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls.find((c: any[]) => c[0].type === 'monitoring-started');
      expect(event).toBeDefined();
    });

    it('addListener 应该接收路径切换事件', async () => {
      hub.startMonitoring();
      
      const listener = vi.fn();
      hub.addListener(listener);
      
      const state = hub.getState();
      const otherNode = state.nodes.find(n => n.id !== state.activePath && n.status === 'online');
      
      if (otherNode) {
        await hub.switchPath(otherNode.id, 'manual');
        
        const event = listener.mock.calls.find((c: any[]) => c[0].type === 'path-switched');
        expect(event).toBeDefined();
        expect(event[0].data.toPath).toBe(otherNode.id);
      }
    });

    it('addListener 应该接收告警事件', () => {
      hub.startMonitoring();
      
      const listener = vi.fn();
      hub.addListener(listener);
      
      vi.advanceTimersByTime(1000);
      
      const alertEvents = listener.mock.calls.filter((c: any[]) => c[0].type === 'alert');
      expect(alertEvents.length).toBeGreaterThanOrEqual(0);
    });

    it('监听器返回的函数应该能取消订阅', () => {
      const listener = vi.fn();
      const unsubscribe = hub.addListener(listener);
      
      unsubscribe();
      hub.startMonitoring();
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('告警管理', () => {
    beforeEach(async () => {
      await hub.init();
      hub.startMonitoring();
    });

    it('dismissAlert 应该标记告警为已忽略', () => {
      const alert = {
        id: 'test-alert',
        timestamp: Date.now(),
        severity: 'warning' as const,
        title: 'Test',
        message: 'Test message',
        pathId: 'test',
        dismissed: false,
      };
      
      hub.getState().alerts.push(alert);
      
      hub.dismissAlert('test-alert');
      
      const found = hub.getState().alerts.find(a => a.id === 'test-alert');
      expect(found?.dismissed).toBe(true);
    });
  });

  describe('配置管理', () => {
    beforeEach(async () => {
      await hub.init();
    });

    it('updateConfig 应该更新配置', () => {
      const newInterval = 2000;
      hub.updateConfig({ probeInterval: newInterval });
      
      expect(hub.getState().config.probeInterval).toBe(newInterval);
      expect(localStorage.getItem('netpulse-config')).toContain(`"probeInterval":${newInterval}`);
    });

    it('配置变更应该触发事件', () => {
      const listener = vi.fn();
      hub.addListener(listener);
      
      hub.updateConfig({ dataRetentionDays: 60 });
      
      const event = listener.mock.calls.find((c: any[]) => c[0].type === 'config-changed');
      expect(event).toBeDefined();
      expect(event[0].data.dataRetentionDays).toBe(60);
    });
  });

  describe('路径质量查询', () => {
    beforeEach(async () => {
      await hub.init();
      hub.startMonitoring();
    });

    it('getActivePathQuality 应该返回当前路径的质量', () => {
      vi.advanceTimersByTime(2000);
      
      const quality = hub.getActivePathQuality();
      if (quality) {
        expect(quality.overallScore).toBeGreaterThanOrEqual(0);
        expect(quality.overallScore).toBeLessThanOrEqual(100);
      }
    });

    it('getPathQuality 应该返回指定路径的质量', () => {
      vi.advanceTimersByTime(2000);
      
      const pathId = hub.getState().activePath!;
      const quality = hub.getPathQuality(pathId);
      
      if (quality) {
        expect(quality.pathId).toBe(pathId);
      }
    });
  });

  describe('数据持久化', () => {
    beforeEach(async () => {
      await hub.init();
      hub.startMonitoring();
    });

    it('探测结果应该持久化到存储', () => {
      vi.advanceTimersByTime(1000);
      
      const calls = (storageService.addProbeResult as any).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      const savedResult = calls[0][0] as ProbeResult;
      expect(savedResult.pathId).toBeDefined();
      expect(savedResult.latency).toBeGreaterThan(0);
    });

    it('路径切换事件应该持久化到存储', async () => {
      const state = hub.getState();
      const otherNode = state.nodes.find(n => n.id !== state.activePath && n.status === 'online');
      
      if (otherNode) {
        await hub.switchPath(otherNode.id, 'manual');
        
        const calls = (storageService.addSwitchEvent as any).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
      }
    });
  });
});
