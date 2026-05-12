import { ICycleRepository, CycleStats } from '../../domain';

export class GetCycleStatsUseCase {
  constructor(private cycleRepository: ICycleRepository) {}

  async execute(): Promise<CycleStats> {
    if (!this.cycleRepository.isReady()) {
      return {
        totalCycles: 0,
        successfulCycles: 0,
        failedCycles: 0,
        avgDuration: 0,
        avgMotorCurrent: 0,
        obstacleRate: 0
      };
    }

    try {
      return await this.cycleRepository.getStats();
    } catch (error) {
      console.error('Failed to get cycle stats:', error);
      return {
        totalCycles: 0,
        successfulCycles: 0,
        failedCycles: 0,
        avgDuration: 0,
        avgMotorCurrent: 0,
        obstacleRate: 0
      };
    }
  }
}
