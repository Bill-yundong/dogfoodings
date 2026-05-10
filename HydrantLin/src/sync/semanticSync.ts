import {
  PressureReading,
  DataSource,
  SyncMessage,
  SemanticMetadata,
  ConflictRecord,
  FireDeptSemantic,
  WaterCompanySemantic,
} from '../types';
import {
  savePressureReadings,
  saveConflictRecord,
  saveSemanticMetadata,
  getLatestReadings,
} from '../db';
import { mergePressureReadings } from '../utils';
import { SEMANTIC_MAPPING_VERSION, SYNC_INTERVAL } from '../constants';

type SyncCallback = (type: string, data: unknown) => void;

interface SyncStats {
  totalMessages: number;
  synced: number;
  conflicts: number;
  failures: number;
  lastSyncTime: number;
}

class SemanticSynchronizer {
  private fireDeptQueue: SyncMessage[] = [];
  private waterCompanyQueue: SyncMessage[] = [];
  private callbacks: Map<string, SyncCallback[]> = new Map();
  private stats: SyncStats = {
    totalMessages: 0,
    synced: 0,
    conflicts: 0,
    failures: 0,
    lastSyncTime: 0,
  };
  private isProcessing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startAutoSync();
  }

  on(event: string, callback: SyncCallback): () => void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
    return () => {
      const callbacks = this.callbacks.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private emit(event: string, data: unknown): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(event, data);
        } catch (error) {
          console.error(`Callback error for event ${event}:`, error);
        }
      });
    }
  }

  queueMessage(message: SyncMessage): void {
    if (message.source === DataSource.FIRE_DEPARTMENT) {
      this.fireDeptQueue.push(message);
    } else if (message.source === DataSource.WATER_COMPANY) {
      this.waterCompanyQueue.push(message);
    }
    this.stats.totalMessages++;
    this.emit('message-queued', message);
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.fireDeptQueue.length > 0 || this.waterCompanyQueue.length > 0) {
        await this.processPair();
      }
      this.stats.lastSyncTime = Date.now();
    } finally {
      this.isProcessing = false;
    }
  }

  private async processPair(): Promise<void> {
    const fireDeptMsg = this.fireDeptQueue[0];
    const waterCompanyMsg = this.waterCompanyQueue[0];

    if (!fireDeptMsg && !waterCompanyMsg) return;

    if (fireDeptMsg && !waterCompanyMsg) {
      await this.processSingleMessage(fireDeptMsg);
      this.fireDeptQueue.shift();
      return;
    }

    if (!fireDeptMsg && waterCompanyMsg) {
      await this.processSingleMessage(waterCompanyMsg);
      this.waterCompanyQueue.shift();
      return;
    }

    if (fireDeptMsg && waterCompanyMsg) {
      await this.syncPair(fireDeptMsg, waterCompanyMsg);
      this.fireDeptQueue.shift();
      this.waterCompanyQueue.shift();
    }
  }

  private async processSingleMessage(message: SyncMessage): Promise<void> {
    try {
      if (message.type === 'data_sync') {
        const payload = message.payload as PressureReading | PressureReading[];
        const readings = Array.isArray(payload) ? payload : [payload];
        await savePressureReadings(readings);
        this.stats.synced++;
        this.emit('data-synced', { source: message.source, readings });
      } else if (message.type === 'schema_update') {
        await saveSemanticMetadata(message.payload as SemanticMetadata);
        this.emit('schema-updated', message.payload);
      }
    } catch (error) {
      this.stats.failures++;
      console.error('Failed to process message:', error);
      this.emit('sync-error', { message, error });
    }
  }

  private async syncPair(
    fireDeptMsg: SyncMessage,
    waterCompanyMsg: SyncMessage
  ): Promise<void> {
    try {
      if (
        fireDeptMsg.type === 'data_sync' &&
        waterCompanyMsg.type === 'data_sync'
      ) {
        const fireDeptReadings = this.extractReadings(fireDeptMsg.payload);
        const waterCompanyReadings = this.extractReadings(
          waterCompanyMsg.payload
        );

        const mergedReadings: PressureReading[] = [];
        const conflicts: ConflictRecord[] = [];

        const waterCompanyMap = new Map(
          waterCompanyReadings.map((r) => [r.hydrantId, r])
        );

        for (const fireDeptReading of fireDeptReadings) {
          const waterCompanyReading = waterCompanyMap.get(
            fireDeptReading.hydrantId
          );

          if (waterCompanyReading) {
            const hasConflict = this.detectConflict(
              fireDeptReading,
              waterCompanyReading
            );

            if (hasConflict) {
              const conflict: ConflictRecord = {
                hydrantId: fireDeptReading.hydrantId,
                fireDeptReading,
                waterCompanyReading,
                detectedTime: Date.now(),
                resolved: false,
              };
              conflicts.push(conflict);
              await saveConflictRecord(conflict);
              this.stats.conflicts++;
              this.emit('conflict-detected', conflict);

              const merged = this.resolveConflict(
                fireDeptReading,
                waterCompanyReading
              );
              mergedReadings.push(merged);
            } else {
              const merged = mergePressureReadings(
                fireDeptReading,
                waterCompanyReading
              );
              mergedReadings.push(merged);
            }

            waterCompanyMap.delete(fireDeptReading.hydrantId);
          } else {
            mergedReadings.push(fireDeptReading);
          }
        }

        for (const [, reading] of waterCompanyMap) {
          mergedReadings.push(reading);
        }

        await savePressureReadings(mergedReadings);
        this.stats.synced++;
        this.emit('pair-synced', {
          fireDeptCount: fireDeptReadings.length,
          waterCompanyCount: waterCompanyReadings.length,
          mergedCount: mergedReadings.length,
          conflicts: conflicts.length,
        });
      }
    } catch (error) {
      this.stats.failures++;
      console.error('Failed to sync pair:', error);
      this.emit('sync-error', { fireDeptMsg, waterCompanyMsg, error });
    }
  }

  private extractReadings(
    payload: PressureReading | PressureReading[] | SemanticMetadata
  ): PressureReading[] {
    if (Array.isArray(payload)) {
      return payload;
    }
    if ('pressure' in payload) {
      return [payload as PressureReading];
    }
    return [];
  }

  private detectConflict(
    reading1: PressureReading,
    reading2: PressureReading
  ): boolean {
    const pressureDiff = Math.abs(reading1.pressure - reading2.pressure);
    const timeDiff = Math.abs(reading1.timestamp - reading2.timestamp);

    const pressureThreshold = 0.1;
    const timeThreshold = 5 * 60 * 1000;

    return pressureDiff > pressureThreshold && timeDiff < timeThreshold;
  }

  private resolveConflict(
    fireDeptReading: PressureReading,
    waterCompanyReading: PressureReading
  ): PressureReading {
    if (fireDeptReading.confidence > waterCompanyReading.confidence) {
      return {
        ...fireDeptReading,
        source: DataSource.SIMULATED,
        confidence: fireDeptReading.confidence,
      };
    } else if (
      waterCompanyReading.confidence > fireDeptReading.confidence
    ) {
      return {
        ...waterCompanyReading,
        source: DataSource.SIMULATED,
        confidence: waterCompanyReading.confidence,
      };
    }

    return mergePressureReadings(fireDeptReading, waterCompanyReading);
  }

  createFireDeptReading(
    hydrantId: string,
    pressure: number,
    confidence: number = 0.8
  ): PressureReading {
    return {
      hydrantId,
      pressure,
      timestamp: Date.now(),
      source: DataSource.FIRE_DEPARTMENT,
      confidence,
    };
  }

  createWaterCompanyReading(
    hydrantId: string,
    pressure: number,
    confidence: number = 0.85
  ): PressureReading {
    return {
      hydrantId,
      pressure,
      timestamp: Date.now(),
      source: DataSource.WATER_COMPANY,
      confidence,
    };
  }

  createSemanticMetadata(
    fireDeptSemantic: Partial<FireDeptSemantic> = {},
    waterCompanySemantic: Partial<WaterCompanySemantic> = {}
  ): SemanticMetadata {
    return {
      fireDeptSemantic: {
        category: '消防供水设施',
        criticalThreshold: 0.1,
        alertThreshold: 0.2,
        responsePriority: 'medium',
        ...fireDeptSemantic,
      },
      waterCompanySemantic: {
        category: '管网末端压力点',
        supplyZone: 'default_zone',
        networkNodeType: 'terminal',
        maintenanceCycle: 90,
        ...waterCompanySemantic,
      },
      mappingVersion: SEMANTIC_MAPPING_VERSION,
      lastSyncTime: Date.now(),
      syncStatus: 'synced',
    };
  }

  createSyncMessage(
    type: SyncMessage['type'],
    payload: SyncMessage['payload'],
    source: DataSource
  ): SyncMessage {
    return {
      type,
      payload,
      source,
      timestamp: Date.now(),
      version: SEMANTIC_MAPPING_VERSION,
      correlationId: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  getStats(): SyncStats {
    return { ...this.stats };
  }

  getQueueSize(): { fireDept: number; waterCompany: number } {
    return {
      fireDept: this.fireDeptQueue.length,
      waterCompany: this.waterCompanyQueue.length,
    };
  }

  private startAutoSync(): void {
    this.syncInterval = setInterval(() => {
      this.processQueue();
    }, SYNC_INTERVAL);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  destroy(): void {
    this.stopAutoSync();
    this.callbacks.clear();
    this.fireDeptQueue = [];
    this.waterCompanyQueue = [];
    this.stats = {
      totalMessages: 0,
      synced: 0,
      conflicts: 0,
      failures: 0,
      lastSyncTime: 0,
    };
    this.isProcessing = false;
  }

  reset(): void {
    this.destroy();
    this.startAutoSync();
  }
}

export const semanticSynchronizer = new SemanticSynchronizer();

export const getHydrantPressureHistory = async (
  hydrantId: string,
  limit: number = 100
): Promise<PressureReading[]> => {
  return getLatestReadings(hydrantId, limit);
};
