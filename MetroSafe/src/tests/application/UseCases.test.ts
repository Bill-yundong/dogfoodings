import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  InitializeSystemUseCase,
  UpdateDoorStateUseCase,
  AddFaultSignalUseCase,
  AcknowledgeFaultUseCase,
  GetCycleStatsUseCase,
} from '../../application';
import {
  DoorState,
  createDoor,
  createFaultSignal,
  FaultType,
  SemanticLevel,
  CycleStats
} from '../../domain';

describe('InitializeSystemUseCase - 系统初始化用例', () => {
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      init: vi.fn().mockResolvedValue(undefined),
      isReady: vi.fn().mockReturnValue(true),
      getStats: vi.fn().mockResolvedValue({
        totalCycles: 0,
        successfulCycles: 0,
        failedCycles: 0,
        avgDuration: 0,
        avgMotorCurrent: 0,
        obstacleRate: 0
      })
    };
  });

  it('should initialize repository and return doors array', async () => {
    const useCase = new InitializeSystemUseCase(mockRepository);
    const result = await useCase.execute();

    expect(mockRepository.init).toHaveBeenCalled();
    expect(result.doors).toBeDefined();
    expect(result.doors.length).toBe(6);
    expect(result.isDbReady).toBe(true);
  });

  it('should return all doors in closed state initially', async () => {
    const useCase = new InitializeSystemUseCase(mockRepository);
    const result = await useCase.execute();

    result.doors.forEach((door: any) => {
      expect(door.state).toBe(DoorState.CLOSED);
    });
  });
});

describe('UpdateDoorStateUseCase - 更新门状态用例', () => {
  it('should update door state correctly', () => {
    const useCase = new UpdateDoorStateUseCase();
    const doors = [createDoor('PSD-01'), createDoor('PSD-02')];

    const result = useCase.execute(doors, 'PSD-01', DoorState.OPEN);

    expect(result[0].state).toBe(DoorState.OPEN);
    expect(result[1].state).toBe(DoorState.CLOSED);
  });

  it('should not mutate original doors array', () => {
    const useCase = new UpdateDoorStateUseCase();
    const doors = [createDoor('PSD-01')];
    const originalState = doors[0].state;

    useCase.execute(doors, 'PSD-01', DoorState.OPEN);

    expect(doors[0].state).toBe(originalState);
  });

  it('should return same array if door not found', () => {
    const useCase = new UpdateDoorStateUseCase();
    const doors = [createDoor('PSD-01')];

    const result = useCase.execute(doors, 'INVALID_ID', DoorState.OPEN);

    expect(result).toEqual(doors);
  });
});

describe('AddFaultSignalUseCase - 添加故障信号用例', () => {
  let mockPublisher: any;

  beforeEach(() => {
    mockPublisher = {
      publish: vi.fn().mockResolvedValue(undefined)
    };
  });

  it('should create and publish fault signal', async () => {
    const useCase = new AddFaultSignalUseCase(mockPublisher);

    const result = await useCase.execute({
      faultType: FaultType.MOTOR_FAILURE,
      source: 'sensor',
      semanticLevel: SemanticLevel.CRITICAL,
      doorId: 'PSD-01',
      description: '电机故障测试'
    });

    expect(mockPublisher.publish).toHaveBeenCalled();
    expect(result.id).toBeDefined();
    expect(result.faultType).toBe(FaultType.MOTOR_FAILURE);
    expect(result.doorId).toBe('PSD-01');
  });

  it('should set acknowledged to false by default', async () => {
    const useCase = new AddFaultSignalUseCase(mockPublisher);

    const result = await useCase.execute({
      faultType: FaultType.SENSOR_ERROR,
      source: 'manual',
      semanticLevel: SemanticLevel.WARNING,
      doorId: 'PSD-02',
      description: '传感器错误测试'
    });

    expect(result.acknowledged).toBe(false);
  });
});

describe('AcknowledgeFaultUseCase - 确认故障用例', () => {
  it('should set acknowledged to true for specified fault', () => {
    const useCase = new AcknowledgeFaultUseCase();
    const fault1 = createFaultSignal(
      FaultType.MOTOR_FAILURE,
      'sensor',
      SemanticLevel.CRITICAL,
      'PSD-01',
      '测试故障1'
    );
    const fault2 = createFaultSignal(
      FaultType.SENSOR_ERROR,
      'sensor',
      SemanticLevel.WARNING,
      'PSD-02',
      '测试故障2'
    );
    const faults = [fault1, fault2];

    const result = useCase.execute(faults, fault1.id);

    expect(result[0].acknowledged).toBe(true);
    expect(result[1].acknowledged).toBe(false);
  });

  it('should set acknowledgedAt timestamp', () => {
    const useCase = new AcknowledgeFaultUseCase();
    const fault = createFaultSignal(
      FaultType.MOTOR_FAILURE,
      'sensor',
      SemanticLevel.CRITICAL,
      'PSD-01',
      '测试故障'
    );

    const result = useCase.execute([fault], fault.id);

    expect(result[0].acknowledgedAt).toBeDefined();
    expect(result[0].acknowledgedAt).toBeGreaterThanOrEqual(fault.timestamp);
  });
});

describe('GetCycleStatsUseCase - 获取循环统计用例', () => {
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      isReady: vi.fn(),
      getStats: vi.fn()
    };
  });

  it('should return stats from repository when db is ready', async () => {
    const expectedStats: CycleStats = {
      totalCycles: 1000,
      successfulCycles: 950,
      failedCycles: 50,
      avgDuration: 3000,
      avgMotorCurrent: 150,
      obstacleRate: 0.05
    };

    mockRepository.isReady.mockReturnValue(true);
    mockRepository.getStats.mockResolvedValue(expectedStats);

    const useCase = new GetCycleStatsUseCase(mockRepository);
    const result = await useCase.execute();

    expect(mockRepository.getStats).toHaveBeenCalled();
    expect(result).toEqual(expectedStats);
  });

  it('should return zero stats when db is not ready', async () => {
    mockRepository.isReady.mockReturnValue(false);

    const useCase = new GetCycleStatsUseCase(mockRepository);
    const result = await useCase.execute();

    expect(mockRepository.getStats).not.toHaveBeenCalled();
    expect(result.totalCycles).toBe(0);
    expect(result.successfulCycles).toBe(0);
    expect(result.failedCycles).toBe(0);
  });
});
