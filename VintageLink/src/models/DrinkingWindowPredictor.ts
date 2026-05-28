import type {
  WineLabel,
  WineBottle,
  MaturationModel,
  DrinkingWindow,
  SensorReading,
  CellarZone,
} from '@/types';

interface PredictionOptions {
  scenario?: 'optimal' | 'conservative' | 'aggressive';
  includeConfidence?: boolean;
}

interface AgingCurvePoint {
  age: number;
  qualityScore: number;
  derivative: number;
}

export class AsyncDrinkingWindowPredictor {
  private readonly CURVE_PEAK_SHARPNESS = 0.15;
  private readonly AGING_RATE_BASE = 0.08;

  async predictWindow(
    label: WineLabel,
    bottle: WineBottle,
    maturation: MaturationModel,
    readings: SensorReading[],
    zone: CellarZone,
    options: PredictionOptions = {}
  ): Promise<DrinkingWindow> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const window = this.calculateWindow(label, bottle, maturation, readings, zone, options);
        resolve(window);
      }, 100);
    });
  }

  async predictBatch(
    wines: { label: WineLabel; bottle: WineBottle; maturation: MaturationModel }[],
    readings: SensorReading[],
    zone: CellarZone,
    options: PredictionOptions = {}
  ): Promise<DrinkingWindow[]> {
    return Promise.all(
      wines.map(w => this.predictWindow(w.label, w.bottle, w.maturation, readings, zone, options))
    );
  }

  private calculateWindow(
    label: WineLabel,
    bottle: WineBottle,
    maturation: MaturationModel,
    readings: SensorReading[],
    zone: CellarZone,
    options: PredictionOptions
  ): DrinkingWindow {
    const { scenario = 'optimal' } = options;
    const now = Date.now();
    const vintageTimestamp = label.vintage * 31536000000;

    const storageConditionFactor = this.calculateStorageConditionFactor(readings, zone);
    const scenarioMultiplier = this.getScenarioMultiplier(scenario);
    const adjustedAgingRate = this.AGING_RATE_BASE * storageConditionFactor * scenarioMultiplier;

    const agingCurve = this.generateAgingCurve(label, adjustedAgingRate);

    const { windowStart, windowEnd, peakDate } = this.findWindowBounds(
      agingCurve,
      label,
      vintageTimestamp,
      adjustedAgingRate
    );

    const confidence = this.calculateConfidence(
      label,
      maturation,
      storageConditionFactor,
      scenario
    );

    const currentAge = (now - vintageTimestamp) / 31536000000;
    const drinkingRecommendation = this.generateRecommendation(
      currentAge,
      windowStart,
      windowEnd,
      peakDate,
      confidence
    );

    const foodPairings = this.generateFoodPairings(label);

    return {
      wineId: bottle.id,
      windowStart,
      windowEnd,
      peakDate,
      confidence,
      drinkingRecommendation,
      foodPairings,
      decantingTime: this.calculateDecantingTime(label, maturation),
      servingTemperature: this.calculateServingTemperature(label),
    };
  }

  private generateAgingCurve(
    label: WineLabel,
    agingRate: number
  ): AgingCurvePoint[] {
    const curve: AgingCurvePoint[] = [];
    const peakMid = (label.agingPotential.peakStart + label.agingPotential.peakEnd) / 2;
    const peakWidth = (label.agingPotential.peakEnd - label.agingPotential.peakStart) / 2;

    for (let age = 0; age <= label.agingPotential.maxYears + 10; age += 0.5) {
      const distanceFromPeak = age - peakMid;
      const normalizedDistance = distanceFromPeak / peakWidth;

      let qualityScore: number;
      let derivative: number;

      if (age < label.agingPotential.minYears) {
        const developmentProgress = age / label.agingPotential.minYears;
        qualityScore = 50 + developmentProgress * 30;
        derivative = 30 / label.agingPotential.minYears;
      } else if (age <= label.agingPotential.peakEnd) {
        const gaussian = Math.exp(-Math.pow(normalizedDistance * this.CURVE_PEAK_SHARPNESS * 5, 2));
        const plateauFactor = age >= label.agingPotential.peakStart && age <= label.agingPotential.peakEnd ? 1 : 0.9;
        qualityScore = 80 + gaussian * 15 * plateauFactor;
        derivative = -normalizedDistance * this.CURVE_PEAK_SHARPNESS * 10 * gaussian * 15;
      } else {
        const declineRate = agingRate * 2;
        const yearsPastPeak = age - label.agingPotential.peakEnd;
        qualityScore = Math.max(40, 90 - yearsPastPeak * declineRate * 10);
        derivative = -declineRate * 10;
      }

      curve.push({ age, qualityScore, derivative });
    }

    return curve;
  }

  private findWindowBounds(
    curve: AgingCurvePoint[],
    label: WineLabel,
    vintageTimestamp: number,
    agingRate: number
  ): { windowStart: number; windowEnd: number; peakDate: number } {
    const threshold = 80;

    let startAge = label.agingPotential.minYears;
    let endAge = label.agingPotential.maxYears;
    let peakAge = (label.agingPotential.peakStart + label.agingPotential.peakEnd) / 2;

    let maxScore = 0;
    curve.forEach(point => {
      if (point.qualityScore > maxScore) {
        maxScore = point.qualityScore;
        peakAge = point.age;
      }
    });

    for (let i = 0; i < curve.length; i++) {
      if (curve[i].qualityScore >= threshold && curve[i].age >= label.agingPotential.minYears) {
        startAge = curve[i].age;
        break;
      }
    }

    for (let i = curve.length - 1; i >= 0; i--) {
      if (curve[i].qualityScore >= threshold && curve[i].age <= label.agingPotential.maxYears + 5) {
        endAge = curve[i].age;
        break;
      }
    }

    const adjustmentFactor = 1 + (1 - agingRate) * 2;

    return {
      windowStart: vintageTimestamp + startAge * 31536000000 * adjustmentFactor,
      windowEnd: vintageTimestamp + endAge * 31536000000 * adjustmentFactor,
      peakDate: vintageTimestamp + peakAge * 31536000000 * adjustmentFactor,
    };
  }

  private calculateStorageConditionFactor(
    readings: SensorReading[],
    zone: CellarZone
  ): number {
    if (readings.length === 0) return 1;

    const avgTemp = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length;
    const avgHumidity = readings.reduce((sum, r) => sum + r.humidity, 0) / readings.length;

    const tempScore = this.scoreTemperature(avgTemp, zone);
    const humidityScore = this.scoreHumidity(avgHumidity, zone);

    const tempVariation = this.calculateVariation(readings.map(r => r.temperature));
    const variationScore = tempVariation <= 1 ? 1 : tempVariation <= 2 ? 0.9 : tempVariation <= 3 ? 0.75 : 0.5;

    return (tempScore * 0.4 + humidityScore * 0.3 + variationScore * 0.3);
  }

  private scoreTemperature(temp: number, zone: CellarZone): number {
    const { min, max, optimal } = zone.targetTemperature;
    if (temp >= min && temp <= max) {
      const distanceFromOptimal = Math.abs(temp - optimal);
      const range = max - min;
      return 1 - (distanceFromOptimal / range) * 0.3;
    }
    return Math.max(0.5, 1 - Math.abs(temp - optimal) * 0.1);
  }

  private scoreHumidity(humidity: number, zone: CellarZone): number {
    const { min, max, optimal } = zone.targetHumidity;
    if (humidity >= min && humidity <= max) {
      const distanceFromOptimal = Math.abs(humidity - optimal);
      const range = max - min;
      return 1 - (distanceFromOptimal / range) * 0.2;
    }
    return Math.max(0.6, 1 - Math.abs(humidity - optimal) * 0.02);
  }

  private calculateVariation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  private getScenarioMultiplier(scenario: string): number {
    switch (scenario) {
      case 'conservative': return 0.8;
      case 'aggressive': return 1.2;
      case 'optimal':
      default: return 1;
    }
  }

  private calculateConfidence(
    label: WineLabel,
    maturation: MaturationModel,
    storageFactor: number,
    scenario: string
  ): number {
    let confidence = label.agingPotential.confidence;

    confidence *= storageFactor;

    const dataAge = (Date.now() - maturation.lastUpdated) / 86400000;
    if (dataAge > 30) {
      confidence *= Math.max(0.7, 1 - (dataAge - 30) * 0.01);
    }

    if (scenario === 'conservative') {
      confidence = Math.min(0.95, confidence * 1.1);
    } else if (scenario === 'aggressive') {
      confidence *= 0.9;
    }

    return Math.max(0.5, Math.min(0.98, confidence));
  }

  private generateRecommendation(
    _currentAge: number,
    windowStart: number,
    windowEnd: number,
    peakDate: number,
    confidence: number
  ): string {
    const now = Date.now();
    const startYears = (windowStart - now) / 31536000000;
    const endYears = (windowEnd - now) / 3153600000;
    const peakYears = (peakDate - now) / 31536000000;

    const confidenceText = confidence >= 0.9 ? '高' : confidence >= 0.75 ? '中' : '低';

    if (now < windowStart) {
      if (startYears < 1) {
        return `即将进入适饮期，建议在 ${(startYears * 12).toFixed(0)} 个月后开始品鉴（置信度：${confidenceText}）`;
      }
      return `尚需陈年 ${startYears.toFixed(1)} 年，预计 ${new Date(windowStart).getFullYear()} 年进入适饮期（置信度：${confidenceText}）`;
    } else if (now >= windowStart && now <= peakDate) {
      const peakMonths = (peakYears * 12).toFixed(0);
      return `已进入适饮期，正在上升期，最佳饮用时间约在 ${peakMonths} 个月后（置信度：${confidenceText}）`;
    } else if (now > peakDate && now <= windowEnd) {
      const remainingMonths = (endYears * 12).toFixed(0);
      return `处于最佳适饮期！建议在 ${remainingMonths} 个月内饮用（置信度：${confidenceText}）`;
    } else {
      return `已过最佳适饮期，建议尽快饮用，酒质可能开始衰退（置信度：${confidenceText}）`;
    }
  }

  private generateFoodPairings(label: WineLabel): string[] {
    const allPairings: Record<string, string[]> = {
      'Cabernet Sauvignon': ['战斧牛排', '黑松露意面', '陈年帕尔马奶酪', '烤羊排'],
      'Merlot': ['烤牛肉', '蘑菇烩饭', '软质奶酪', '烤鸭'],
      'Pinot Noir': ['香煎鹅肝', '烤野鸡', '勃艮第红酒炖牛肉', '山羊奶酪'],
      'Syrah': ['烤羊腿', '黑胡椒牛排', '野味', '烟熏肉'],
      'Sangiovese': ['番茄意面', '帕尔马火腿', '意式烩饭', '烤蔬菜'],
      'Nebbiolo': ['松露', '炖牛肉', '陈年奶酪', '野味'],
      'Tempranillo': ['西班牙火腿', '烤羊肉', '曼彻格奶酪', '海鲜饭'],
      'Chardonnay': ['黄油龙虾', '烤鸡', '奶油意面', '布里奶酪'],
      'Sauvignon Blanc': ['生蚝', '山羊奶酪', '芦笋', '白灼虾'],
      'Riesling': ['寿司', '泰式咖喱', '烤猪肉', '蓝纹奶酪'],
    };

    const pairings: string[] = [];
    label.grapeVarieties.forEach(grape => {
      if (allPairings[grape]) {
        pairings.push(...allPairings[grape]);
      }
    });

    if (pairings.length === 0) {
      pairings.push('牛排', '奶酪', '蘑菇', '烤羊肉');
    }

    return [...new Set(pairings)].slice(0, 4);
  }

  private calculateDecantingTime(label: WineLabel, maturation: MaturationModel): number {
    const baseTime = 30;
    const vintageFactor = Math.max(0, (2020 - label.vintage) * 2);
    const tanninFactor = maturation.tanninLevel * 0.5;

    return Math.round(baseTime + vintageFactor + tanninFactor);
  }

  private calculateServingTemperature(label: WineLabel): number {
    const grapeTemps: Record<string, number> = {
      'Cabernet Sauvignon': 18,
      'Merlot': 17,
      'Pinot Noir': 16,
      'Syrah': 18,
      'Sangiovese': 17,
      'Nebbiolo': 18,
      'Tempranillo': 17,
      'Chardonnay': 12,
      'Sauvignon Blanc': 8,
      'Riesling': 10,
      'Viognier': 12,
    };

    const primaryGrape = label.grapeVarieties[0];
    return grapeTemps[primaryGrape] || 16;
  }

  async analyzeAgingPotential(
    label: WineLabel,
    maturation: MaturationModel,
    readings: SensorReading[],
    zone: CellarZone
  ): Promise<{
    potentialScore: number;
    expectedPeakValue: number;
    valueProgression: { year: number; estimatedValue: number }[];
    recommendations: string[];
  }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const storageFactor = this.calculateStorageConditionFactor(readings, zone);
        const currentAge = maturation.currentAge;
        const peakAge = (label.agingPotential.peakStart + label.agingPotential.peakEnd) / 2;

        let potentialScore: number;
        if (currentAge < label.agingPotential.peakStart) {
          const remainingYears = peakAge - currentAge;
          potentialScore = Math.min(100, 70 + remainingYears * 2 + storageFactor * 20);
        } else if (currentAge <= label.agingPotential.peakEnd) {
          potentialScore = 85 + storageFactor * 15;
        } else {
          const yearsPastPeak = currentAge - label.agingPotential.peakEnd;
          potentialScore = Math.max(40, 80 - yearsPastPeak * 5);
        }

        const baseValue = label.classification.includes('Grand Cru') ? 5000 :
                          label.classification.includes('Premier') ? 3000 : 1500;
        const expectedPeakValue = baseValue * (1 + label.agingPotential.confidence * 0.5);

        const valueProgression: { year: number; estimatedValue: number }[] = [];

        for (let year = label.vintage; year <= label.vintage + label.agingPotential.maxYears + 5; year += 2) {
          const age = year - label.vintage;
          let valueMultiplier: number;

          if (age < label.agingPotential.minYears) {
            valueMultiplier = 0.6 + (age / label.agingPotential.minYears) * 0.4;
          } else if (age <= label.agingPotential.peakEnd) {
            const distanceFromPeak = Math.abs(age - peakAge);
            const peakWidth = (label.agingPotential.peakEnd - label.agingPotential.peakStart) / 2;
            valueMultiplier = 1 + (1 - distanceFromPeak / peakWidth) * 0.5;
          } else {
            const yearsPastPeak = age - label.agingPotential.peakEnd;
            valueMultiplier = Math.max(0.7, 1.5 - yearsPastPeak * 0.05);
          }

          valueMultiplier *= storageFactor;

          valueProgression.push({
            year,
            estimatedValue: Math.round(baseValue * valueMultiplier),
          });
        }

        const recommendations: string[] = [];

        if (storageFactor < 0.8) {
          recommendations.push('改善储存条件可显著提升陈年价值');
        }

        if (currentAge < label.agingPotential.peakStart - 2) {
          recommendations.push('建议继续陈年，预期价值仍有较大上升空间');
        } else if (currentAge >= label.agingPotential.peakStart - 2 && currentAge <= label.agingPotential.peakEnd) {
          recommendations.push('处于价值高峰期，可考虑品鉴或继续持有');
        } else {
          recommendations.push('已过价值峰值，建议适时品鉴或出售');
        }

        if (label.agingPotential.confidence < 0.8) {
          recommendations.push('陈年预测置信度中等，建议定期跟踪酒质变化');
        }

        resolve({
          potentialScore,
          expectedPeakValue,
          valueProgression,
          recommendations,
        });
      }, 150);
    });
  }

  getAgingCurveData(
    label: WineLabel,
    storageFactor: number = 1
  ): { age: number; quality: number }[] {
    const curve = this.generateAgingCurve(label, this.AGING_RATE_BASE * storageFactor);
    return curve.map(p => ({ age: p.age, quality: p.qualityScore }));
  }
}

export const drinkingWindowPredictor = new AsyncDrinkingWindowPredictor();
