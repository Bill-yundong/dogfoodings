import { CombinedFeatures, FlashoverPrediction, EnvironmentalData } from '@/types';

export class FlashoverPredictor {
  private modelParameters: {
    thdWeight: number;
    rmsWeight: number;
    harmonicWeight: number;
    spectralEntropyWeight: number;
    humidityWeight: number;
    pollutionWeight: number;
    baselineThreshold: number;
  };

  constructor() {
    this.modelParameters = {
      thdWeight: 0.25,
      rmsWeight: 0.2,
      harmonicWeight: 0.2,
      spectralEntropyWeight: 0.15,
      humidityWeight: 0.1,
      pollutionWeight: 0.1,
      baselineThreshold: 0.3
    };
  }

  async predictAsync(
    features: CombinedFeatures,
    environmentalData: EnvironmentalData
  ): Promise<FlashoverPrediction> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const prediction = this.calculatePrediction(features, environmentalData);
        resolve(prediction);
      }, 0);
    });
  }

  private calculatePrediction(
    features: CombinedFeatures,
    environmentalData: EnvironmentalData
  ): FlashoverPrediction {
    const scores: { factor: string; score: number }[] = [];

    const thdScore = this.normalizeTHD(features.frequencyDomain.totalHarmonicDistortion);
    scores.push({ factor: '总谐波畸变率', score: thdScore * this.modelParameters.thdWeight });

    const rmsScore = this.normalizeRMS(features.timeDomain.rmsValue);
    scores.push({ factor: '电流有效值', score: rmsScore * this.modelParameters.rmsWeight });

    const harmonicScore = this.normalizeHarmonicRatios(features.frequencyDomain.harmonicRatios);
    scores.push({ factor: '谐波含量', score: harmonicScore * this.modelParameters.harmonicWeight });

    const entropyScore = this.normalizeSpectralEntropy(features.frequencyDomain.spectralEntropy);
    scores.push({ factor: '频谱熵', score: entropyScore * this.modelParameters.spectralEntropyWeight });

    const humidityScore = this.normalizeHumidity(environmentalData.humidity);
    scores.push({ factor: '环境湿度', score: humidityScore * this.modelParameters.humidityWeight });

    const pollutionScore = this.normalizePollution(environmentalData.pollutionLevel);
    scores.push({ factor: '污秽程度', score: pollutionScore * this.modelParameters.pollutionWeight });

    const totalProbability = Math.min(1, scores.reduce((sum, s) => sum + s.score, 0));

    const riskLevel = this.determineRiskLevel(totalProbability);

    const contributingFactors = scores
      .filter(s => s.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.factor);

    const confidence = this.calculateConfidence(features);

    const predictedTime = this.calculatePredictedTime(totalProbability);

    return {
      probability: totalProbability,
      riskLevel,
      confidence,
      predictedTime,
      contributingFactors
    };
  }

  private normalizeTHD(thd: number): number {
    return Math.min(1, thd / 0.5);
  }

  private normalizeRMS(rms: number): number {
    return Math.min(1, rms / 2);
  }

  private normalizeHarmonicRatios(ratios: number[]): number {
    if (ratios.length === 0) return 0;
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    return Math.min(1, avgRatio * 2);
  }

  private normalizeSpectralEntropy(entropy: number): number {
    return Math.max(0, 1 - entropy / 8);
  }

  private normalizeHumidity(humidity: number): number {
    return humidity / 100;
  }

  private normalizePollution(pollution: number): number {
    return pollution / 10;
  }

  private determineRiskLevel(probability: number): FlashoverPrediction['riskLevel'] {
    if (probability >= 0.8) return 'critical';
    if (probability >= 0.5) return 'high';
    if (probability >= 0.3) return 'medium';
    return 'low';
  }

  private calculateConfidence(features: CombinedFeatures): number {
    const dataQuality = Math.min(1, features.timeDomain.rmsValue / 0.5);
    const signalStability = Math.max(0, 1 - features.timeDomain.variance);
    return (dataQuality + signalStability) / 2;
  }

  private calculatePredictedTime(probability: number): number {
    if (probability < 0.3) return Infinity;
    if (probability < 0.5) return 24 * 60 * 60 * 1000;
    if (probability < 0.8) return 6 * 60 * 60 * 1000;
    return 1 * 60 * 60 * 1000;
  }

  async predictBatch(
    predictions: Array<{ features: CombinedFeatures; environmentalData: EnvironmentalData }>
  ): Promise<FlashoverPrediction[]> {
    const results: FlashoverPrediction[] = [];
    for (const p of predictions) {
      const result = await this.predictAsync(p.features, p.environmentalData);
      results.push(result);
    }
    return results;
  }

  generateMaintenanceRecommendation(prediction: FlashoverPrediction): string {
    switch (prediction.riskLevel) {
      case 'critical':
        return '立即停电检修，建议更换绝缘子';
      case 'high':
        return '安排紧急清洗，24小时内完成';
      case 'medium':
        return '列入近期维护计划，7天内安排检查';
      case 'low':
        return '正常运行，保持常规监测';
      default:
        return '状态未知，需要进一步分析';
    }
  }
}

export function createMockEnvironmentalData(): EnvironmentalData {
  return {
    temperature: 15 + Math.random() * 20,
    humidity: 40 + Math.random() * 40,
    pollutionLevel: 2 + Math.random() * 5,
    windSpeed: Math.random() * 10,
    precipitation: Math.random() > 0.8 ? Math.random() * 5 : 0
  };
}