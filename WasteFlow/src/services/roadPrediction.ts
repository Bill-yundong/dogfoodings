import type { RoadNetworkLoad, PeakPrediction } from '../types';
import { generateId } from '../utils/hash';
import { roadLoadsStore, peakPredictionsStore } from './indexedDB';

export function calculateMovingAverage(loads: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i <= loads.length - period; i++) {
    const sum = loads.slice(i, i + period).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

export function detectSeasonalPattern(loads: RoadNetworkLoad[]): { peakHours: number[]; avgPeakLoad: number } {
  const hourBuckets = new Map<number, number[]>();

  for (const load of loads) {
    const date = new Date(load.timestamp);
    const hour = date.getHours();
    const existing = hourBuckets.get(hour) || [];
    existing.push(load.currentLoad);
    hourBuckets.set(hour, existing);
  }

  const hourAvgs = new Map<number, number>();
  for (const [hour, values] of hourBuckets) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    hourAvgs.set(hour, avg);
  }

  const sorted = Array.from(hourAvgs.entries()).sort((a, b) => b[1] - a[1]);
  const peakHours = sorted.slice(0, 3).map(([hour]) => hour);
  const avgPeakLoad = peakHours.reduce((sum, h) => sum + (hourAvgs.get(h) || 0), 0) / peakHours.length;

  return { peakHours, avgPeakLoad };
}

export function predictPeakLoad(
  historicalLoads: RoadNetworkLoad[],
  roadId: string,
  predictionWindowMs: number = 2 * 60 * 60 * 1000
): PeakPrediction {
  if (historicalLoads.length < 10) {
    return generateBaselinePrediction(roadId, predictionWindowMs);
  }

  const { peakHours, avgPeakLoad } = detectSeasonalPattern(historicalLoads);
  const loads = historicalLoads.map(l => l.currentLoad);
  const movingAvgs = calculateMovingAverage(loads, 5);

  const latestLoad = loads[loads.length - 1] || 0;
  const avgLoad = movingAvgs[movingAvgs.length - 1] || latestLoad;

  const trend = movingAvgs.length >= 2
    ? movingAvgs[movingAvgs.length - 1] - movingAvgs[movingAvgs.length - 2]
    : 0;

  const now = Date.now();
  const currentHour = new Date(now).getHours();
  const isNearPeak = peakHours.some(h => Math.abs(h - currentHour) <= 2);

  const basePrediction = avgPeakLoad * 0.8 + avgLoad * 0.2;
  const trendAdjustment = trend * (predictionWindowMs / (30 * 60 * 1000));
  const peakAdjustment = isNearPeak ? avgPeakLoad * 0.15 : 0;

  const predictedLoad = Math.max(0, Math.min(1, basePrediction + trendAdjustment + peakAdjustment));

  const confidence = calculateConfidence(historicalLoads, predictedLoad, isNearPeak);
  const predictedPeakTime = calculatePredictedPeakTime(now, peakHours, currentHour);

  const prediction: PeakPrediction = {
    id: generateId(),
    roadId,
    predictedAt: now,
    predictedPeakTime,
    predictedLoad,
    confidence,
    timeWindow: {
      start: now,
      end: now + predictionWindowMs,
    },
    recommendedAction: generateRecommendation(predictedLoad, confidence),
  };

  return prediction;
}

function calculateConfidence(loads: RoadNetworkLoad[], predictedLoad: number, isNearPeak: boolean): number {
  const baseConfidence = Math.min(0.9, 0.5 + (loads.length * 0.01));
  const loadVariance = calculateVariance(loads.map(l => l.currentLoad));
  const varianceFactor = Math.max(0, 1 - loadVariance * 2);
  const peakFactor = isNearPeak ? 0.1 : -0.05;
  const uncertaintyFactor = Math.abs(predictedLoad - 0.5) * 0.1;

  return Math.max(0.3, Math.min(0.95, baseConfidence * varianceFactor + peakFactor - uncertaintyFactor));
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

function calculatePredictedPeakTime(now: number, peakHours: number[], currentHour: number): number {
  const nextPeak = peakHours.find(h => h > currentHour) || peakHours[0] + 24;
  const peakDate = new Date(now);
  peakDate.setHours(nextPeak % 24, 0, 0, 0);

  if (nextPeak > 23) {
    peakDate.setDate(peakDate.getDate() + 1);
  }

  return peakDate.getTime();
}

function generateBaselinePrediction(roadId: string, windowMs: number): PeakPrediction {
  const now = Date.now();
  return {
    id: generateId(),
    roadId,
    predictedAt: now,
    predictedPeakTime: now + windowMs / 2,
    predictedLoad: 0.6,
    confidence: 0.4,
    timeWindow: {
      start: now,
      end: now + windowMs,
    },
    recommendedAction: '数据不足，建议增加历史数据采集以提高预测准确性',
  };
}

function generateRecommendation(predictedLoad: number, confidence: number): string {
  if (predictedLoad > 0.9 && confidence > 0.7) {
    return '预测将出现严重拥堵，建议立即调度备用路线或调整清运时间';
  }
  if (predictedLoad > 0.7 && confidence > 0.6) {
    return '预测将出现中度拥堵，建议提前30分钟出发或选择备选路线';
  }
  if (predictedLoad > 0.5) {
    return '预测将出现轻度拥堵，建议保持关注实时路况';
  }
  return '路况正常，按原计划执行清运任务';
}

export async function recordRoadLoad(
  roadId: string,
  currentLoad: number,
  maxCapacity: number = 1,
  flowRate: number = 0
): Promise<RoadNetworkLoad> {
  const loadRatio = currentLoad / maxCapacity;
  let congestionLevel: RoadNetworkLoad['congestionLevel'];

  if (loadRatio >= 0.9) congestionLevel = 'critical';
  else if (loadRatio >= 0.7) congestionLevel = 'high';
  else if (loadRatio >= 0.4) congestionLevel = 'medium';
  else congestionLevel = 'low';

  const load: RoadNetworkLoad = {
    id: generateId(),
    roadId,
    timestamp: Date.now(),
    currentLoad: loadRatio,
    maxCapacity,
    flowRate,
    congestionLevel,
  };

  await roadLoadsStore.add(load);
  return load;
}

export async function runPrediction(roadId: string): Promise<PeakPrediction> {
  const historicalData = await roadLoadsStore.getByRoadId(roadId, 200);
  const prediction = predictPeakLoad(historicalData, roadId);
  await peakPredictionsStore.add(prediction);
  return prediction;
}

export async function getRoadLoadSummary(roadId: string): Promise<{
  currentLoad: RoadNetworkLoad | null;
  latestPrediction: PeakPrediction | null;
  historicalSummary: {
    avgLoad: number;
    peakLoad: number;
    avgFlowRate: number;
  };
}> {
  const loads = await roadLoadsStore.getByRoadId(roadId, 100);
  const predictions = await peakPredictionsStore.getByRoadId(roadId);

  const sortedPredictions = predictions.sort((a, b) => b.predictedAt - a.predictedAt);
  const latestPrediction = sortedPredictions[0] || null;

  const historicalSummary = loads.length > 0 ? {
    avgLoad: loads.reduce((sum, l) => sum + l.currentLoad, 0) / loads.length,
    peakLoad: Math.max(...loads.map(l => l.currentLoad)),
    avgFlowRate: loads.reduce((sum, l) => sum + l.flowRate, 0) / loads.length,
  } : {
    avgLoad: 0,
    peakLoad: 0,
    avgFlowRate: 0,
  };

  const sortedLoads = loads.sort((a, b) => b.timestamp - a.timestamp);
  const currentLoad = sortedLoads[0] || null;

  return {
    currentLoad,
    latestPrediction,
    historicalSummary,
  };
}
