import {
  EXTRACTION_OPTIMAL_RANGES,
  OPTIMIZATION_FACTORS,
} from './constants';
import {
  generateId,
  getCurrentTimestamp,
  optimizeForAltitude,
  optimizeForWater,
  calculateFlavorDistance,
  calculateQualityScore,
} from './utils';
import type {
  BrewingPreset,
  StoreLocation,
  BrewingRecord,
  OptimizationResult,
  OptimizationFactor,
  OptimizationImprovement,
  FlavorProfile,
} from '@/types';

type OptimizationFactorKey = typeof OPTIMIZATION_FACTORS[number]['key'];

const OPTIMIZATION_FACTORS_MAP: Record<OptimizationFactorKey, typeof OPTIMIZATION_FACTORS[number]> = 
  OPTIMIZATION_FACTORS.reduce((acc, factor) => {
    acc[factor.key as OptimizationFactorKey] = factor;
    return acc;
  }, {} as Record<OptimizationFactorKey, typeof OPTIMIZATION_FACTORS[number]>);

interface OptimizationContext {
  preset: BrewingPreset;
  store: StoreLocation;
  historicalRecords: BrewingRecord[];
  targetConfidence: number;
  constraints: Partial<Record<OptimizationFactorKey, [number, number]>>;
}

interface FactorAnalysisResult {
  factor: OptimizationFactorKey;
  currentValue: number;
  optimalValue: number;
  unit: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  sensitivity: number;
}

class AsyncMultiFactorOptimizationEngine {
  private static instance: AsyncMultiFactorOptimizationEngine;
  private runningTasks: Map<string, Promise<OptimizationResult>> = new Map();
  private cache: Map<string, { result: OptimizationResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 3600000;

  static getInstance(): AsyncMultiFactorOptimizationEngine {
    if (!AsyncMultiFactorOptimizationEngine.instance) {
      AsyncMultiFactorOptimizationEngine.instance = new AsyncMultiFactorOptimizationEngine();
    }
    return AsyncMultiFactorOptimizationEngine.instance;
  }

  async optimize(
    preset: BrewingPreset,
    store: StoreLocation,
    historicalRecords: BrewingRecord[],
    options?: {
      targetConfidence?: number;
      constraints?: Partial<Record<OptimizationFactorKey, [number, number]>>;
    }
  ): Promise<OptimizationResult> {
    const cacheKey = `${preset.id}-${store.id}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    const existingTask = this.runningTasks.get(cacheKey);
    if (existingTask) {
      return existingTask;
    }

    const context: OptimizationContext = {
      preset,
      store,
      historicalRecords,
      targetConfidence: options?.targetConfidence ?? 0.8,
      constraints: options?.constraints ?? {},
    };

    const task = this.performOptimization(context);
    this.runningTasks.set(cacheKey, task);

    try {
      const result = await task;
      this.cache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } finally {
      this.runningTasks.delete(cacheKey);
    }
  }

  private async performOptimization(
    context: OptimizationContext
  ): Promise<OptimizationResult> {
    await this.delay(100);

    const { preset, store, historicalRecords } = context;

    const factorAnalyses = await this.analyzeFactors(context);
    const optimizedPreset = await this.applyOptimizations(context, factorAnalyses);
    const improvements = await this.calculateImprovements(
      preset,
      optimizedPreset,
      historicalRecords
    );
    const factors = this.convertToOptimizationFactors(factorAnalyses);
    const confidence = this.calculateConfidence(factorAnalyses, historicalRecords);

    const optimizedParameters: Partial<BrewingPreset> = {};
    if (optimizedPreset.waterTemperature !== preset.waterTemperature) {
      optimizedParameters.waterTemperature = optimizedPreset.waterTemperature;
    }
    if (optimizedPreset.grindSize !== preset.grindSize) {
      optimizedParameters.grindSize = optimizedPreset.grindSize;
    }
    if (optimizedPreset.dose !== preset.dose) {
      optimizedParameters.dose = optimizedPreset.dose;
    }
    if (optimizedPreset.ratio !== preset.ratio) {
      optimizedParameters.ratio = optimizedPreset.ratio;
    }
    if (optimizedPreset.brewTime !== preset.brewTime) {
      optimizedParameters.brewTime = optimizedPreset.brewTime;
    }

    const qualityImprovement = improvements.length > 0 
      ? improvements.reduce((sum, imp) => sum + imp.changePercent, 0) / improvements.length 
      : 0;

    const topFactors = factorAnalyses
      .filter(f => f.impact !== 'neutral')
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(f => this.getFactorLabel(f.factor));

    const costSaving = optimizedPreset.dose < preset.dose 
      ? ((preset.dose - optimizedPreset.dose) / preset.dose) * 100 
      : 0;

    return {
      presetId: preset.id,
      storeId: store.id,
      originalPreset: preset,
      optimizedPreset: {
        ...optimizedPreset,
        id: generateId(),
        version: this.incrementVersion(preset.version),
        updatedAt: getCurrentTimestamp(),
      },
      optimizedParameters,
      qualityImprovement,
      improvements,
      confidence,
      factors,
      topFactors,
      costSaving,
      createdAt: getCurrentTimestamp(),
    };
  }

  private async analyzeFactors(
    context: OptimizationContext
  ): Promise<FactorAnalysisResult[]> {
    const { preset, store, historicalRecords } = context;
    const results: FactorAnalysisResult[] = [];

    const factorConfigs: Array<{
      key: OptimizationFactorKey;
      currentValue: number;
    }> = [
      { key: 'altitude', currentValue: store.altitude },
      { key: 'waterHardness', currentValue: store.waterHardness },
      { key: 'waterAlkalinity', currentValue: store.waterAlkalinity },
      { key: 'temperature', currentValue: preset.waterTemperature },
      { key: 'grindSize', currentValue: preset.grindSize },
      { key: 'dose', currentValue: preset.dose },
      { key: 'ratio', currentValue: preset.ratio },
      { key: 'brewTime', currentValue: preset.brewTime },
    ];

    for (const config of factorConfigs) {
      const analysis = await this.analyzeSingleFactor(
        config.key,
        config.currentValue,
        preset,
        store,
        historicalRecords,
        context.constraints[config.key]
      );
      results.push(analysis);
    }

    return results;
  }

  private async analyzeSingleFactor(
    factor: OptimizationFactorKey,
    currentValue: number,
    preset: BrewingPreset,
    store: StoreLocation,
    historicalRecords: BrewingRecord[],
    constraint?: [number, number]
  ): Promise<FactorAnalysisResult> {
    await this.delay(10);

    const config = OPTIMIZATION_FACTORS_MAP[factor];
    const [min, max] = constraint ?? [config.min, config.max];

    const sensitivity = this.calculateFactorSensitivity(
      factor,
      preset,
      historicalRecords
    );
    const weight = this.getFactorWeight(factor);
    const optimalValue = this.calculateOptimalValue(
      factor,
      currentValue,
      preset,
      store,
      min,
      max
    );

    const diff = optimalValue - currentValue;
    let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (Math.abs(diff) > (max - min) * 0.05) {
      impact = diff > 0 ? 'positive' : 'negative';
    }

    return {
      factor,
      currentValue,
      optimalValue,
      unit: config.unit,
      impact,
      weight,
      sensitivity,
    };
  }

  private calculateFactorSensitivity(
    factor: OptimizationFactorKey,
    preset: BrewingPreset,
    records: BrewingRecord[]
  ): number {
    if (records.length < 10) return 0.5;

    const relevantRecords = records.filter(
      r => r.presetId === preset.id
    );
    if (relevantRecords.length < 5) return 0.5;

    const factorKey = this.mapFactorToRecordField(factor);
    if (!factorKey) return 0.5;

    const values = relevantRecords.map(r => r[factorKey] as number);
    const scores = relevantRecords.map(r => r.qualityScore);

    const correlation = this.calculateCorrelation(values, scores);
    return Math.abs(correlation);
  }

  private mapFactorToRecordField(
    factor: OptimizationFactorKey
  ): keyof BrewingRecord | null {
    const mapping: Partial<Record<OptimizationFactorKey, keyof BrewingRecord>> = {
      temperature: 'actualTemperature',
      dose: 'actualDose',
      brewTime: 'actualBrewTime',
    };
    return mapping[factor] ?? null;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private getFactorWeight(factor: OptimizationFactorKey): number {
    return OPTIMIZATION_FACTORS_MAP[factor].weight;
  }

  private getFactorLabel(factor: OptimizationFactorKey): string {
    const labels: Record<OptimizationFactorKey, string> = {
      altitude: '海拔高度',
      waterHardness: '水质硬度',
      waterAlkalinity: '水质碱度',
      temperature: '萃取水温',
      grindSize: '研磨度',
      dose: '咖啡粉量',
      ratio: '粉水比',
      brewTime: '萃取时间',
    };
    return labels[factor];
  }

  private calculateOptimalValue(
    factor: OptimizationFactorKey,
    currentValue: number,
    preset: BrewingPreset,
    store: StoreLocation,
    min: number,
    max: number
  ): number {
    let optimal = currentValue;

    switch (factor) {
      case 'altitude':
        optimal = store.altitude;
        break;
      case 'waterHardness':
        optimal = Math.max(80, Math.min(150, store.waterHardness));
        break;
      case 'waterAlkalinity':
        optimal = Math.max(60, Math.min(100, store.waterAlkalinity));
        break;
      case 'temperature': {
        const altitudeAdjustment = (store.altitude / 1000) * 0.5;
        const hardnessAdjustment = ((store.waterHardness - 100) / 100) * 1;
        optimal = preset.waterTemperature + altitudeAdjustment + hardnessAdjustment;
        break;
      }
      case 'grindSize': {
        const altitudeAdjustment = (store.altitude / 1000) * -30;
        const hardnessAdjustment = ((store.waterHardness - 100) / 100) * 20;
        optimal = preset.grindSize + altitudeAdjustment + hardnessAdjustment;
        break;
      }
      case 'dose': {
        const methodRange = EXTRACTION_OPTIMAL_RANGES[preset.method];
        const yieldTarget = methodRange.yield;
        const avgYield = (yieldTarget.min + yieldTarget.max) / 2;
        optimal = (preset.targetTDS * preset.totalWater) / avgYield / 10;
        break;
      }
      case 'ratio': {
        const methodRange = EXTRACTION_OPTIMAL_RANGES[preset.method];
        const tdsTarget = methodRange.tds;
        const avgTDS = (tdsTarget.min + tdsTarget.max) / 2;
        optimal = (avgTDS * preset.brewTime) / preset.dose;
        break;
      }
      case 'brewTime': {
        const alkalinityAdjustment = ((store.waterAlkalinity - 80) / 80) * 5;
        optimal = preset.brewTime + alkalinityAdjustment;
        break;
      }
    }

    return Math.max(min, Math.min(max, optimal));
  }

  private async applyOptimizations(
    context: OptimizationContext,
    factorAnalyses: FactorAnalysisResult[]
  ): Promise<BrewingPreset> {
    const { preset, store } = context;
    let optimized = { ...preset };

    const altitudeOpt = optimizeForAltitude(preset, store.altitude);
    optimized = { ...optimized, ...altitudeOpt };

    const waterOpt = optimizeForWater(
      preset,
      store.waterHardness,
      store.waterAlkalinity
    );
    optimized = { ...optimized, ...waterOpt };

    for (const analysis of factorAnalyses) {
      if (analysis.impact === 'neutral') continue;

      switch (analysis.factor) {
        case 'temperature':
          optimized.waterTemperature = analysis.optimalValue;
          break;
        case 'grindSize':
          optimized.grindSize = analysis.optimalValue;
          break;
        case 'dose':
          optimized.dose = analysis.optimalValue;
          optimized.totalWater = optimized.dose * optimized.ratio;
          break;
        case 'ratio':
          optimized.ratio = analysis.optimalValue;
          optimized.totalWater = optimized.dose * optimized.ratio;
          break;
        case 'brewTime':
          optimized.brewTime = analysis.optimalValue;
          break;
      }
    }

    optimized.targetFlavor = this.optimizeFlavorProfile(
      preset.targetFlavor,
      store,
      factorAnalyses
    );

    return optimized;
  }

  private optimizeFlavorProfile(
    target: FlavorProfile,
    store: StoreLocation,
    factorAnalyses: FactorAnalysisResult[]
  ): FlavorProfile {
    const optimized = { ...target };

    const alkalinityFactor = factorAnalyses.find(f => f.factor === 'waterAlkalinity');
    if (alkalinityFactor && alkalinityFactor.impact === 'positive') {
      optimized.acidity = Math.max(1, Math.min(10, optimized.acidity - 0.5));
    }

    const hardnessFactor = factorAnalyses.find(f => f.factor === 'waterHardness');
    if (hardnessFactor && hardnessFactor.impact === 'positive') {
      optimized.body = Math.max(1, Math.min(10, optimized.body + 0.3));
    }

    const altitudeFactor = factorAnalyses.find(f => f.factor === 'altitude');
    if (altitudeFactor && altitudeFactor.currentValue > 1500) {
      optimized.aroma = Math.max(1, Math.min(10, optimized.aroma + 0.3));
    }

    return optimized;
  }

  private async calculateImprovements(
    original: BrewingPreset,
    optimized: BrewingPreset,
    historicalRecords: BrewingRecord[]
  ): Promise<OptimizationImprovement[]> {
    const improvements: OptimizationImprovement[] = [];

    const flavorDistanceBefore = calculateFlavorDistance(
      original.targetFlavor,
      original.targetFlavor
    );
    const flavorDistanceAfter = calculateFlavorDistance(
      optimized.targetFlavor,
      original.targetFlavor
    );
    const flavorImprovement = ((flavorDistanceBefore - flavorDistanceAfter) / Math.max(flavorDistanceBefore, 0.1)) * 100;

    improvements.push({
      category: 'flavor',
      metric: '风味匹配度',
      before: Math.max(0, 100 - flavorDistanceBefore * 5),
      after: Math.max(0, 100 - flavorDistanceAfter * 5),
      changePercent: flavorImprovement,
      description: '基于门店环境调整的风味目标优化',
    });

    const tempDiff = Math.abs(optimized.waterTemperature - original.waterTemperature);
    if (tempDiff > 0.5) {
      improvements.push({
        category: 'consistency',
        metric: '水温稳定性',
        before: original.waterTemperature,
        after: optimized.waterTemperature,
        changePercent: (tempDiff / original.waterTemperature) * 100,
        description: '适应门店海拔和水质的水温调整',
      });
    }

    const grindDiff = Math.abs(optimized.grindSize - original.grindSize);
    if (grindDiff > 20) {
      improvements.push({
        category: 'efficiency',
        metric: '研磨度',
        before: original.grindSize,
        after: optimized.grindSize,
        changePercent: (grindDiff / original.grindSize) * 100,
        description: '优化萃取均匀性的研磨度调整',
      });
    }

    if (historicalRecords.length > 0) {
      const avgScore = historicalRecords.reduce((sum, r) => sum + r.qualityScore, 0) / historicalRecords.length;
      const estimatedScore = calculateQualityScore(
        optimized.targetFlavor,
        original.targetFlavor,
        optimized.targetTDS,
        original.targetTDS,
        optimized.targetYield,
        original.targetYield
      );

      improvements.push({
        category: 'consistency',
        metric: '品质评分',
        before: avgScore,
        after: estimatedScore,
        changePercent: ((estimatedScore - avgScore) / avgScore) * 100,
        description: '预计品质评分提升',
      });
    }

    const yieldImprovement = ((optimized.targetYield - original.targetYield) / original.targetYield) * 100;
    if (Math.abs(yieldImprovement) > 1) {
      improvements.push({
        category: 'yield',
        metric: '萃取率',
        before: original.targetYield,
        after: optimized.targetYield,
        changePercent: yieldImprovement,
        description: '萃取效率优化',
      });
    }

    return improvements;
  }

  private convertToOptimizationFactors(
    analyses: FactorAnalysisResult[]
  ): OptimizationFactor[] {
    return analyses.map(analysis => ({
      name: this.getFactorLabel(analysis.factor),
      weight: analysis.weight,
      value: analysis.optimalValue,
      unit: analysis.unit,
      impact: analysis.impact,
    }));
  }

  private calculateConfidence(
    factorAnalyses: FactorAnalysisResult[],
    historicalRecords: BrewingRecord[]
  ): number {
    let totalWeightedSensitivity = 0;
    let totalWeight = 0;

    for (const analysis of factorAnalyses) {
      totalWeightedSensitivity += analysis.sensitivity * analysis.weight;
      totalWeight += analysis.weight;
    }

    const avgSensitivity = totalWeight > 0 ? totalWeightedSensitivity / totalWeight : 0.5;
    const dataConfidence = Math.min(1, historicalRecords.length / 50);
    const baseConfidence = 0.5 + avgSensitivity * 0.3;

    return Math.min(0.98, baseConfidence * (0.7 + dataConfidence * 0.3));
  }

  private incrementVersion(version: number): number {
    return version + 1;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearCache(): void {
    this.cache.clear();
    this.runningTasks.clear();
  }
}

export const optimizationEngine = AsyncMultiFactorOptimizationEngine.getInstance();

export async function runBatchOptimization(
  presets: BrewingPreset[],
  stores: StoreLocation[],
  records: BrewingRecord[]
): Promise<OptimizationResult[]> {
  const results: OptimizationResult[] = [];

  for (const store of stores) {
    const storeRecords = records.filter(r => r.storeId === store.id);
    
    for (const preset of presets) {
      if (preset.region !== 'global' && preset.region !== store.region) {
        continue;
      }

      const presetRecords = storeRecords.filter(r => r.presetId === preset.id);
      
      try {
        const result = await optimizationEngine.optimize(
          preset,
          store,
          presetRecords
        );
        results.push(result);
      } catch (error) {
        console.error(`Optimization failed for preset ${preset.id} at store ${store.id}:`, error);
      }
    }
  }

  return results;
}
