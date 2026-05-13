import { db } from '../database/indexedDB';
import { ForgingBatch, CoolingSnapshot, QualityData, ProcessParams } from '../types';
import { AsyncHeatConductionModel } from '../models/HeatConductionModel';

type EventCallback = (data: Record<string, unknown>) => void;

export class DataLinkService {
  private manufacturingSubscribers: Map<string, EventCallback[]> = new Map();
  private qualitySubscribers: Map<string, EventCallback[]> = new Map();
  private heatModel: AsyncHeatConductionModel | null = null;

  constructor(params?: ProcessParams) {
    if (params) {
      this.heatModel = new AsyncHeatConductionModel(params);
    }
  }

  initModel(params: ProcessParams): void {
    this.heatModel = new AsyncHeatConductionModel(params);
  }

  subscribeToManufacturing(batchId: string, callback: EventCallback): void {
    if (!this.manufacturingSubscribers.has(batchId)) {
      this.manufacturingSubscribers.set(batchId, []);
    }
    this.manufacturingSubscribers.get(batchId)!.push(callback);
  }

  subscribeToQuality(batchId: string, callback: EventCallback): void {
    if (!this.qualitySubscribers.has(batchId)) {
      this.qualitySubscribers.set(batchId, []);
    }
    this.qualitySubscribers.get(batchId)!.push(callback);
  }

  unsubscribe(batchId: string): void {
    this.manufacturingSubscribers.delete(batchId);
    this.qualitySubscribers.delete(batchId);
  }

  async sendCoolingRateUpdate(batchId: string, coolingRate: number, snapshot: CoolingSnapshot): Promise<void> {
    const eventData = {
      coolingRate,
      snapshotId: snapshot.id,
      averageTemperature: snapshot.averageTemperature,
      timestamp: snapshot.timestamp
    };

    await db.createEvent({
      batchId,
      source: 'manufacturing',
      eventType: 'cooling_rate_update',
      data: eventData
    });

    this.notifySubscribers(this.manufacturingSubscribers, batchId, eventData);
    this.notifySubscribers(this.qualitySubscribers, batchId, eventData);
  }

  async sendQualityFeedback(batchId: string, quality: QualityData): Promise<void> {
    await db.createQualityData(quality);

    const eventData = {
      passed: quality.passed,
      hardness: quality.hardness,
      coolingRateDeviation: quality.coolingRateDeviation,
      defects: quality.defects
    };

    await db.createEvent({
      batchId,
      source: 'quality',
      eventType: 'quality_feedback',
      data: eventData
    });

    this.notifySubscribers(this.qualitySubscribers, batchId, eventData);
    this.notifySubscribers(this.manufacturingSubscribers, batchId, eventData);

    await this.adjustProcessParams(batchId, quality);
  }

  private async adjustProcessParams(batchId: string, quality: QualityData): Promise<void> {
    if (Math.abs(quality.coolingRateDeviation) > 10) {
      const batch = await db.getBatch(batchId);
      if (batch) {
        const adjustmentFactor = quality.coolingRateDeviation > 0 ? 0.95 : 1.05;
        batch.targetCoolingRate *= adjustmentFactor;
        await db.updateBatch(batch);
      }
    }
  }

  private notifySubscribers(
    subscribers: Map<string, EventCallback[]>, 
    batchId: string, 
    data: Record<string, unknown>
  ): void {
    const callbacks = subscribers.get(batchId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error('Error in subscriber callback:', e);
        }
      });
    }
  }

  async processCoolingSnapshot(
    batch: ForgingBatch, 
    temperatures: number[], 
    previousTemp: number
  ): Promise<CoolingSnapshot> {
    if (!this.heatModel) {
      throw new Error('Heat model not initialized');
    }

    const currentTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
    const coolingRate = this.heatModel.calculateCoolingRate(previousTemp, currentTemp);
    
    const snapshot: Omit<CoolingSnapshot, 'id'> = {
      batchId: batch.id,
      timestamp: Date.now(),
      temperatureField: this.heatModel.getAllTemperatures(),
      coolingRate,
      averageTemperature: currentTemp,
      maxTemperature: Math.max(...temperatures),
      minTemperature: Math.min(...temperatures)
    };

    const snapshotId = await db.createSnapshot(snapshot);
    
    const updatedBatch = { ...batch };
    updatedBatch.snapshots.push(snapshotId);
    await db.updateBatch(updatedBatch);

    await this.sendCoolingRateUpdate(batch.id, coolingRate, { ...snapshot, id: snapshotId });

    return { ...snapshot, id: snapshotId };
  }

  async predictStressForBatch(batchId: string): Promise<number[]> {
    if (!this.heatModel) {
      throw new Error('Heat model not initialized');
    }

    const batch = await db.getBatch(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    const stressPoints = this.heatModel.predictStressDistribution();
    const stressValues = stressPoints.map(p => p.stress);
    
    batch.predictedStress = stressPoints;
    await db.updateBatch(batch);

    return stressValues;
  }

  async getBatchWithQuality(batchId: string): Promise<{
    batch: ForgingBatch | undefined;
    quality: QualityData | undefined;
    events: unknown[];
  }> {
    const [batch, quality, events] = await Promise.all([
      db.getBatch(batchId),
      db.getQualityData(batchId),
      db.getEventsByBatch(batchId)
    ]);

    return { batch, quality, events };
  }

  async closeOfflineLoop(batchId: string): Promise<boolean> {
    const batch = await db.getBatch(batchId);
    if (!batch) return false;

    const snapshots = await db.getSnapshotsByBatch(batchId);
    const quality = await db.getQualityData(batchId);

    if (snapshots.length > 0 && quality) {
      batch.status = 'completed';
      batch.endTime = Date.now();
      batch.qualityScore = this.calculateQualityScore(snapshots, quality);
      await db.updateBatch(batch);
      return true;
    }

    return false;
  }

  private calculateQualityScore(snapshots: CoolingSnapshot[], quality: QualityData): number {
    let score = 100;

    if (quality.defects.length > 0) {
      score -= quality.defects.length * 15;
    }

    score -= Math.abs(quality.coolingRateDeviation) * 2;

    const avgCoolingRate = snapshots.reduce((sum, s) => sum + s.coolingRate, 0) / snapshots.length;
    const rateStability = snapshots.reduce((sum, s) => sum + Math.abs(s.coolingRate - avgCoolingRate), 0) / snapshots.length;
    score -= rateStability * 5;

    return Math.max(0, Math.min(100, score));
  }
}

export const dataLinkService = new DataLinkService();
