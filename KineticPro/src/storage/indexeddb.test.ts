import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveSnapshot,
  getSnapshot,
  getAllSnapshots,
  getSnapshotsByRating,
  deleteSnapshot,
  getSnapshotCount,
} from '@/storage/indexeddb';
import { generateSwingSnapshot } from '@/engine/mockData';
import type { SwingSnapshot } from '@/types';

describe('IndexedDB 持久化层 - 挥杆快照存储', () => {
  let snapshot: SwingSnapshot;

  beforeEach(() => {
    snapshot = generateSwingSnapshot();
  });

  it('应能保存并读取快照', async () => {
    await saveSnapshot(snapshot);
    const loaded = await getSnapshot(snapshot.id);
    expect(loaded).not.toBeUndefined();
    expect(loaded!.id).toBe(snapshot.id);
    expect(loaded!.rating).toBe(snapshot.rating);
  });

  it('读取不存在的快照应返回 undefined', async () => {
    const result = await getSnapshot('nonexistent_id');
    expect(result).toBeUndefined();
  });

  it('应能获取所有快照列表', async () => {
    const snap1 = generateSwingSnapshot();
    const snap2 = generateSwingSnapshot();
    await saveSnapshot(snap1);
    await saveSnapshot(snap2);
    const all = await getAllSnapshots();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('应能按评分筛选快照', async () => {
    const high = generateSwingSnapshot();
    high.rating = 95;
    const low = generateSwingSnapshot();
    low.rating = 50;
    await saveSnapshot(high);
    await saveSnapshot(low);
    const result = await getSnapshotsByRating(80);
    expect(result.every(s => s.rating >= 80)).toBe(true);
  });

  it('应能删除快照', async () => {
    await saveSnapshot(snapshot);
    const before = await getSnapshot(snapshot.id);
    expect(before).not.toBeUndefined();
    await deleteSnapshot(snapshot.id);
    const after = await getSnapshot(snapshot.id);
    expect(after).toBeUndefined();
  });

  it('应正确统计快照数量', async () => {
    const snap1 = generateSwingSnapshot();
    const snap2 = generateSwingSnapshot();
    await saveSnapshot(snap1);
    await saveSnapshot(snap2);
    const count = await getSnapshotCount();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('保存的快照应完整保留轨迹数据', async () => {
    await saveSnapshot(snapshot);
    const loaded = await getSnapshot(snapshot.id);
    expect(loaded!.trajectory.clubHeadPath).toHaveLength(120);
    expect(loaded!.trajectory.centerOfGravityPath).toHaveLength(120);
    expect(loaded!.trajectory.phases).toHaveLength(5);
  });

  it('保存的快照应完整保留生物力学指标', async () => {
    await saveSnapshot(snapshot);
    const loaded = await getSnapshot(snapshot.id);
    expect(loaded!.metrics.stabilityScore).toBe(snapshot.metrics.stabilityScore);
    expect(loaded!.metrics.subScores.rhythmConsistency).toBe(snapshot.metrics.subScores.rhythmConsistency);
    expect(loaded!.metrics.angularVelocity.values).toHaveLength(120);
  });

  it('保存的快照应完整保留语义对齐数据', async () => {
    await saveSnapshot(snapshot);
    const loaded = await getSnapshot(snapshot.id);
    expect(loaded!.alignment.alignmentScore).toBeCloseTo(snapshot.alignment.alignmentScore, 3);
    expect(loaded!.alignment.fieldMappings).toHaveLength(6);
    expect(loaded!.alignment.deviationHeatmap).toHaveLength(6);
  });
});
