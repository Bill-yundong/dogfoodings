import type { ProbeResult, PredictionResult, PathQuality } from '@/types';
import { predictNext, ewma, mean, stdDev, clamp } from '@/utils/math';
import { calculatePathQuality, getSensitivityMultiplier } from '@/utils/quality';
import type { ClientConfig } from '@shared/protocol';

export interface PredictionConfig {
  windowSize: number;
  ewmaAlpha: number;
  predictionHorizon: number;
  confidenceThreshold: number;
}

export interface SwitchCandidate {
  pathId: string;
  quality: PathQuality;
  improvementScore: number;
  switchRisk: number;
  priority: number;
}

const DEFAULT_CONFIG: PredictionConfig = {
  windowSize: 30,
  ewmaAlpha: 0.3,
  predictionHorizon: 5,
  confidenceThreshold: 0.6,
};

export class JitterPredictor {
  private config: PredictionConfig;
  private clientConfig: ClientConfig;
  private history: Map<string, number[]> = new Map();
  private pathQualities: Map<string, PathQuality> = new Map();
  private lastSwitchTime: number = 0;
  private minSwitchInterval: number = 30000;

  constructor(clientConfig: ClientConfig, config?: Partial<PredictionConfig>) {
    this.clientConfig = clientConfig;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  updateClientConfig(config: ClientConfig): void {
    this.clientConfig = config;
    this.minSwitchInterval = this.calculateMinSwitchInterval();
  }

  updateConfig(config: Partial<PredictionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  addResult(result: ProbeResult): void {
    const history = this.history.get(result.pathId) || [];
    history.push(result.timestamp);
    if (history.length > this.config.windowSize * 3) {
      history.shift();
    }
    this.history.set(result.pathId, history);
  }

  predict(_pathId: string, recentResults: ProbeResult[]): PredictionResult {
    const latencies = recentResults.map(r => r.latency);
    const jitters = recentResults.map(r => r.jitter);
    const losses = recentResults.map(r => r.packetLoss);

    const latencyPred = predictNext(latencies, this.config.predictionHorizon, this.config.ewmaAlpha);
    const jitterPred = predictNext(jitters, this.config.predictionHorizon, this.config.ewmaAlpha * 0.5);
    const lossPred = predictNext(losses, this.config.predictionHorizon, this.config.ewmaAlpha * 0.2);

    const avgConfidence = (latencyPred.confidence + jitterPred.confidence + lossPred.confidence) / 3;

    const smoothedLatency = ewma(latencies, this.config.ewmaAlpha);
    const predictedLatency = latencyPred.predictions[latencyPred.predictions.length - 1];
    const trend = this.getTrend(smoothedLatency, predictedLatency, jitterPred.predictions);

    const recommendation = this.getRecommendation(
      predictedLatency,
      jitterPred.predictions[jitterPred.predictions.length - 1],
      lossPred.predictions[lossPred.predictions.length - 1],
      avgConfidence,
      trend
    );

    return {
      predictedLatency: clamp(predictedLatency, 0, 1000),
      predictedJitter: clamp(jitterPred.predictions[jitterPred.predictions.length - 1], 0, 200),
      predictedLoss: clamp(lossPred.predictions[lossPred.predictions.length - 1], 0, 1),
      confidence: avgConfidence,
      trend,
      recommendation,
    };
  }

  calculatePathQualityWithPrediction(
    pathId: string,
    recentResults: ProbeResult[]
  ): PathQuality {
    const prediction = this.predict(pathId, recentResults);
    const quality = calculatePathQuality(pathId, recentResults, {
      trend: prediction.trend,
      next5sLatency: prediction.predictedLatency,
      switchRisk: 1 - prediction.confidence,
    });
    this.pathQualities.set(pathId, quality);
    return quality;
  }

  evaluateSwitchCandidates(
    currentPathId: string,
    allPathResults: Map<string, ProbeResult[]>
  ): SwitchCandidate[] {
    const candidates: SwitchCandidate[] = [];
    let currentQuality = this.pathQualities.get(currentPathId);

    if (!currentQuality) {
      const currentResults = allPathResults.get(currentPathId);
      if (!currentResults || currentResults.length < 10) return [];
      currentQuality = this.calculatePathQualityWithPrediction(currentPathId, currentResults);
    }

    for (const [pathId, results] of allPathResults) {
      if (pathId === currentPathId) continue;
      if (results.length < 10) continue;

      const quality = this.calculatePathQualityWithPrediction(pathId, results);
      const improvementScore = quality.overallScore - currentQuality.overallScore;
      const switchRisk = this.calculateSwitchRisk(currentQuality, quality);
      const priority = this.calculatePriority(improvementScore, switchRisk, quality);

      candidates.push({
        pathId,
        quality,
        improvementScore,
        switchRisk,
        priority,
      });
    }

    return candidates.sort((a, b) => b.priority - a.priority);
  }

  shouldSwitch(
    currentPathId: string,
    currentResults: ProbeResult[],
    allPathResults: Map<string, ProbeResult[]>
  ): { shouldSwitch: boolean; targetPath?: string; reason?: string } {
    const now = Date.now();
    if (now - this.lastSwitchTime < this.minSwitchInterval) {
      return { shouldSwitch: false };
    }

    const currentQuality = this.calculatePathQualityWithPrediction(currentPathId, currentResults);
    const currentPrediction = this.predict(currentPathId, currentResults);

    if (currentPrediction.recommendation === 'switch-now' && currentPrediction.confidence >= this.config.confidenceThreshold) {
      const candidates = this.evaluateSwitchCandidates(currentPathId, allPathResults);
      const bestCandidate = candidates.find(c => c.priority > 0 && c.improvementScore > 10);

      if (bestCandidate) {
        return {
          shouldSwitch: true,
          targetPath: bestCandidate.pathId,
          reason: 'predictive',
        };
      }
    }

    if (currentQuality.overallScore < 40) {
      const candidates = this.evaluateSwitchCandidates(currentPathId, allPathResults);
      const bestCandidate = candidates.find(c => c.quality.overallScore > 60);

      if (bestCandidate) {
        const worstMetric = this.getWorstMetric(currentResults);
        return {
          shouldSwitch: true,
          targetPath: bestCandidate.pathId,
          reason: worstMetric,
        };
      }
    }

    return { shouldSwitch: false };
  }

  recordSwitch(): void {
    this.lastSwitchTime = Date.now();
  }

  private calculateMinSwitchInterval(): number {
    const base = 30000;
    return base * getSensitivityMultiplier(this.clientConfig.switchSensitivity);
  }

  private getTrend(
    currentValue: number,
    predictedValue: number,
    predictedJitters: number[]
  ): 'improving' | 'stable' | 'deteriorating' {
    const diff = predictedValue - currentValue;
    const jitterIncreasing = predictedJitters.length > 1
      && predictedJitters[predictedJitters.length - 1] > predictedJitters[0];

    if (diff < -5 && !jitterIncreasing) return 'improving';
    if (diff > 10 || jitterIncreasing) return 'deteriorating';
    return 'stable';
  }

  private getRecommendation(
    predictedLatency: number,
    predictedJitter: number,
    predictedLoss: number,
    confidence: number,
    trend: 'improving' | 'stable' | 'deteriorating'
  ): 'hold' | 'prepare-switch' | 'switch-now' {
    if (confidence < this.config.confidenceThreshold) return 'hold';

    const latencyAlert = predictedLatency > this.clientConfig.latencyThreshold * 1.5;
    const jitterAlert = predictedJitter > this.clientConfig.jitterThreshold * 1.5;
    const lossAlert = predictedLoss * 100 > this.clientConfig.lossThreshold * 1.5;

    if (trend === 'deteriorating' && (latencyAlert || jitterAlert || lossAlert)) {
      return 'switch-now';
    }

    if (trend === 'deteriorating' || latencyAlert || jitterAlert || lossAlert) {
      return 'prepare-switch';
    }

    return 'hold';
  }

  private calculateSwitchRisk(
    currentQuality: PathQuality,
    targetQuality: PathQuality
  ): number {
    const qualityDiff = targetQuality.overallScore - currentQuality.overallScore;
    const stabilityDiff = targetQuality.stability - currentQuality.stability;
    const predictionRisk = targetQuality.prediction.switchRisk;

    const risk = clamp(
      0.3 + predictionRisk - qualityDiff / 100 - stabilityDiff * 0.5,
      0,
      1
    );

    return risk;
  }

  private calculatePriority(
    improvementScore: number,
    switchRisk: number,
    quality: PathQuality
  ): number {
    if (improvementScore <= 0) return 0;

    const riskWeight = 1 - switchRisk;
    const qualityBonus = quality.overallScore / 100;
    const trendBonus = quality.prediction.trend === 'improving' ? 1.2 :
                       quality.prediction.trend === 'stable' ? 1.0 : 0.8;

    return improvementScore * riskWeight * qualityBonus * trendBonus;
  }

  private getWorstMetric(results: ProbeResult[]): 'latency' | 'jitter' | 'loss' {
    if (results.length === 0) return 'latency';

    const recent = results.slice(-10);
    const avgLatency = mean(recent.map(r => r.latency));
    const avgJitter = stdDev(recent.map(r => r.latency));
    const avgLoss = mean(recent.map(r => r.packetLoss)) * 100;

    const latencyScore = avgLatency / this.clientConfig.latencyThreshold;
    const jitterScore = avgJitter / this.clientConfig.jitterThreshold;
    const lossScore = avgLoss / this.clientConfig.lossThreshold;

    if (latencyScore >= jitterScore && latencyScore >= lossScore) return 'latency';
    if (jitterScore >= latencyScore && jitterScore >= lossScore) return 'jitter';
    return 'loss';
  }

  getPathQuality(pathId: string): PathQuality | undefined {
    return this.pathQualities.get(pathId);
  }

  getAllPathQualities(): Map<string, PathQuality> {
    return new Map(this.pathQualities);
  }

  reset(): void {
    this.history.clear();
    this.pathQualities.clear();
    this.lastSwitchTime = 0;
  }
}

export const createJitterPredictor = (config: ClientConfig): JitterPredictor => {
  return new JitterPredictor(config);
};
