import { renderHook, act } from '@testing-library/react';
import { useDeviceSync } from '../hooks/useDeviceSync';
import { trafficSystem } from '../coordination/greenWave';
import { TimeSlot } from '../types';

jest.mock('../coordination/greenWave', () => {
  const originalModule = jest.requireActual('../coordination/greenWave');
  return {
    ...originalModule,
    trafficSystem: {
      getAllAlignments: jest.fn(),
      saveAlignmentLog: jest.fn(),
      syncDevices: jest.fn()
    }
  };
});

describe('useDeviceSync Hook 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该初始化 alignmentStatus 为 null', () => {
    const { result } = renderHook(() => useDeviceSync());
    expect(result.current.alignmentStatus).toBeNull();
  });

  test('应该检查设备对齐状态', () => {
    trafficSystem.getAllAlignments.mockReturnValue({
      device_1: { isAligned: true, deviation: { offsetDiff: 0, cycleDiff: 0 } },
      device_2: { isAligned: true, deviation: { offsetDiff: 0, cycleDiff: 0 } }
    });

    const { result } = renderHook(() => useDeviceSync());

    let status;
    act(() => {
      status = result.current.checkAlignments();
    });

    expect(trafficSystem.getAllAlignments).toHaveBeenCalled();
    expect(status.allAligned).toBe(true);
    expect(status.totalDevices).toBe(2);
    expect(result.current.alignmentStatus).toEqual({
      allAligned: true,
      totalDevices: 2
    });
  });

  test('应该检测未对齐的设备', () => {
    trafficSystem.getAllAlignments.mockReturnValue({
      device_1: { isAligned: true, deviation: { offsetDiff: 0, cycleDiff: 0 } },
      device_2: { isAligned: false, deviation: { offsetDiff: 10, cycleDiff: 5 } },
      device_3: { isAligned: true, deviation: { offsetDiff: 0, cycleDiff: 0 } }
    });

    const { result } = renderHook(() => useDeviceSync());

    act(() => {
      result.current.checkAlignments();
    });

    expect(result.current.alignmentStatus.allAligned).toBe(false);
    expect(result.current.alignmentStatus.totalDevices).toBe(3);
  });

  test('应该同步设备并检查对齐', () => {
    trafficSystem.syncDevices.mockReturnValue([
      { deviceId: 'device_1', executedCommands: 1, status: { lastSync: Date.now() } }
    ]);

    trafficSystem.getAllAlignments.mockReturnValue({
      device_1: { isAligned: true, deviation: { offsetDiff: 0, cycleDiff: 0 } }
    });

    const { result } = renderHook(() => useDeviceSync());

    act(() => {
      result.current.syncDevices();
    });

    expect(trafficSystem.syncDevices).toHaveBeenCalled();
    expect(trafficSystem.getAllAlignments).toHaveBeenCalled();
    expect(result.current.alignmentStatus).toEqual({
      allAligned: true,
      totalDevices: 1
    });
  });

  test('应该清除对齐状态', () => {
    const { result } = renderHook(() => useDeviceSync());

    trafficSystem.getAllAlignments.mockReturnValue({
      device_1: { isAligned: true, deviation: { offsetDiff: 0, cycleDiff: 0 } }
    });

    act(() => {
      result.current.checkAlignments();
    });

    expect(result.current.alignmentStatus).not.toBeNull();

    act(() => {
      result.current.clearAlignmentStatus();
    });

    expect(result.current.alignmentStatus).toBeNull();
  });

  test('应该保存对齐日志', () => {
    const mockAlignment = {
      isAligned: true,
      deviation: { offsetDiff: 0.5, cycleDiff: 1 },
      expectedConfig: { offset: 25 },
      actualConfig: { offset: 25.5 }
    };

    trafficSystem.getAllAlignments.mockReturnValue({
      device_1: mockAlignment
    });

    const { result } = renderHook(() => useDeviceSync());

    act(() => {
      result.current.checkAlignments();
    });

    expect(trafficSystem.saveAlignmentLog).toHaveBeenCalledWith('device_1', mockAlignment);
  });
});

describe('useSimulation Hook 核心逻辑测试', () => {
  test('应该导出正确的 API', () => {
    const { useSimulation } = require('../hooks/useSimulation');
    expect(typeof useSimulation).toBe('function');
  });
});

describe('useGreenWaveCoordination Hook 核心逻辑测试', () => {
  test('应该导出正确的 API', () => {
    const { useGreenWaveCoordination } = require('../hooks/useGreenWaveCoordination');
    expect(typeof useGreenWaveCoordination).toBe('function');
  });
});
