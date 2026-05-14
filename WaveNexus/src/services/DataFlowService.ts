console.log('DataFlowService module loading...');

import { waveCacheDB, WaveObservationLog } from "../database/WaveCacheDB";

export interface MaritimeData {
  stationId: string;
  timestamp: number;
  waveHeight: number;
  wavePeriod: number;
  waterDepth: number;
  waveDirection: number;
  windSpeed: number;
  windDirection: number;
  seaState: number;
  quality: number;
}

export interface EnergySystemData {
  farmId: string;
  timestamp: number;
  waveHeight: number;
  wavePeriod: number;
  powerOutput: number;
  energyCaptured: number;
  efficiency: number;
  deviceStatus: string;
  location: {
    lat: number;
    lng: number;
    waterDepth: number;
  };
}

export interface AlignedDataPoint {
  timestamp: number;
  location: string;
  maritimeData: {
    waveHeight: number;
    wavePeriod: number;
    quality: number;
  };
  energyData: {
    waveHeight: number;
    wavePeriod: number;
    efficiency: number;
  };
  aligned: boolean;
  confidence: number;
}

class DataFlowService {
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await waveCacheDB.init();
      this.isInitialized = true;
    }
  }

  async ingestMaritimeData(data: MaritimeData[]): Promise<string[]> {
    const logs: Omit<WaveObservationLog, "id">[] = data.map((d) => ({
      timestamp: d.timestamp,
      waveHeight: d.waveHeight,
      wavePeriod: d.wavePeriod,
      waterDepth: d.waterDepth,
      location: d.stationId,
      source: "maritime",
      quality: d.quality,
    }));

    await waveCacheDB.addSyncRecord({
      syncTime: Date.now(),
      sourceSystem: "maritime",
      recordCount: data.length,
      status: "completed",
      dataHash: this.generateHash(JSON.stringify(data)),
    });

    return waveCacheDB.addWaveObservationsBatch(logs);
  }

  async ingestEnergySystemData(data: EnergySystemData[]): Promise<string[]> {
    const logs: Omit<WaveObservationLog, "id">[] = data.map((d) => ({
      timestamp: d.timestamp,
      waveHeight: d.waveHeight,
      wavePeriod: d.wavePeriod,
      waterDepth: d.location.waterDepth,
      location: d.farmId,
      source: "energy",
      energyDensity: d.energyCaptured,
      quality: d.efficiency,
    }));

    await waveCacheDB.addSyncRecord({
      syncTime: Date.now(),
      sourceSystem: "energy",
      recordCount: data.length,
      status: "completed",
      dataHash: this.generateHash(JSON.stringify(data)),
    });

    return waveCacheDB.addWaveObservationsBatch(logs);
  }

  async alignData(
    timeWindow: number = 300000,
    location?: string
  ): Promise<AlignedDataPoint[]> {
    const maritimeData = await waveCacheDB.getWaveObservations(
      undefined,
      undefined,
      "maritime"
    );

    const energyData = await waveCacheDB.getWaveObservations(
      undefined,
      undefined,
      "energy"
    );

    const alignedPoints: AlignedDataPoint[] = [];

    for (const maritime of maritimeData) {
      if (location && maritime.location !== location) continue;

      const matchingEnergy = energyData.find(
        (e) =>
          Math.abs(e.timestamp - maritime.timestamp) <= timeWindow &&
          e.location === maritime.location
      );

      if (matchingEnergy) {
        const heightDiff = Math.abs(
          maritime.waveHeight - matchingEnergy.waveHeight
        );
        const periodDiff = Math.abs(
          maritime.wavePeriod - matchingEnergy.wavePeriod
        );

        const confidence = Math.max(
          0,
          1 - (heightDiff / maritime.waveHeight + periodDiff / maritime.wavePeriod) / 2
        );

        alignedPoints.push({
          timestamp: (maritime.timestamp + matchingEnergy.timestamp) / 2,
          location: maritime.location,
          maritimeData: {
            waveHeight: maritime.waveHeight,
            wavePeriod: maritime.wavePeriod,
            quality: maritime.quality,
          },
          energyData: {
            waveHeight: matchingEnergy.waveHeight,
            wavePeriod: matchingEnergy.wavePeriod,
            efficiency: matchingEnergy.quality,
          },
          aligned: confidence > 0.7,
          confidence,
        });
      }
    }

    return alignedPoints;
  }

  async generateSyntheticMaritimeData(
    count: number,
    stationId: string
  ): Promise<MaritimeData[]> {
    const data: MaritimeData[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      data.push({
        stationId,
        timestamp: now - i * 60000,
        waveHeight: 1 + Math.random() * 4,
        wavePeriod: 6 + Math.random() * 8,
        waterDepth: 10 + Math.random() * 40,
        waveDirection: Math.random() * 360,
        windSpeed: 5 + Math.random() * 20,
        windDirection: Math.random() * 360,
        seaState: Math.floor(Math.random() * 9),
        quality: 0.8 + Math.random() * 0.2,
      });
    }

    return data;
  }

  async generateSyntheticEnergyData(
    count: number,
    farmId: string
  ): Promise<EnergySystemData[]> {
    const data: EnergySystemData[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const waveHeight = 1 + Math.random() * 4;
      const wavePeriod = 6 + Math.random() * 8;
      const efficiency = 0.3 + Math.random() * 0.4;

      data.push({
        farmId,
        timestamp: now - i * 60000 + Math.random() * 10000,
        waveHeight: waveHeight + (Math.random() - 0.5) * 0.5,
        wavePeriod: wavePeriod + (Math.random() - 0.5) * 1,
        powerOutput: waveHeight * wavePeriod * 100 * efficiency,
        energyCaptured: waveHeight * waveHeight * 500 * efficiency,
        efficiency,
        deviceStatus: "operational",
        location: {
          lat: 35 + Math.random() * 5,
          lng: 120 + Math.random() * 5,
          waterDepth: 15 + Math.random() * 35,
        },
      });
    }

    return data;
  }

  async getSystemStats() {
    return waveCacheDB.getStatistics();
  }

  async getAlignedDataSummary(location?: string) {
    const alignedData = await this.alignData(300000, location);
    const totalAligned = alignedData.filter((d) => d.aligned).length;

    return {
      totalPoints: alignedData.length,
      alignedPoints: totalAligned,
      alignmentRate: alignedData.length > 0 ? totalAligned / alignedData.length : 0,
      avgConfidence:
        alignedData.length > 0
          ? alignedData.reduce((sum, d) => sum + d.confidence, 0) / alignedData.length
          : 0,
      locations: [...new Set(alignedData.map((d) => d.location))],
    };
  }

  private generateHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

export const dataFlowService = new DataFlowService();
