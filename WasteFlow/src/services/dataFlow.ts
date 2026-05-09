import type { WasteData, StandardizedWasteData, WasteSource } from '../types';
import { generateHash, generateId } from '../utils/hash';
import { standardizedDataStore } from './indexedDB';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALIDATION_RULES = {
  weight: { min: 0, max: 10000 },
  volume: { min: 0, max: 5000 },
  qualityScore: { min: 0, max: 100 },
};

export async function validateWasteData(data: WasteData): Promise<ValidationResult> {
  const errors: string[] = [];

  if (!data.id) errors.push('ID 不能为空');
  if (!data.location) errors.push('位置不能为空');
  if (data.weight < VALIDATION_RULES.weight.min || data.weight > VALIDATION_RULES.weight.max) {
    errors.push(`重量必须在 ${VALIDATION_RULES.weight.min}-${VALIDATION_RULES.weight.max} 范围内`);
  }
  if (data.volume < VALIDATION_RULES.volume.min || data.volume > VALIDATION_RULES.volume.max) {
    errors.push(`体积必须在 ${VALIDATION_RULES.volume.min}-${VALIDATION_RULES.volume.max} 范围内`);
  }
  if (data.qualityScore < VALIDATION_RULES.qualityScore.min || data.qualityScore > VALIDATION_RULES.qualityScore.max) {
    errors.push(`质量分数必须在 ${VALIDATION_RULES.qualityScore.min}-${VALIDATION_RULES.qualityScore.max} 范围内`);
  }

  return { valid: errors.length === 0, errors };
}

export async function standardizeData(data: WasteData): Promise<StandardizedWasteData> {
  const hash = await generateHash({
    id: data.id,
    timestamp: data.timestamp,
    weight: data.weight,
    source: data.source,
  });

  return {
    ...data,
    standardizedAt: Date.now(),
    transferStatus: 'pending',
    verificationHash: hash,
  };
}

export async function transferToSystem(data: StandardizedWasteData, targetSystem: WasteSource): Promise<StandardizedWasteData> {
  const updatedData = {
    ...data,
    transferStatus: 'transferred' as const,
    metadata: {
      ...data.metadata,
      transferredTo: targetSystem,
      transferredAt: Date.now(),
    },
  };

  await standardizedDataStore.update(updatedData);
  return updatedData;
}

export async function verifyData(data: StandardizedWasteData): Promise<{ verified: boolean; data: StandardizedWasteData }> {
  const regeneratedHash = await generateHash({
    id: data.id,
    timestamp: data.timestamp,
    weight: data.weight,
    source: data.source,
  });

  const verified = regeneratedHash === data.verificationHash;
  const updatedData = {
    ...data,
    transferStatus: verified ? ('verified' as const) : ('rejected' as const),
    metadata: {
      ...data.metadata,
      verifiedAt: Date.now(),
      verificationResult: verified ? 'success' : 'hash_mismatch',
    },
  };

  await standardizedDataStore.update(updatedData);
  return { verified, data: updatedData };
}

export async function syncDataBetweenSystems(): Promise<{ synced: number; failed: number }> {
  const pending = await standardizedDataStore.getAllByStatus('pending');
  let synced = 0;
  let failed = 0;

  for (const data of pending) {
    try {
      const targetSystem = data.source === 'sanitation' ? 'recycling' : 'sanitation';
      await transferToSystem(data, targetSystem);
      await verifyData(data);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export async function importWasteData(rawData: Omit<WasteData, 'id' | 'timestamp'>): Promise<StandardizedWasteData> {
  const wasteData: WasteData = {
    ...rawData,
    id: generateId(),
    timestamp: Date.now(),
  };

  const validation = await validateWasteData(wasteData);
  if (!validation.valid) {
    throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
  }

  const standardized = await standardizeData(wasteData);
  await standardizedDataStore.add(standardized);

  return standardized;
}

export async function getDataBySource(source: WasteSource): Promise<StandardizedWasteData[]> {
  const all = await standardizedDataStore.getAll();
  return all.filter(d => d.source === source);
}

export async function getPendingTransfers(): Promise<StandardizedWasteData[]> {
  return standardizedDataStore.getAllByStatus('pending');
}

export async function getTransferStatistics(since?: number): Promise<{
  total: number;
  byStatus: Record<StandardizedWasteData['transferStatus'], number>;
  bySource: Record<WasteSource, number>;
}> {
  const data = await standardizedDataStore.getAll(since);
  const stats = {
    total: data.length,
    byStatus: { pending: 0, transferred: 0, verified: 0, rejected: 0 },
    bySource: { sanitation: 0, recycling: 0 },
  };

  for (const item of data) {
    stats.byStatus[item.transferStatus]++;
    stats.bySource[item.source]++;
  }

  return stats;
}
