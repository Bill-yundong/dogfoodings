import { ICycleRepository, DOOR_IDS, createDoor, Door } from '../../domain';

export class InitializeSystemUseCase {
  constructor(private cycleRepository: ICycleRepository) {}

  async execute(): Promise<{ doors: Door[]; isDbReady: boolean }> {
    try {
      await this.cycleRepository.init();
    } catch (error) {
      console.warn('Database initialization failed:', error);
    }

    const doors = DOOR_IDS.map(id => createDoor(id));

    if (this.cycleRepository.isReady()) {
      try {
        const stats = await this.cycleRepository.getStats();
        if (stats.totalCycles === 0) {
          await this.cycleRepository.generateSampleData(1000);
        }
      } catch (error) {
        console.warn('Failed to generate sample data:', error);
      }
    }

    return {
      doors,
      isDbReady: this.cycleRepository.isReady()
    };
  }
}
