import Dexie, { Table } from 'dexie';
import type { PartFingerprint, RoughnessPrediction, ProcessingParams, SystemConfig } from '@/types';

export class GrindLogicDB extends Dexie {
  fingerprints!: Table<PartFingerprint & { id: string }>;
  predictions!: Table<RoughnessPrediction & { id: string }>;
  paramsHistory!: Table<{
    id: string;
    timestamp: number;
    params: ProcessingParams;
    partId: string;
  }>;
  systemConfig!: Table<{
    key: string;
    value: any;
    updatedAt: number;
  }>;

  constructor() {
    super('GrindLogicDB');
    this.version(1).stores({
      fingerprints: 'id, partNumber, batchId, createdAt, qualityStatus',
      predictions: 'id, partId, timestamp',
      paramsHistory: 'id, timestamp, partId',
      systemConfig: 'key',
    });
  }
}

export const db = new GrindLogicDB();

export async function saveFingerprint(fingerprint: PartFingerprint): Promise<string> {
  const id = fingerprint.id || crypto.randomUUID();
  await db.fingerprints.put({ ...fingerprint, id });
  return id;
}

export async function getFingerprints(limit: number = 50): Promise<PartFingerprint[]> {
  return db.fingerprints
    .orderBy('createdAt')
    .reverse()
    .limit(limit)
    .toArray();
}

export async function getFingerprintById(id: string): Promise<PartFingerprint | undefined> {
  return db.fingerprints.get(id);
}

export async function searchFingerprints(query: string): Promise<PartFingerprint[]> {
  const lowerQuery = query.toLowerCase();
  return db.fingerprints
    .filter((fp) =>
      fp.partNumber.toLowerCase().includes(lowerQuery) ||
      fp.batchId.toLowerCase().includes(lowerQuery) ||
      fp.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    )
    .limit(20)
    .toArray();
}

export async function deleteFingerprint(id: string): Promise<void> {
  await db.fingerprints.delete(id);
}

export async function savePrediction(prediction: RoughnessPrediction): Promise<string> {
  const id = prediction.id || crypto.randomUUID();
  await db.predictions.put({ ...prediction, id });
  return id;
}

export async function getPredictionsByPartId(partId: string): Promise<RoughnessPrediction[]> {
  return db.predictions
    .where('partId')
    .equals(partId)
    .orderBy('timestamp')
    .reverse()
    .limit(20)
    .toArray();
}

export async function saveParamsHistory(
  params: ProcessingParams,
  partId: string
): Promise<string> {
  const id = crypto.randomUUID();
  await db.paramsHistory.put({
    id,
    timestamp: Date.now(),
    params,
    partId,
  });
  return id;
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const configs = await db.systemConfig.toArray();
  const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]));
  return {
    dataSource: configMap.dataSource || {
      mesEndpoint: '',
      qmsEndpoint: '',
      websocketUrl: '',
      pollingInterval: 1000,
    },
    thresholds: configMap.thresholds || {
      maxRa: 1.6,
      maxRz: 6.3,
      warningThreshold: 0.8,
      criticalThreshold: 1.2,
    },
    modelConfig: configMap.modelConfig || {
      activeModel: 'xgboost_v1',
      autoRetrain: true,
      retrainThreshold: 100,
    },
    displayConfig: configMap.displayConfig || {
      theme: 'dark',
      refreshRate: 1000,
      chartPoints: 1000,
    },
  };
}

export async function updateSystemConfig(
  key: keyof SystemConfig,
  value: any
): Promise<void> {
  await db.systemConfig.put({
    key,
    value,
    updatedAt: Date.now(),
  });
}
