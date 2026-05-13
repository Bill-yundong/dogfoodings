import { OperationalSnapshot, WeatherType, EnergyStation, EnergyBalance, WeatherData } from '../domain/types/energy';
import { snapshotRepository } from '../infrastructure/repositories/SnapshotRepository';
import { weatherService } from './WeatherService';

export class SnapshotService {
  private repository = snapshotRepository;

  async preloadTypicalSnapshots(): Promise<void> {
    const weatherTypes: WeatherType[] = ['typical_summer', 'typical_winter', 'typical_transition'];

    for (const weatherType of weatherTypes) {
      const existing = await this.repository.getByWeatherType(weatherType);
      if (existing.length === 0) {
        const baseSnapshot = this.createTypicalSnapshot(weatherType);
        await this.repository.save(baseSnapshot);
      }
    }
  }

  private createTypicalSnapshot(weatherType: WeatherType): Omit<OperationalSnapshot, 'id'> {
    const weatherData = weatherService.createWeatherData(weatherType);
    const stations = this.createTypicalStations();
    const energyBalance = this.createTypicalEnergyBalance(stations);

    return {
      weatherType,
      timestamp: Date.now(),
      weatherData,
      energyBalance,
      stations,
      optimizationScore: 0.92,
      carbonEmission: 245.5,
    };
  }

  private createTypicalStations(): EnergyStation[] {
    return [
      {
        id: 'station-1',
        name: '北区能源站',
        location: { lat: 39.92, lng: 116.46 },
        capacity: { cooling: 500, heating: 400, electricity: 700 },
        currentOutput: { cooling: 450, heating: 350, electricity: 650 },
        efficiency: { cooling: 0.85, heating: 0.82, electricity: 0.91 },
        status: 'online',
      },
      {
        id: 'station-2',
        name: '南区能源站',
        location: { lat: 39.88, lng: 116.42 },
        capacity: { cooling: 400, heating: 300, electricity: 550 },
        currentOutput: { cooling: 400, heating: 300, electricity: 550 },
        efficiency: { cooling: 0.88, heating: 0.84, electricity: 0.93 },
        status: 'online',
      },
    ];
  }

  private createTypicalEnergyBalance(stations: EnergyStation[]): EnergyBalance {
    const totalSupply = stations.reduce(
      (sum, s) => ({
        cooling: sum.cooling + s.currentOutput.cooling,
        heating: sum.heating + s.currentOutput.heating,
        electricity: sum.electricity + s.currentOutput.electricity,
      }),
      { cooling: 0, heating: 0, electricity: 0 }
    );

    const demand = { cooling: 800, heating: 600, electricity: 1100 };

    return {
      timestamp: Date.now(),
      supply: totalSupply,
      demand,
      surplus: {
        cooling: Math.max(0, totalSupply.cooling - demand.cooling),
        heating: Math.max(0, totalSupply.heating - demand.heating),
        electricity: Math.max(0, totalSupply.electricity - demand.electricity),
      },
      deficit: {
        cooling: Math.max(0, demand.cooling - totalSupply.cooling),
        heating: Math.max(0, demand.heating - totalSupply.heating),
        electricity: Math.max(0, demand.electricity - totalSupply.electricity),
      },
    };
  }

  async saveSnapshot(snapshot: Omit<OperationalSnapshot, 'id'>): Promise<string> {
    return this.repository.save(snapshot);
  }

  async getSnapshot(id: string): Promise<OperationalSnapshot | undefined> {
    return this.repository.getById(id);
  }

  async getSnapshotsByWeatherType(weatherType: WeatherType): Promise<OperationalSnapshot[]> {
    return this.repository.getByWeatherType(weatherType);
  }

  async getLatestSnapshots(limit: number = 10): Promise<OperationalSnapshot[]> {
    return this.repository.getLatest(limit);
  }

  async deleteSnapshot(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  async clearOldSnapshots(beforeTimestamp: number): Promise<void> {
    return this.repository.clearBefore(beforeTimestamp);
  }
}

export const snapshotService = new SnapshotService();
