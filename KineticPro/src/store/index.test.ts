import { describe, it, expect, beforeEach } from 'vitest';
import { useKineticStore } from '@/store';
import { generateSwingSnapshot, generateBiomechanicsMetrics, generateAlignmentResult, generateSwingTrajectory } from '@/engine/mockData';

describe('Zustand Store - 全局状态管理', () => {
  beforeEach(() => {
    const store = useKineticStore.getState();
    useKineticStore.setState({
      engineStatus: { state: 'idle', queueSize: 0, throughput: 0, avgLatency: 0, lastFrameIndex: 0 },
      collectionStatus: { connected: false, fps: 0, alignmentScore: 0, engineLatency: 0 },
      currentTrajectory: null,
      currentMetrics: null,
      currentAlignment: null,
      currentFrames: [],
      snapshots: [],
      isCollecting: false,
      playbackFrame: 0,
      playbackSpeed: 1,
      isPlaying: false,
    });
  });

  it('初始状态应正确', () => {
    const state = useKineticStore.getState();
    expect(state.currentTrajectory).toBeNull();
    expect(state.currentMetrics).toBeNull();
    expect(state.currentAlignment).toBeNull();
    expect(state.isCollecting).toBe(false);
    expect(state.snapshots).toHaveLength(0);
    expect(state.playbackFrame).toBe(0);
  });

  it('loadDemoData 应加载演示数据', () => {
    useKineticStore.getState().loadDemoData();
    const state = useKineticStore.getState();
    expect(state.currentTrajectory).not.toBeNull();
    expect(state.currentMetrics).not.toBeNull();
    expect(state.currentAlignment).not.toBeNull();
    expect(state.snapshots.length).toBeGreaterThan(0);
    expect(state.collectionStatus.connected).toBe(true);
  });

  it('loadDemoData 加载的轨迹应包含完整的挥杆阶段', () => {
    useKineticStore.getState().loadDemoData();
    const state = useKineticStore.getState();
    expect(state.currentTrajectory!.phases).toHaveLength(5);
    expect(state.currentTrajectory!.clubHeadPath).toHaveLength(120);
  });

  it('loadDemoData 加载的指标应包含完整子维度', () => {
    useKineticStore.getState().loadDemoData();
    const state = useKineticStore.getState();
    expect(state.currentMetrics!.subScores).toHaveProperty('rhythmConsistency');
    expect(state.currentMetrics!.subScores).toHaveProperty('cogStability');
    expect(state.currentMetrics!.subScores).toHaveProperty('jointCoordination');
  });

  it('saveSnapshot 应将当前数据保存到快照列表', () => {
    useKineticStore.getState().loadDemoData();
    const before = useKineticStore.getState().snapshots.length;
    useKineticStore.getState().saveSnapshot();
    const after = useKineticStore.getState().snapshots.length;
    expect(after).toBe(before + 1);
  });

  it('saveSnapshot 无数据时不应添加快照', () => {
    useKineticStore.getState().saveSnapshot();
    expect(useKineticStore.getState().snapshots).toHaveLength(0);
  });

  it('deleteSnapshot 应从列表中移除指定快照', () => {
    useKineticStore.getState().loadDemoData();
    useKineticStore.getState().saveSnapshot();
    const id = useKineticStore.getState().snapshots[0].id;
    useKineticStore.getState().deleteSnapshot(id);
    expect(useKineticStore.getState().snapshots.find(s => s.id === id)).toBeUndefined();
  });

  it('setPlaybackFrame 应更新回放帧号', () => {
    useKineticStore.getState().setPlaybackFrame(50);
    expect(useKineticStore.getState().playbackFrame).toBe(50);
  });

  it('setPlaybackSpeed 应更新回放速度', () => {
    useKineticStore.getState().setPlaybackSpeed(2);
    expect(useKineticStore.getState().playbackSpeed).toBe(2);
  });

  it('togglePlayback 应切换播放状态', () => {
    expect(useKineticStore.getState().isPlaying).toBe(false);
    useKineticStore.getState().togglePlayback();
    expect(useKineticStore.getState().isPlaying).toBe(true);
    useKineticStore.getState().togglePlayback();
    expect(useKineticStore.getState().isPlaying).toBe(false);
  });

  it('loadSnapshots 应替换整个快照列表', () => {
    const snaps = [generateSwingSnapshot(), generateSwingSnapshot()];
    useKineticStore.getState().loadSnapshots(snaps);
    expect(useKineticStore.getState().snapshots).toHaveLength(2);
  });
});

describe('Zustand Store - 数据采集流程', () => {
  beforeEach(() => {
    useKineticStore.setState({
      isCollecting: false,
      currentFrames: [],
      currentTrajectory: null,
      currentMetrics: null,
      currentAlignment: null,
    });
  });

  it('startCollection 应重置当前数据并标记采集中', () => {
    useKineticStore.getState().loadDemoData();
    useKineticStore.getState().startCollection();
    const state = useKineticStore.getState();
    expect(state.isCollecting).toBe(true);
    expect(state.currentFrames).toHaveLength(0);
    expect(state.currentTrajectory).toBeNull();
    expect(state.currentMetrics).toBeNull();
  });

  it('stopCollection 应停止采集状态', () => {
    useKineticStore.getState().startCollection();
    useKineticStore.getState().stopCollection();
    expect(useKineticStore.getState().isCollecting).toBe(false);
  });
});
