import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { engine, SemanticAligner, BiomechanicsExtractor } from '@/engine/index';
import type { KeypointFrame } from '@/types';
import { generateKeypointFrames } from '@/engine/mockData';

describe('KeypointRecognitionEngine - 异步关键点识别引擎', () => {
  beforeEach(() => {
    engine.stop();
  });

  afterEach(() => {
    engine.stop();
  });

  it('初始状态应为非运行', () => {
    expect(engine.getIsRunning()).toBe(false);
  });

  it('调用 start 后应进入运行状态', () => {
    engine.start();
    expect(engine.getIsRunning()).toBe(true);
  });

  it('调用 stop 后应停止运行', () => {
    engine.start();
    engine.stop();
    expect(engine.getIsRunning()).toBe(false);
  });

  it('启动后应触发 status 事件', () => {
    const handler = vi.fn();
    const unsub = engine.on('status', handler);
    engine.start();
    expect(handler).toHaveBeenCalled();
    const status = handler.mock.calls[0][0] as { state: string };
    expect(status.state).toBe('processing');
    unsub();
  });

  it('启动后应持续触发 frame 事件推送关键点帧', async () => {
    const handler = vi.fn();
    const unsub = engine.on('frame', handler);
    engine.start();
    await new Promise(r => setTimeout(r, 200));
    expect(handler.mock.calls.length).toBeGreaterThan(3);
    unsub();
    engine.stop();
  });

  it('每帧数据应包含关键点和帧索引', async () => {
    const handler = vi.fn();
    const unsub = engine.on('frame', handler);
    engine.start();
    await new Promise(r => setTimeout(r, 150));
    unsub();
    engine.stop();
    const frame = handler.mock.calls[0][0] as KeypointFrame;
    expect(frame).toHaveProperty('frameIndex');
    expect(frame).toHaveProperty('keypoints');
    expect(frame).toHaveProperty('confidence');
    expect(frame).toHaveProperty('timestamp');
  });

  it('采集完成后应触发 trajectory 和 alignment 事件', async () => {
    const trajHandler = vi.fn();
    const alignHandler = vi.fn();
    const metricsHandler = vi.fn();
    engine.on('trajectory', trajHandler);
    engine.on('alignment', alignHandler);
    engine.on('metrics', metricsHandler);
    engine.start();
    await new Promise(r => setTimeout(r, 5000));
    expect(trajHandler).toHaveBeenCalled();
    expect(alignHandler).toHaveBeenCalled();
    expect(metricsHandler).toHaveBeenCalled();
  }, 10000);

  it('停止后应触发 idle 状态事件', () => {
    const handler = vi.fn();
    engine.on('status', handler);
    engine.start();
    handler.mockClear();
    engine.stop();
    const lastCall = handler.mock.calls[handler.mock.calls.length - 1];
    const status = lastCall[0] as { state: string };
    expect(status.state).toBe('idle');
  });

  it('事件订阅取消后不再收到回调', async () => {
    const handler = vi.fn();
    const unsub = engine.on('frame', handler);
    engine.start();
    await new Promise(r => setTimeout(r, 100));
    const countBefore = handler.mock.calls.length;
    unsub();
    await new Promise(r => setTimeout(r, 100));
    expect(handler.mock.calls.length).toBe(countBefore);
    engine.stop();
  });
});

describe('SemanticAligner - 语义对齐器', () => {
  it('应对齐源数据和目标模式，返回对齐结果', () => {
    const source = {
      club_head_pos: [0, 0, 0],
      cog_pos: [0, 0.9, 0],
      velocity: 25,
    };
    const targets = ['club_head_pos', 'cog_pos', 'velocity'];
    const result = SemanticAligner.align(source, targets);
    expect(result.alignmentScore).toBeGreaterThan(0);
    expect(result.fieldMappings).toHaveLength(3);
    expect(result.deviationHeatmap).toHaveLength(3);
  });

  it('未匹配字段的置信度应较低', () => {
    const source = { foo: 1, bar: 2 };
    const targets = ['completely_different'];
    const result = SemanticAligner.align(source, targets);
    expect(result.fieldMappings[0].confidence).toBeLessThan(0.5);
  });

  it('相似字段名应获得较高置信度', () => {
    const source = { club_head_pos: [0, 0, 0] };
    const targets = ['club_head_pos'];
    const result = SemanticAligner.align(source, targets);
    expect(result.fieldMappings[0].confidence).toBeGreaterThan(0.5);
  });
});

describe('BiomechanicsExtractor - 生物力学参数提取器', () => {
  const sampleFrames = generateKeypointFrames(30);

  it('应计算各帧的重心位置', () => {
    const cogPath = BiomechanicsExtractor.computeCenterOfGravity(sampleFrames);
    expect(cogPath).toHaveLength(30);
    cogPath.forEach(pos => {
      expect(pos).toHaveLength(3);
    });
  });

  it('重心 Y 坐标应在 0.8-1.2 范围内（站立姿态）', () => {
    const cogPath = BiomechanicsExtractor.computeCenterOfGravity(sampleFrames);
    cogPath.forEach(pos => {
      expect(pos[1]).toBeGreaterThan(0.5);
      expect(pos[1]).toBeLessThan(1.5);
    });
  });

  it('应计算角速度序列', () => {
    const angularVel = BiomechanicsExtractor.computeAngularVelocity(sampleFrames);
    expect(angularVel).toHaveLength(30);
    expect(angularVel[0]).toBe(0);
  });

  it('应检测异常点', () => {
    const values = [10, 10, 10, 10, 100, 10, 10, 10, 10, 10];
    const anomalies = BiomechanicsExtractor.detectAnomalies(values, 2);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].index).toBe(4);
    expect(anomalies[0].severity).toBeGreaterThan(0);
  });

  it('恒定值序列不应有异常', () => {
    const values = Array(20).fill(5);
    const anomalies = BiomechanicsExtractor.detectAnomalies(values);
    expect(anomalies).toHaveLength(0);
  });
});
