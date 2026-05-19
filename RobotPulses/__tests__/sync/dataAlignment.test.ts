import {
  calculateChecksum,
  createDataFrame,
  verifyDataFrame,
  calculateDeviation,
  DataAlignmentBuffer,
  alignByTimestamp,
} from '@/lib/sync/dataAlignment';
import type { DataFrame } from '@/types/robot';

describe('数据对齐模块测试', () => {
  describe('校验和计算', () => {
    test('相同输入应产生相同校验和', () => {
      const joints = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      const checksum1 = calculateChecksum(joints);
      const checksum2 = calculateChecksum(joints);
      
      expect(checksum1).toBe(checksum2);
    });

    test('不同输入应产生不同校验和', () => {
      const joints1 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      const joints2 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.7];
      const checksum1 = calculateChecksum(joints1);
      const checksum2 = calculateChecksum(joints2);
      
      expect(checksum1).not.toBe(checksum2);
    });

    test('校验和应为字符串', () => {
      const joints = [0, 0, 0, 0, 0, 0];
      const checksum = calculateChecksum(joints);
      
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
    });
  });

  describe('数据帧创建', () => {
    test('应创建完整的数据帧', () => {
      const joints = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      const frame = createDataFrame('robot-01', 1, joints, 1000);
      
      expect(frame).toHaveProperty('frameNumber', 1);
      expect(frame).toHaveProperty('robotId', 'robot-01');
      expect(frame.joints).toEqual(joints);
      expect(frame.timestamp).toBe(1000);
      expect(frame.checksum).toBe(calculateChecksum(joints));
    });

    test('未提供时间戳时应使用当前时间', () => {
      const before = Date.now();
      const frame = createDataFrame('robot-01', 1, [0, 0, 0, 0, 0, 0]);
      const after = Date.now();
      
      expect(frame.timestamp).toBeGreaterThanOrEqual(before);
      expect(frame.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('数据帧验证', () => {
    test('完整的数据帧应通过验证', () => {
      const joints = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      const frame = createDataFrame('robot-01', 1, joints);
      
      expect(verifyDataFrame(frame)).toBe(true);
    });

    test('被篡改的数据帧应失败验证', () => {
      const joints = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      const frame = createDataFrame('robot-01', 1, joints);
      
      frame.joints[0] = 0.999;
      
      expect(verifyDataFrame(frame)).toBe(false);
    });

    test('校验和错误的数据帧应失败验证', () => {
      const frame: DataFrame = {
        frameNumber: 1,
        timestamp: Date.now(),
        robotId: 'robot-01',
        joints: [0, 0, 0, 0, 0, 0],
        checksum: 'invalid_checksum',
      };
      
      expect(verifyDataFrame(frame)).toBe(false);
    });
  });

  describe('偏差计算', () => {
    test('相同数据的偏差应为零', () => {
      const joints = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      const { deviations, maxDeviation } = calculateDeviation(joints, joints);
      
      expect(deviations).toEqual([0, 0, 0, 0, 0, 0]);
      expect(maxDeviation).toBe(0);
    });

    test('应正确计算各关节偏差', () => {
      const joints1 = [0, 0, 0, 0, 0, 0];
      const joints2 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      const { deviations, maxDeviation } = calculateDeviation(joints1, joints2);
      
      expect(deviations).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
      expect(maxDeviation).toBe(0.6);
    });

    test('偏差应为绝对值', () => {
      const joints1 = [0.5, 0, 0, 0, 0, 0];
      const joints2 = [0.3, 0, 0, 0, 0, 0];
      const { deviations } = calculateDeviation(joints1, joints2);
      
      expect(deviations[0]).toBe(0.2);
    });
  });

  describe('DataAlignmentBuffer', () => {
    let buffer: DataAlignmentBuffer;

    beforeEach(() => {
      buffer = new DataAlignmentBuffer(100, 0.001);
    });

    test('应正确添加主控帧', () => {
      const frame = createDataFrame('robot-01', 1, [0, 0, 0, 0, 0, 0]);
      buffer.addMasterFrame(frame);
      
      const sizes = buffer.getBufferSizes();
      expect(sizes.master).toBe(1);
    });

    test('应正确添加监控帧', () => {
      const frame = createDataFrame('robot-01', 1, [0, 0, 0, 0, 0, 0]);
      buffer.addMonitorFrame(frame);
      
      const sizes = buffer.getBufferSizes();
      expect(sizes.monitor).toBe(1);
    });

    test('相同帧号的帧应该能对齐', () => {
      const joints = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      const masterFrame = createDataFrame('robot-01', 1, joints);
      const monitorFrame = createDataFrame('robot-01', 1, joints);
      
      buffer.addMasterFrame(masterFrame);
      buffer.addMonitorFrame(monitorFrame);
      
      const alignedPairs = buffer.getAlignedPairs();
      expect(alignedPairs).toHaveLength(1);
      expect(alignedPairs[0].isAligned).toBe(true);
    });

    test('小偏差数据应判定为已对齐', () => {
      const masterJoints = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      const monitorJoints = [0.1000001, 0.2, 0.3, 0.4, 0.5, 0.6];
      
      buffer.addMasterFrame(createDataFrame('robot-01', 1, masterJoints));
      buffer.addMonitorFrame(createDataFrame('robot-01', 1, monitorJoints));
      
      const alignedPair = buffer.getLatestAlignedPair();
      expect(alignedPair?.isAligned).toBe(true);
    });

    test('大偏差数据应判定为未对齐', () => {
      const masterJoints = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      const monitorJoints = [0.2, 0.2, 0.3, 0.4, 0.5, 0.6];
      
      buffer.addMasterFrame(createDataFrame('robot-01', 1, masterJoints));
      buffer.addMonitorFrame(createDataFrame('robot-01', 1, monitorJoints));
      
      const alignedPair = buffer.getLatestAlignedPair();
      expect(alignedPair?.isAligned).toBe(false);
    });

    test('应返回最新的对齐对', () => {
      for (let i = 1; i <= 5; i++) {
        buffer.addMasterFrame(createDataFrame('robot-01', i, [i * 0.1, 0, 0, 0, 0, 0]));
        buffer.addMonitorFrame(createDataFrame('robot-01', i, [i * 0.1, 0, 0, 0, 0, 0]));
      }
      
      const latest = buffer.getLatestAlignedPair();
      expect(latest?.master.frameNumber).toBe(5);
    });

    test('应正确判断整体数据对齐状态', () => {
      buffer.addMasterFrame(createDataFrame('robot-01', 1, [0, 0, 0, 0, 0, 0]));
      buffer.addMonitorFrame(createDataFrame('robot-01', 1, [0, 0, 0, 0, 0, 0]));
      
      expect(buffer.isDataAligned(1)).toBe(true);
      expect(buffer.isDataAligned()).toBe(true);
    });

    test('不存在的帧号应返回 false', () => {
      expect(buffer.isDataAligned(999)).toBe(false);
    });

    test('清空后缓冲区应为空', () => {
      buffer.addMasterFrame(createDataFrame('robot-01', 1, [0, 0, 0, 0, 0, 0]));
      buffer.addMonitorFrame(createDataFrame('robot-01', 1, [0, 0, 0, 0, 0, 0]));
      buffer.clear();
      
      const sizes = buffer.getBufferSizes();
      expect(sizes.master).toBe(0);
      expect(sizes.monitor).toBe(0);
    });

    test('超出最大缓冲区大小时应自动裁剪', () => {
      const smallBuffer = new DataAlignmentBuffer(5, 0.001);
      
      for (let i = 1; i <= 10; i++) {
        smallBuffer.addMasterFrame(createDataFrame('robot-01', i, [0, 0, 0, 0, 0, 0]));
      }
      
      const sizes = smallBuffer.getBufferSizes();
      expect(sizes.master).toBeLessThanOrEqual(5);
    });
  });

  describe('基于时间戳的对齐', () => {
    test('应根据时间戳对齐数据帧', () => {
      const now = Date.now();
      const masterFrames: DataFrame[] = [
        createDataFrame('robot-01', 1, [0.1, 0, 0, 0, 0, 0], now),
        createDataFrame('robot-01', 2, [0.2, 0, 0, 0, 0, 0], now + 100),
        createDataFrame('robot-01', 3, [0.3, 0, 0, 0, 0, 0], now + 200),
      ];
      
      const monitorFrames: DataFrame[] = [
        createDataFrame('robot-01', 1, [0.1, 0, 0, 0, 0, 0], now + 10),
        createDataFrame('robot-01', 2, [0.2, 0, 0, 0, 0, 0], now + 110),
        createDataFrame('robot-01', 3, [0.3, 0, 0, 0, 0, 0], now + 210),
      ];
      
      const aligned = alignByTimestamp(masterFrames, monitorFrames, 50);
      expect(aligned.length).toBeGreaterThanOrEqual(2);
    });

    test('时间差过大的帧不应被对齐', () => {
      const now = Date.now();
      const masterFrames: DataFrame[] = [
        createDataFrame('robot-01', 1, [0.1, 0, 0, 0, 0, 0], now),
      ];
      
      const monitorFrames: DataFrame[] = [
        createDataFrame('robot-01', 1, [0.1, 0, 0, 0, 0, 0], now + 1000),
      ];
      
      const aligned = alignByTimestamp(masterFrames, monitorFrames, 50);
      expect(aligned).toHaveLength(0);
    });
  });
});
