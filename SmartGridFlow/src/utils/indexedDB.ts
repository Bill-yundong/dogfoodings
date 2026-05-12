import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { OperationalSnapshot, WeatherType } from '../types/energy';

interface EnergyDB extends DBSchema {
  snapshots: {
    key: string;
    value: OperationalSnapshot;
    indexes: {
      'by-weatherType': WeatherType;
      'by-timestamp': number;
    };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
      retryCount: number;
    };
    indexes: {
      'by-timestamp': number;
    };
  };
}

const DB_NAME = 'SmartGridFlowDB';
const DB_VERSION = 1;

class EnergyDatabase {
  private db: IDBPDatabase<EnergyDB> | null = null;

  async init() {
    if (this.db) return this.db;

    this.db = await openDB<EnergyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const snapshotStore = db.createObjectStore('snapshots', {
          keyPath: 'id',
          autoIncrement: true,
        });
        snapshotStore.createIndex('by-weatherType', 'weatherType');
        snapshotStore.createIndex('by-timestamp', 'timestamp');

        const syncQueueStore = db.createObjectStore('syncQueue', {
          keyPath: 'id',
        });
        syncQueueStore.createIndex('by-timestamp', 'timestamp');
      },
    });

    return this.db;
  }

  async saveSnapshot(snapshot: Omit<OperationalSnapshot, 'id'>): Promise<string> {
    const db = await this.init();
    const id = await db.add('snapshots', snapshot as OperationalSnapshot);
    return id as string;
  }

  async getSnapshot(id: string): Promise<OperationalSnapshot | undefined> {
    const db = await this.init();
    return db.get('snapshots', id);
  }

  async getSnapshotsByWeatherType(weatherType: WeatherType): Promise<OperationalSnapshot[]> {
    const db = await this.init();
    return db.getAllFromIndex('snapshots', 'by-weatherType', weatherType);
  }

  async getLatestSnapshots(limit: number = 10): Promise<OperationalSnapshot[]> {
    const db = await this.init();
    const allSnapshots = await db.getAll('snapshots');
    return allSnapshots
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async deleteSnapshot(id: string): Promise<void> {
    const db = await this.init();
    await db.delete('snapshots', id);
  }

  async clearOldSnapshots(beforeTimestamp: number): Promise<void> {
    const db = await this.init();
    const allSnapshots = await db.getAll('snapshots');
    const oldSnapshots = allSnapshots.filter(s => s.timestamp < beforeTimestamp);
    for (const snapshot of oldSnapshots) {
      if (snapshot.id) {
        await db.delete('snapshots', snapshot.id);
      }
    }
  }

  async enqueueSync(data: any): Promise<void> {
    const db = await this.init();
    const item = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };
    await db.add('syncQueue', item);
  }

  async getSyncQueue(): Promise<any[]> {
    const db = await this.init();
    return db.getAll('syncQueue');
  }

  async dequeueSync(id: string): Promise<void> {
    const db = await this.init();
    await db.delete('syncQueue', id);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const energyDB = new EnergyDatabase();

export async function preloadTypicalDaySnapshots() {
  const typicalWeatherTypes: WeatherType[] = ['typical_summer', 'typical_winter', 'typical_transition'];
  
  for (const weatherType of typicalWeatherTypes) {
    const existing = await energyDB.getSnapshotsByWeatherType(weatherType);
    if (existing.length === 0) {
      const baseSnapshot = createTypicalDaySnapshot(weatherType);
      await energyDB.saveSnapshot(baseSnapshot);
    }
  }
}

function createTypicalDaySnapshot(weatherType: WeatherType): Omit<OperationalSnapshot, 'id'> {
  const baseTime = Date.now();
  const weatherData = getTypicalWeatherData(weatherType);
  
  return {
    weatherType,
    timestamp: baseTime,
    weatherData,
    energyBalance: {
      timestamp: baseTime,
      supply: { cooling: 850, heating: 650, electricity: 1200 },
      demand: { cooling: 800, heating: 600, electricity: 1100 },
      surplus: { cooling: 50, heating: 50, electricity: 100 },
      deficit: { cooling: 0, heating: 0, electricity: 0 },
    },
    stations: [
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
    ],
    optimizationScore: 0.92,
    carbonEmission: 245.5,
  };
}

function getTypicalWeatherData(weatherType: WeatherType) {
  const baseTime = Date.now();
  switch (weatherType) {
    case 'typical_summer':
      return {
        temperature: 32,
        humidity: 65,
        solarRadiation: 850,
        windSpeed: 3.5,
        timestamp: baseTime,
      };
    case 'typical_winter':
      return {
        temperature: -2,
        humidity: 45,
        solarRadiation: 280,
        windSpeed: 5.2,
        timestamp: baseTime,
      };
    case 'typical_transition':
      return {
        temperature: 18,
        humidity: 55,
        solarRadiation: 520,
        windSpeed: 2.8,
        timestamp: baseTime,
      };
  }
}
