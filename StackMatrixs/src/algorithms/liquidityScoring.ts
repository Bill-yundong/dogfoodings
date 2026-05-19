import type { SKU, SkuSnapshot } from '@/types';

export interface LiquidityConfig {
  turnoverWeight: number;
  recencyWeight: number;
  frequencyWeight: number;
  velocityWeight: number;
}

const defaultConfig: LiquidityConfig = {
  turnoverWeight: 0.35,
  recencyWeight: 0.25,
  frequencyWeight: 0.25,
  velocityWeight: 0.15,
};

export interface LiquidityMetrics {
  turnoverRate: number;
  recencyScore: number;
  frequencyScore: number;
  velocityScore: number;
}

export function calculateRecencyScore(sku: SKU, referenceDate: Date = new Date()): number {
  const daysSinceLastOutbound = Math.max(
    0,
    (referenceDate.getTime() - new Date(sku.lastOutbound).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const halfLife = 7;
  const score = Math.exp(-daysSinceLastOutbound / halfLife);
  return Math.round(score * 100);
}

export function calculateFrequencyScore(
  sku: SKU,
  lookbackDays: number = 30,
  referenceDate: Date = new Date()
): number {
  const daysSinceInbound = Math.max(
    1,
    (referenceDate.getTime() - new Date(sku.lastInbound).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const activityDays = Math.min(daysSinceInbound, lookbackDays);
  const estimatedTransactions = sku.turnoverRate * sku.totalStock * (activityDays / 365);
  const dailyFrequency = estimatedTransactions / activityDays;

  const maxDailyFrequency = 10;
  const normalized = Math.min(1, dailyFrequency / maxDailyFrequency);
  return Math.round(normalized * 100);
}

export function calculateVelocityScore(sku: SKU): number {
  const turnoverRate = sku.turnoverRate;
  const normalized = Math.min(1, turnoverRate / 12);
  return Math.round(normalized * 100);
}

export function calculateLiquidityMetrics(
  sku: SKU,
  referenceDate: Date = new Date()
): LiquidityMetrics {
  const turnoverScore = Math.min(100, Math.round(sku.turnoverRate * 20));
  const recencyScore = calculateRecencyScore(sku, referenceDate);
  const frequencyScore = calculateFrequencyScore(sku, 30, referenceDate);
  const velocityScore = calculateVelocityScore(sku);

  return {
    turnoverRate: turnoverScore,
    recencyScore,
    frequencyScore,
    velocityScore,
  };
}

export function calculateLiquidityScore(
  sku: SKU,
  config: LiquidityConfig = defaultConfig,
  referenceDate: Date = new Date()
): number {
  const metrics = calculateLiquidityMetrics(sku, referenceDate);

  const weightedScore =
    metrics.turnoverRate * config.turnoverWeight +
    metrics.recencyScore * config.recencyWeight +
    metrics.frequencyScore * config.frequencyWeight +
    metrics.velocityScore * config.velocityWeight;

  return Math.round(Math.min(100, Math.max(0, weightedScore)));
}

export function classifyLiquidity(score: number): 'hot' | 'warm' | 'cool' | 'cold' {
  if (score >= 75) return 'hot';
  if (score >= 50) return 'warm';
  if (score >= 25) return 'cool';
  return 'cold';
}

export function batchCalculateLiquidity(
  skus: SKU[],
  config: LiquidityConfig = defaultConfig,
  referenceDate: Date = new Date()
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const sku of skus) {
    scores.set(sku.id, calculateLiquidityScore(sku, config, referenceDate));
  }
  return scores;
}

export function createSkuSnapshot(
  sku: SKU,
  liquidityScore: number,
  inboundCount: number = 0,
  outboundCount: number = 0
): SkuSnapshot {
  return {
    id: `SNAP-${sku.id}-${Date.now()}`,
    skuId: sku.id,
    snapshotDate: new Date(),
    liquidityScore,
    turnoverRate: sku.turnoverRate,
    stockLevel: sku.totalStock,
    inboundCount,
    outboundCount,
  };
}

export function calculateTrend(
  snapshots: SkuSnapshot[],
  days: number = 7
): { trend: 'up' | 'down' | 'stable'; change: number } {
  if (snapshots.length < 2) {
    return { trend: 'stable', change: 0 };
  }

  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recentSnapshots = snapshots.filter(
    (s) => new Date(s.snapshotDate) >= cutoffDate
  );

  if (recentSnapshots.length < 2) {
    return { trend: 'stable', change: 0 };
  }

  const sorted = [...recentSnapshots].sort(
    (a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
  );
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];
  const change = newest.liquidityScore - oldest.liquidityScore;

  const threshold = 5;
  if (change > threshold) return { trend: 'up', change };
  if (change < -threshold) return { trend: 'down', change };
  return { trend: 'stable', change };
}
