export enum WorkstationStatusEnum {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  BLOCKED = 'BLOCKED',
  STARVED = 'STARVED',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR'
}

export class WorkstationStatus {
  private constructor(
    public readonly value: WorkstationStatusEnum,
    public readonly label: string,
    public readonly color: string,
    public readonly icon: string
  ) {}

  static IDLE = new WorkstationStatus(
    WorkstationStatusEnum.IDLE,
    '空闲',
    '#9CA3AF',
    '⏸'
  )

  static RUNNING = new WorkstationStatus(
    WorkstationStatusEnum.RUNNING,
    '运行中',
    '#10B981',
    '▶'
  )

  static BLOCKED = new WorkstationStatus(
    WorkstationStatusEnum.BLOCKED,
    '阻塞',
    '#F59E0B',
    '⏳'
  )

  static STARVED = new WorkstationStatus(
    WorkstationStatusEnum.STARVED,
    '待料',
    '#F97316',
    '⚠'
  )

  static MAINTENANCE = new WorkstationStatus(
    WorkstationStatusEnum.MAINTENANCE,
    '维护',
    '#3B82F6',
    '🔧'
  )

  static ERROR = new WorkstationStatus(
    WorkstationStatusEnum.ERROR,
    '故障',
    '#EF4444',
    '🚨'
  )

  static fromValue(value: WorkstationStatusEnum): WorkstationStatus {
    const status = Object.values(WorkstationStatus).find(s => s.value === value)
    return status || WorkstationStatus.IDLE
  }

  static all(): WorkstationStatus[] {
    return [
      WorkstationStatus.IDLE,
      WorkstationStatus.RUNNING,
      WorkstationStatus.BLOCKED,
      WorkstationStatus.STARVED,
      WorkstationStatus.MAINTENANCE,
      WorkstationStatus.ERROR
    ]
  }

  equals(other: WorkstationStatus): boolean {
    return this.value === other.value
  }

  isActive(): boolean {
    return this.value === WorkstationStatusEnum.RUNNING
  }

  isFault(): boolean {
    return this.value === WorkstationStatusEnum.ERROR
  }

  isIdle(): boolean {
    return this.value === WorkstationStatusEnum.IDLE
  }
}
