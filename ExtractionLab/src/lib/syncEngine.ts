import { DATABASE_CONFIG, SYNC_CONFIG } from './constants';
import { generateId, getCurrentTimestamp, calculateHash } from './utils';
import { getDB, insert, update, getById, getAll } from './database';
import type {
  SyncOperation,
  BrewingPreset,
  StoreLocation,
  QualityConsistencyReport,
  BrewingRecord,
  FlavorProfile,
} from '@/types';

type SyncEntityType = SyncOperation['type'];
type SyncSource = SyncOperation['source'];

interface SyncConflict {
  operation: SyncOperation;
  existing: any;
  resolution: 'keep-existing' | 'overwrite' | 'merge';
}

class RealTimeSyncEngine {
  private static instance: RealTimeSyncEngine;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Map<SyncEntityType, Set<(data: any) => void>> = new Map();
  private isRunning = false;
  private storeId: string | null = null;
  private source: SyncSource = 'store';

  static getInstance(): RealTimeSyncEngine {
    if (!RealTimeSyncEngine.instance) {
      RealTimeSyncEngine.instance = new RealTimeSyncEngine();
    }
    return RealTimeSyncEngine.instance;
  }

  configure(options: { storeId?: string; source?: SyncSource }): void {
    if (options.storeId) this.storeId = options.storeId;
    if (options.source) this.source = options.source;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    this.heartbeatInterval = setInterval(
      () => this.sendHeartbeat(),
      SYNC_CONFIG.heartbeatInterval
    );

    this.syncInterval = setInterval(
      () => this.processSyncQueue(),
      SYNC_CONFIG.retryDelay
    );

    await this.processSyncQueue();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  subscribe<T>(type: SyncEntityType, callback: (data: T) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  private notifyListeners(type: SyncEntityType, data: any): void {
    this.listeners.get(type)?.forEach(callback => callback(data));
  }

  async queueSync(
    type: SyncEntityType,
    operation: SyncOperation['operation'],
    entityId: string,
    payload: Record<string, any>,
    targetId?: string
  ): Promise<string> {
    const syncOp: SyncOperation = {
      id: generateId(),
      type,
      operation,
      entityId,
      source: this.source,
      sourceId: this.storeId || 'rnd-center',
      targetId: targetId || (this.source === 'rnd' ? 'all-stores' : 'rnd-center'),
      status: 'pending',
      payload,
      attempts: 0,
      createdAt: getCurrentTimestamp(),
    };

    const db = await getDB();
    await db.add('syncQueue', syncOp);

    setTimeout(() => this.processSyncQueue(), 0);

    return syncOp.id;
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.storeId) return;

    try {
      await update('stores', this.storeId, {
        lastSyncAt: getCurrentTimestamp(),
        syncStatus: 'online',
      } as any);
    } catch (error) {
      console.error('Heartbeat failed:', error);
    }
  }

  async processSyncQueue(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const db = await getDB();
      const pendingOps = await db.getAllFromIndex(
        'syncQueue',
        'status',
        IDBKeyRange.only('pending'),
        SYNC_CONFIG.batchSize
      );

      const syncingOps = await db.getAllFromIndex(
        'syncQueue',
        'status',
        IDBKeyRange.only('syncing'),
        SYNC_CONFIG.batchSize
      );

      const allOps = [...pendingOps, ...syncingOps];

      for (const op of allOps) {
        await this.processSingleSync(op);
      }
    } catch (error) {
      console.error('Sync queue processing failed:', error);
    }
  }

  private async processSingleSync(op: SyncOperation): Promise<void> {
    const db = await getDB();

    try {
      await db.put('syncQueue', { ...op, status: 'syncing' as const });

      const result = await this.executeSync(op);

      await db.put('syncQueue', {
        ...op,
        status: 'completed',
        completedAt: getCurrentTimestamp(),
        payload: result,
      });

      this.notifyListeners(op.type, {
        operation: op.operation,
        entity: op.payload,
        syncedAt: getCurrentTimestamp(),
      });
    } catch (error) {
      const attempts = op.attempts + 1;
      const status = attempts >= SYNC_CONFIG.retryAttempts ? 'failed' : 'pending';

      await db.put('syncQueue', {
        ...op,
        status,
        attempts,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async executeSync(op: SyncOperation): Promise<any> {
    const db = await getDB();

    switch (op.type) {
      case 'preset':
        return this.syncPreset(op);
      case 'record':
        return this.syncRecord(op);
      case 'bean':
        return this.syncBean(op);
      case 'store':
        return this.syncStore(op);
      default:
        throw new Error(`Unknown sync type: ${op.type}`);
    }
  }

  private async syncPreset(op: SyncOperation): Promise<BrewingPreset> {
    const db = await getDB();
    const payload = op.payload as BrewingPreset;

    const existing = await db.get('presets', payload.id);

    if (existing && op.operation === 'update') {
      const conflict = this.checkConflict(existing, payload);
      if (conflict) {
        const resolved = this.resolveConflict(existing, payload, conflict);
        await db.put('presets', resolved);
        return resolved;
      }
    }

    switch (op.operation) {
      case 'create':
      case 'update':
        await db.put('presets', {
          ...payload,
          lastSyncedAt: getCurrentTimestamp(),
          syncHash: calculateHash(payload),
        });
        break;
      case 'delete':
        await db.delete('presets', payload.id);
        break;
    }

    return payload;
  }

  private async syncRecord(op: SyncOperation): Promise<BrewingRecord> {
    const db = await getDB();
    const payload = op.payload as BrewingRecord;

    if (op.operation === 'create' || op.operation === 'update') {
      await db.put('records', payload);
      await this.updateQualityMetrics(payload);
    } else if (op.operation === 'delete') {
      await db.delete('records', payload.id);
    }

    return payload;
  }

  private async syncBean(op: SyncOperation): Promise<any> {
    const db = await getDB();
    const payload = op.payload;

    switch (op.operation) {
      case 'create':
      case 'update':
        await db.put('beans', payload as any);
        break;
      case 'delete':
        await db.delete('beans', payload.id);
        break;
    }

    return payload;
  }

  private async syncStore(op: SyncOperation): Promise<StoreLocation> {
    const db = await getDB();
    const payload = op.payload as StoreLocation;

    if (op.operation === 'create' || op.operation === 'update') {
      await db.put('stores', {
        ...payload,
        lastSyncAt: getCurrentTimestamp(),
      } as any);
    } else if (op.operation === 'delete') {
      await db.delete('stores', payload.id);
    }

    return payload;
  }

  private checkConflict(existing: any, incoming: any): boolean {
    if (!existing.updatedAt || !incoming.updatedAt) return false;

    const existingHash = existing.syncHash || calculateHash(existing);
    const incomingHash = incoming.syncHash || calculateHash(incoming);

    if (existingHash === incomingHash) return false;

    return existing.updatedAt > incoming.updatedAt;
  }

  private resolveConflict(existing: any, incoming: any, conflict: boolean): any {
    if (SYNC_CONFIG.conflictResolution === 'latest-wins') {
      return existing.updatedAt > incoming.updatedAt ? existing : incoming;
    }

    if (SYNC_CONFIG.conflictResolution === 'merge') {
      return {
        ...existing,
        ...incoming,
        updatedAt: Math.max(existing.updatedAt, incoming.updatedAt),
      };
    }

    return existing;
  }

  private async updateQualityMetrics(record: BrewingRecord): Promise<void> {
    const db = await getDB();

    const sevenDaysAgo = getCurrentTimestamp() - 7 * 24 * 60 * 60 * 1000;
    const recentRecords = await db.getAllFromIndex(
      'records',
      'storeId',
      IDBKeyRange.only(record.storeId)
    );

    const filtered = recentRecords.filter(
      r => r.presetId === record.presetId && r.createdAt > sevenDaysAgo
    );

    if (filtered.length > 0) {
      const totalBrews = filtered.length;
      const withinTolerance = filtered.filter(r => r.qualityScore >= 80).length;
      const consistencyScore = (withinTolerance / totalBrews) * 100;

      const avgFlavor = this.calculateAverageFlavor(
        filtered.map(r => r.flavorRating)
      );
      const flavorVariance = this.calculateFlavorVariance(
        filtered.map(r => r.flavorRating)
      );

      const tdsVariance = this.calculateVariance(filtered.map(r => r.finalTDS));
      const yieldVariance = this.calculateVariance(
        filtered.map(r => r.extractionYield)
      );
      const tempVariance = this.calculateVariance(
        filtered.map(r => r.actualTemperature)
      );

      const reportId = generateId();
      const report: QualityConsistencyReport = {
        id: reportId,
        storeId: record.storeId,
        presetId: record.presetId,
        period: 'weekly',
        startDate: sevenDaysAgo,
        endDate: getCurrentTimestamp(),
        totalBrews,
        withinTolerance,
        consistencyScore,
        flavorVariance,
        tdsVariance,
        yieldVariance,
        temperatureVariance: tempVariance,
        createdAt: getCurrentTimestamp(),
      };

      await db.put('reports', report);

      const avgScore =
        filtered.reduce((sum, r) => sum + r.qualityScore, 0) / totalBrews;
      const existingStore = await db.get('stores', record.storeId);
      if (existingStore) {
        await db.put('stores', {
          ...existingStore,
          qualityScore: avgScore,
        });
      }
    }
  }

  private calculateAverageFlavor(profiles: FlavorProfile[]): FlavorProfile {
    const keys = Object.keys(profiles[0]) as (keyof FlavorProfile)[];
    const avg: Partial<FlavorProfile> = {};

    for (const key of keys) {
      avg[key] = profiles.reduce((sum, p) => sum + p[key], 0) / profiles.length;
    }

    return avg as FlavorProfile;
  }

  private calculateFlavorVariance(profiles: FlavorProfile[]): FlavorProfile {
    const avg = this.calculateAverageFlavor(profiles);
    const keys = Object.keys(avg) as (keyof FlavorProfile)[];
    const variance: Partial<FlavorProfile> = {};

    for (const key of keys) {
      const squaredDiffs = profiles.map(p => Math.pow(p[key] - avg[key], 2));
      variance[key] = Math.sqrt(
        squaredDiffs.reduce((a, b) => a + b, 0) / profiles.length
      );
    }

    return variance as FlavorProfile;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(
      squaredDiffs.reduce((a, b) => a + b, 0) / values.length
    );
  }

  async getSyncStatus(): Promise<{
    pending: number;
    syncing: number;
    completed: number;
    failed: number;
    lastSyncAt: number | null;
  }> {
    const db = await getDB();

    const [pending, syncing, completed, failed] = await Promise.all([
      db.countFromIndex('syncQueue', 'status', IDBKeyRange.only('pending')),
      db.countFromIndex('syncQueue', 'status', IDBKeyRange.only('syncing')),
      db.countFromIndex('syncQueue', 'status', IDBKeyRange.only('completed')),
      db.countFromIndex('syncQueue', 'status', IDBKeyRange.only('failed')),
    ]);

    let lastSyncAt: number | null = null;
    const completedOps = await db.getAllFromIndex(
      'syncQueue',
      'status',
      IDBKeyRange.only('completed'),
      1
    );
    if (completedOps.length > 0) {
      lastSyncAt = completedOps[0].completedAt || completedOps[0].createdAt;
    }

    return {
      pending,
      syncing,
      completed,
      failed,
      lastSyncAt,
    };
  }

  async forceSync(): Promise<void> {
    const db = await getDB();
    const failedOps = await db.getAllFromIndex(
      'syncQueue',
      'status',
      IDBKeyRange.only('failed')
    );

    for (const op of failedOps) {
      await db.put('syncQueue', { ...op, status: 'pending', attempts: 0 });
    }

    await this.processSyncQueue();
  }

  async syncPresetToStores(presetId: string, storeIds: string[]): Promise<void> {
    const db = await getDB();
    const preset = await db.get('presets', presetId);

    if (!preset) throw new Error(`Preset ${presetId} not found`);

    for (const storeId of storeIds) {
      await this.queueSync('preset', 'update', presetId, preset, storeId);
    }
  }

  async syncAllPresetsToStore(storeId: string): Promise<void> {
    const db = await getDB();
    const store = await db.get('stores', storeId);

    if (!store) throw new Error(`Store ${storeId} not found`);

    const presets = await db.getAll('presets');
    const relevantPresets = presets.filter(
      p => p.region === 'global' || p.region === store.region
    );

    for (const preset of relevantPresets) {
      await this.queueSync('preset', 'update', preset.id, preset, storeId);
    }
  }

  async checkQualityConsistency(
    preset: BrewingPreset,
    records: BrewingRecord[]
  ): Promise<{ isConsistent: boolean; score: number; issues: string[] }> {
    if (records.length === 0) {
      return { isConsistent: true, score: 100, issues: [] };
    }

    const issues: string[] = [];
    const tolerance = preset.tolerance;
    const targetFlavor = preset.targetFlavor;

    const avgFlavor: FlavorProfile = {
      acidity: records.reduce((sum, r) => sum + r.flavorRating.acidity, 0) / records.length,
      sweetness: records.reduce((sum, r) => sum + r.flavorRating.sweetness, 0) / records.length,
      bitterness: records.reduce((sum, r) => sum + r.flavorRating.bitterness, 0) / records.length,
      body: records.reduce((sum, r) => sum + r.flavorRating.body, 0) / records.length,
      aroma: records.reduce((sum, r) => sum + r.flavorRating.aroma, 0) / records.length,
      aftertaste: records.reduce((sum, r) => sum + r.flavorRating.aftertaste, 0) / records.length,
      complexity: records.reduce((sum, r) => sum + r.flavorRating.complexity, 0) / records.length,
      balance: records.reduce((sum, r) => sum + r.flavorRating.balance, 0) / records.length,
    };

    const flavorDiffs: Record<string, number> = {};
    let totalFlavorDiff = 0;
    (Object.keys(avgFlavor) as (keyof FlavorProfile)[]).forEach(key => {
      const diff = Math.abs(avgFlavor[key] - targetFlavor[key]);
      flavorDiffs[key] = diff;
      totalFlavorDiff += diff;
      if (diff > tolerance[key]) {
        const flavorNames: Record<string, string> = {
          acidity: '酸度',
          sweetness: '甜度',
          bitterness: '苦度',
          body: '醇厚度',
          aroma: '香气',
          aftertaste: '余韵',
          complexity: '复杂度',
          balance: '平衡度',
        };
        issues.push(`${flavorNames[key]}波动超出容差范围`);
      }
    });

    const avgTDS = records.reduce((sum, r) => sum + r.finalTDS, 0) / records.length;
    const tdsDiff = Math.abs(avgTDS - preset.targetTDS);
    if (tdsDiff > 0.3) {
      issues.push('TDS 波动超出容差范围');
    }

    const avgYield = records.reduce((sum, r) => sum + r.extractionYield, 0) / records.length;
    const yieldDiff = Math.abs(avgYield - preset.targetYield);
    if (yieldDiff > 1.5) {
      issues.push('萃取率波动超出容差范围');
    }

    const avgTemp = records.reduce((sum, r) => sum + r.actualTemperature, 0) / records.length;
    const tempDiff = Math.abs(avgTemp - preset.waterTemperature);
    if (tempDiff > 2) {
      issues.push('水温波动超出容差范围');
    }

    const flavorScore = Math.max(0, 100 - (totalFlavorDiff / 8) * 10);
    const tdsScore = Math.max(0, 100 - tdsDiff * 20);
    const yieldScore = Math.max(0, 100 - yieldDiff * 5);
    const tempScore = Math.max(0, 100 - tempDiff * 3);

    const overallScore = (flavorScore * 0.5 + tdsScore * 0.2 + yieldScore * 0.2 + tempScore * 0.1);

    return {
      isConsistent: issues.length === 0,
      score: Math.round(overallScore * 10) / 10,
      issues,
    };
  }
}

export const syncEngine = RealTimeSyncEngine.getInstance();

export async function checkQualityConsistency(
  preset: BrewingPreset,
  records: BrewingRecord[]
): Promise<{
  isConsistent: boolean;
  score: number;
  issues: string[];
}> {
  if (records.length === 0) {
    return { isConsistent: false, score: 0, issues: ['暂无冲煮记录'] };
  }

  const issues: string[] = [];

  const avgScore = records.reduce((sum, r) => sum + r.qualityScore, 0) / records.length;
  const scoreVariance = Math.sqrt(
    records.reduce((sum, r) => sum + Math.pow(r.qualityScore - avgScore, 2), 0) /
      records.length
  );

  if (avgScore < 80) {
    issues.push(`平均品质评分过低: ${avgScore.toFixed(1)}`);
  }

  if (scoreVariance > 10) {
    issues.push(`品质一致性不足: 方差 ${scoreVariance.toFixed(1)}`);
  }

  const tdsValues = records.map(r => r.finalTDS);
  const tdsAvg = tdsValues.reduce((a, b) => a + b, 0) / tdsValues.length;
  const tdsVariance = Math.sqrt(
    tdsValues.reduce((sum, v) => sum + Math.pow(v - tdsAvg, 2), 0) / tdsValues.length
  );

  if (Math.abs(tdsAvg - preset.targetTDS) > preset.targetTDS * 0.1) {
    issues.push(`TDS 偏离目标: 实际 ${tdsAvg.toFixed(2)} vs 目标 ${preset.targetTDS.toFixed(2)}`);
  }

  if (tdsVariance > preset.targetTDS * 0.05) {
    issues.push(`TDS 波动过大: 方差 ${tdsVariance.toFixed(3)}`);
  }

  const yieldValues = records.map(r => r.extractionYield);
  const yieldAvg = yieldValues.reduce((a, b) => a + b, 0) / yieldValues.length;

  if (Math.abs(yieldAvg - preset.targetYield) > 2) {
    issues.push(`萃取率偏离目标: 实际 ${yieldAvg.toFixed(1)}% vs 目标 ${preset.targetYield.toFixed(1)}%`);
  }

  const tempValues = records.map(r => r.actualTemperature);
  const tempAvg = tempValues.reduce((a, b) => a + b, 0) / tempValues.length;

  if (Math.abs(tempAvg - preset.waterTemperature) > 2) {
    issues.push(`水温偏离目标: 实际 ${tempAvg.toFixed(1)}°C vs 目标 ${preset.waterTemperature.toFixed(1)}°C`);
  }

  return {
    isConsistent: issues.length === 0,
    score: avgScore,
    issues,
  };
}
