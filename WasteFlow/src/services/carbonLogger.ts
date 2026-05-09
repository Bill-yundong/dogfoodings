import type { CarbonFootprintLog } from '../types';
import { generateId } from '../utils/hash';
import { carbonLogsStore } from './indexedDB';

const CARBON_FACTORS = {
  collection: {
    co2PerKg: 0.05,
    co2SavedPerKg: 0,
  },
  transport: {
    co2PerKm: 0.25,
    co2SavedPerKm: 0,
  },
  processing: {
    co2PerKg: 0.1,
    co2SavedPerKg: 0,
  },
  recycling: {
    co2PerKg: 0.02,
    co2SavedPerKg: 2.5,
  },
  disposal: {
    co2PerKg: 0.5,
    co2SavedPerKg: 0,
  },
};

const WASTE_TYPE_RECYCLING_RATES: Record<string, number> = {
  organic: 0.3,
  recyclable: 0.95,
  hazardous: 0.1,
  residual: 0.05,
};

export function calculateCarbonEmissions(
  actionType: CarbonFootprintLog['actionType'],
  weight: number,
  wasteType: string,
  distance?: number
): { co2Emitted: number; co2Saved: number; netReduction: number } {
  let co2Emitted = 0;
  let co2Saved = 0;

  if (actionType === 'transport' && distance) {
    co2Emitted = CARBON_FACTORS.transport.co2PerKm * distance;
  } else if (actionType === 'recycling') {
    co2Emitted = CARBON_FACTORS.recycling.co2PerKg * weight;
  } else if (actionType === 'collection') {
    co2Emitted = CARBON_FACTORS.collection.co2PerKg * weight;
  } else if (actionType === 'processing') {
    co2Emitted = CARBON_FACTORS.processing.co2PerKg * weight;
  } else if (actionType === 'disposal') {
    co2Emitted = CARBON_FACTORS.disposal.co2PerKg * weight;
  }

  if (actionType === 'recycling') {
    const recyclingRate = WASTE_TYPE_RECYCLING_RATES[wasteType] || 0.5;
    co2Saved = CARBON_FACTORS.recycling.co2SavedPerKg * weight * recyclingRate;
  } else if (actionType === 'processing') {
    const recyclingRate = WASTE_TYPE_RECYCLING_RATES[wasteType] || 0.5;
    co2Saved = co2Emitted * recyclingRate * 0.5;
  }

  return {
    co2Emitted,
    co2Saved,
    netReduction: co2Saved - co2Emitted,
  };
}

export async function logCarbonFootprint(
  actionType: CarbonFootprintLog['actionType'],
  wasteType: string,
  weight: number,
  distance?: number,
  metadata: Record<string, unknown> = {}
): Promise<CarbonFootprintLog> {
  const emissions = calculateCarbonEmissions(actionType, weight, wasteType, distance);

  const log: CarbonFootprintLog = {
    id: generateId(),
    timestamp: Date.now(),
    actionType,
    wasteType,
    weight,
    distance,
    ...emissions,
    metadata,
  };

  await carbonLogsStore.add(log);
  return log;
}

export async function getCarbonReductionSummary(days: number = 30): Promise<{
  period: string;
  totalWeight: number;
  totalCO2Emitted: number;
  totalCO2Saved: number;
  netReduction: number;
  byActionType: Record<string, {
    weight: number;
    co2Emitted: number;
    co2Saved: number;
    netReduction: number;
  }>;
  byWasteType: Record<string, {
    weight: number;
    co2Saved: number;
  }>;
  dailyTrend: {
    date: string;
    netReduction: number;
  }[];
}> {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const logs = await carbonLogsStore.getAll(since);

  const summary = {
    period: `最近${days}天`,
    totalWeight: 0,
    totalCO2Emitted: 0,
    totalCO2Saved: 0,
    netReduction: 0,
    byActionType: {} as Record<string, { weight: number; co2Emitted: number; co2Saved: number; netReduction: number }>,
    byWasteType: {} as Record<string, { weight: number; co2Saved: number }>,
    dailyTrend: [] as { date: string; netReduction: number }[],
  };

  const dailyMap = new Map<string, number>();

  for (const log of logs) {
    summary.totalWeight += log.weight;
    summary.totalCO2Emitted += log.co2Emitted;
    summary.totalCO2Saved += log.co2Saved;
    summary.netReduction += log.netReduction;

    if (!summary.byActionType[log.actionType]) {
      summary.byActionType[log.actionType] = { weight: 0, co2Emitted: 0, co2Saved: 0, netReduction: 0 };
    }
    summary.byActionType[log.actionType].weight += log.weight;
    summary.byActionType[log.actionType].co2Emitted += log.co2Emitted;
    summary.byActionType[log.actionType].co2Saved += log.co2Saved;
    summary.byActionType[log.actionType].netReduction += log.netReduction;

    if (!summary.byWasteType[log.wasteType]) {
      summary.byWasteType[log.wasteType] = { weight: 0, co2Saved: 0 };
    }
    summary.byWasteType[log.wasteType].weight += log.weight;
    summary.byWasteType[log.wasteType].co2Saved += log.co2Saved;

    const date = new Date(log.timestamp).toISOString().split('T')[0];
    dailyMap.set(date, (dailyMap.get(date) || 0) + log.netReduction);
  }

  summary.dailyTrend = Array.from(dailyMap.entries())
    .map(([date, netReduction]) => ({ date, netReduction }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return summary;
}

export async function getEnvironmentalImpact(days: number = 30): Promise<{
  treesEquivalent: number;
  carsOffRoadDays: number;
  homesPoweredDays: number;
  description: string;
}> {
  const summary = await getCarbonReductionSummary(days);

  const CO2_PER_TREE_PER_YEAR = 22;
  const CO2_PER_CAR_PER_DAY = 4.6;
  const CO2_PER_HOME_PER_DAY = 20;

  const netReductionKg = summary.netReduction;

  const treesEquivalent = netReductionKg > 0 ? Math.round((netReductionKg / 1000) / (CO2_PER_TREE_PER_YEAR / 365) * 10) / 10 : 0;
  const carsOffRoadDays = netReductionKg > 0 ? Math.round((netReductionKg / 1000) / CO2_PER_CAR_PER_DAY * 10) / 10 : 0;
  const homesPoweredDays = netReductionKg > 0 ? Math.round((netReductionKg / 1000) / CO2_PER_HOME_PER_DAY * 10) / 10 : 0;

  let description = '';
  if (netReductionKg > 1000) {
    description = `优秀！您的减碳行动相当于种植了约 ${treesEquivalent} 棵树`;
  } else if (netReductionKg > 500) {
    description = `很好！您的减碳行动相当于让 ${carsOffRoadDays} 辆汽车停驶一天`;
  } else if (netReductionKg > 0) {
    description = `持续努力，您的减碳行动正在产生积极影响`;
  } else {
    description = `建议优化清运路线和增加回收比例以减少碳排放`;
  }

  return {
    treesEquivalent,
    carsOffRoadDays,
    homesPoweredDays,
    description,
  };
}

export async function generateCarbonReport(days: number = 30): Promise<{
  summary: Awaited<ReturnType<typeof getCarbonReductionSummary>>;
  impact: Awaited<ReturnType<typeof getEnvironmentalImpact>>;
  recommendations: string[];
}> {
  const summary = await getCarbonReductionSummary(days);
  const impact = await getEnvironmentalImpact(days);

  const recommendations: string[] = [];

  if (summary.byActionType.transport && summary.byActionType.transport.co2Emitted > summary.totalCO2Emitted * 0.4) {
    recommendations.push('运输环节碳排放占比较高，建议优化清运路线和车辆调度');
  }

  if (summary.byWasteType.residual && summary.byWasteType.residual.weight > summary.totalWeight * 0.3) {
    recommendations.push('残余垃圾比例较高，建议加强源头分类指导');
  }

  const recyclingWeight = summary.byActionType.recycling?.weight || 0;
  if (recyclingWeight / summary.totalWeight < 0.3) {
    recommendations.push('可回收物处理比例偏低，建议增加回收设施和宣传力度');
  }

  if (recommendations.length === 0) {
    recommendations.push('当前运营状态良好，请继续保持');
  }

  return {
    summary,
    impact,
    recommendations,
  };
}
