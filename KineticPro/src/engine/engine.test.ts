import { describe, it, expect } from 'vitest';
import {
  generateSwingTrajectory,
  generateBiomechanicsMetrics,
  generateAlignmentResult,
  generateKeypointFrames,
  generateSwingSnapshot,
} from '@/engine/mockData';

describe('MockData 生成器 - 挥杆轨迹数据', () => {
  it('应生成完整的挥杆轨迹，包含 120 帧杆头路径和重心路径', () => {
    const trajectory = generateSwingTrajectory();
    expect(trajectory.clubHeadPath).toHaveLength(120);
    expect(trajectory.centerOfGravityPath).toHaveLength(120);
    expect(trajectory.id).toBeTruthy();
    expect(trajectory.startTime).toBeLessThanOrEqual(trajectory.endTime);
  });

  it('应包含 5 个挥杆阶段（address/backswing/downswing/impact/follow_through）', () => {
    const trajectory = generateSwingTrajectory();
    expect(trajectory.phases).toHaveLength(5);
    const names = trajectory.phases.map(p => p.name);
    expect(names).toEqual(['address', 'backswing', 'downswing', 'impact', 'follow_through']);
  });

  it('各阶段帧范围应连续覆盖 0-119', () => {
    const trajectory = generateSwingTrajectory();
    expect(trajectory.phases[0].startFrame).toBe(0);
    expect(trajectory.phases[trajectory.phases.length - 1].endFrame).toBe(120);
    for (let i = 1; i < trajectory.phases.length; i++) {
      expect(trajectory.phases[i].startFrame).toBe(trajectory.phases[i - 1].endFrame);
    }
  });

  it('杆头路径坐标应为三维数组，值在合理范围内', () => {
    const trajectory = generateSwingTrajectory();
    trajectory.clubHeadPath.forEach(point => {
      expect(point).toHaveLength(3);
      point.forEach(v => {
        expect(typeof v).toBe('number');
        expect(Math.abs(v)).toBeLessThan(5);
      });
    });
  });

  it('重心路径坐标值应较小（位移量级）', () => {
    const trajectory = generateSwingTrajectory();
    trajectory.centerOfGravityPath.forEach(point => {
      expect(point).toHaveLength(3);
      expect(Math.abs(point[0])).toBeLessThan(0.5);
      expect(Math.abs(point[2])).toBeLessThan(0.5);
    });
  });

  it('使用自定义 id 时应正确传递', () => {
    const trajectory = generateSwingTrajectory('custom-id');
    expect(trajectory.id).toBe('custom-id');
  });
});

describe('MockData 生成器 - 生物力学参数', () => {
  it('应生成完整的生物力学指标数据', () => {
    const metrics = generateBiomechanicsMetrics();
    expect(metrics.angularVelocity.timestamps).toHaveLength(120);
    expect(metrics.angularVelocity.values).toHaveLength(120);
    expect(metrics.linearVelocity.timestamps).toHaveLength(120);
    expect(metrics.centerOfGravityDisplacement.timestamps).toHaveLength(120);
    expect(metrics.jointTorques.length).toBeGreaterThanOrEqual(1);
  });

  it('稳定性评分应在 55-95 范围内', () => {
    for (let i = 0; i < 10; i++) {
      const metrics = generateBiomechanicsMetrics();
      expect(metrics.stabilityScore).toBeGreaterThanOrEqual(55);
      expect(metrics.stabilityScore).toBeLessThanOrEqual(95);
    }
  });

  it('子维度评分（节奏一致性/重心稳定性/关节协调性）应在合理范围', () => {
    const metrics = generateBiomechanicsMetrics();
    expect(metrics.subScores.rhythmConsistency).toBeGreaterThanOrEqual(50);
    expect(metrics.subScores.rhythmConsistency).toBeLessThanOrEqual(95);
    expect(metrics.subScores.cogStability).toBeGreaterThanOrEqual(55);
    expect(metrics.subScores.cogStability).toBeLessThanOrEqual(90);
    expect(metrics.subScores.jointCoordination).toBeGreaterThanOrEqual(60);
    expect(metrics.subScores.jointCoordination).toBeLessThanOrEqual(95);
  });

  it('时序数据应包含异常点标注', () => {
    const metrics = generateBiomechanicsMetrics();
    expect(metrics.angularVelocity.anomalies.length).toBeGreaterThan(0);
    metrics.angularVelocity.anomalies.forEach(a => {
      expect(a.index).toBeGreaterThanOrEqual(0);
      expect(a.index).toBeLessThan(120);
      expect(a.severity).toBeGreaterThan(0);
      expect(a.severity).toBeLessThanOrEqual(1);
    });
  });
});

describe('MockData 生成器 - 语义对齐结果', () => {
  it('应生成 6 组字段映射关系', () => {
    const alignment = generateAlignmentResult();
    expect(alignment.fieldMappings).toHaveLength(6);
  });

  it('每条映射应包含源字段、目标字段、置信度和偏差', () => {
    const alignment = generateAlignmentResult();
    alignment.fieldMappings.forEach(m => {
      expect(m.sourceField).toBeTruthy();
      expect(m.targetField).toBeTruthy();
      expect(m.confidence).toBeGreaterThan(0);
      expect(m.confidence).toBeLessThanOrEqual(1);
      expect(m.deviation).toBeGreaterThanOrEqual(0);
    });
  });

  it('对齐评分应为所有字段置信度的平均值', () => {
    const alignment = generateAlignmentResult();
    const expectedAvg = alignment.fieldMappings.reduce((s, m) => s + m.confidence, 0) / alignment.fieldMappings.length;
    expect(alignment.alignmentScore).toBeCloseTo(expectedAvg, 5);
  });

  it('偏差热力图应为 6x6 矩阵', () => {
    const alignment = generateAlignmentResult();
    expect(alignment.deviationHeatmap).toHaveLength(6);
    alignment.deviationHeatmap.forEach(row => {
      expect(row).toHaveLength(6);
    });
  });

  it('对角线偏差值应较小（自身映射偏差低）', () => {
    const alignment = generateAlignmentResult();
    for (let i = 0; i < 6; i++) {
      expect(alignment.deviationHeatmap[i][i]).toBeLessThan(0.1);
    }
  });
});

describe('MockData 生成器 - 关键点帧序列', () => {
  it('应生成指定数量的关键点帧', () => {
    const frames = generateKeypointFrames(60);
    expect(frames).toHaveLength(60);
  });

  it('默认应生成 120 帧', () => {
    const frames = generateKeypointFrames();
    expect(frames).toHaveLength(120);
  });

  it('每帧应包含 17 个关键点', () => {
    const frames = generateKeypointFrames(10);
    frames.forEach(frame => {
      expect(frame.keypoints).toHaveLength(17);
    });
  });

  it('关键点应包含正确的位置和置信度', () => {
    const frames = generateKeypointFrames(5);
    frames.forEach(frame => {
      frame.keypoints.forEach(kp => {
        expect(kp.position).toHaveLength(3);
        expect(kp.confidence).toBeGreaterThan(0);
        expect(kp.confidence).toBeLessThanOrEqual(1);
      });
    });
  });
});

describe('MockData 生成器 - 挥杆快照', () => {
  it('应生成完整的挥杆快照，包含轨迹、指标和对齐数据', () => {
    const snapshot = generateSwingSnapshot();
    expect(snapshot.id).toBeTruthy();
    expect(snapshot.createdAt).toBeGreaterThan(0);
    expect(snapshot.trajectory.clubHeadPath).toHaveLength(120);
    expect(snapshot.metrics.stabilityScore).toBeGreaterThan(0);
    expect(snapshot.alignment.fieldMappings).toHaveLength(6);
    expect(snapshot.keypointFrames).toHaveLength(120);
    expect(snapshot.tags.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.rating).toBeGreaterThanOrEqual(50);
    expect(snapshot.rating).toBeLessThanOrEqual(100);
  });
});
