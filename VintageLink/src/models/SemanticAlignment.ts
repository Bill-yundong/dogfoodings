import type {
  SensorReading,
  CellarZone,
  WineBottle,
  WineLabel,
  MaturationModel,
  SemanticMapping,
} from '@/types';
import { semanticMappings } from '@/data/mockData';

export class SemanticAlignmentEngine {
  private mappings: SemanticMapping[] = semanticMappings;

  getMappings(): SemanticMapping[] {
    return this.mappings;
  }

  calculateMaturationImpact(
    readings: SensorReading[],
    zone: CellarZone
  ): { impactScore: number; factors: { metric: string; impact: number; description: string }[] } {
    const factors: { metric: string; impact: number; description: string }[] = [];
    let totalImpact = 0;

    if (readings.length === 0) {
      return { impactScore: 0, factors };
    }

    const avgTemp = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length;
    const tempVariation = this.calculateVariation(readings.map(r => r.temperature));
    const avgHumidity = readings.reduce((sum, r) => sum + r.humidity, 0) / readings.length;
    const avgLight = readings.reduce((sum, r) => sum + (r.lightIntensity || 0), 0) / readings.length;
    const avgVibration = readings.reduce((sum, r) => sum + (r.vibration || 0), 0) / readings.length;

    const tempImpact = this.calculateTemperatureImpact(avgTemp, zone);
    factors.push({
      metric: 'temperature',
      impact: tempImpact,
      description: `平均温度 ${avgTemp.toFixed(1)}°C，目标 ${zone.targetTemperature.optimal}°C`,
    });
    totalImpact += tempImpact * this.getImpactFactor('temperature');

    const tempVarImpact = this.calculateTemperatureVariationImpact(tempVariation);
    factors.push({
      metric: 'temperatureVariation',
      impact: tempVarImpact,
      description: `温度波动 ±${tempVariation.toFixed(2)}°C`,
    });
    totalImpact += tempVarImpact * this.getImpactFactor('temperatureVariation');

    const humidityImpact = this.calculateHumidityImpact(avgHumidity, zone);
    factors.push({
      metric: 'humidity',
      impact: humidityImpact,
      description: `平均湿度 ${avgHumidity.toFixed(0)}%，目标 ${zone.targetHumidity.optimal}%`,
    });
    totalImpact += humidityImpact * this.getImpactFactor('humidity');

    const lightImpact = this.calculateLightImpact(avgLight);
    factors.push({
      metric: 'lightIntensity',
      impact: lightImpact,
      description: `平均光照 ${avgLight.toFixed(1)} lux`,
    });
    totalImpact += lightImpact * this.getImpactFactor('lightIntensity');

    const vibrationImpact = this.calculateVibrationImpact(avgVibration);
    factors.push({
      metric: 'vibration',
      impact: vibrationImpact,
      description: `平均振动 ${avgVibration.toFixed(3)} g`,
    });
    totalImpact += vibrationImpact * this.getImpactFactor('vibration');

    const totalFactorWeight = this.mappings.reduce((sum, m) => sum + m.impactFactor, 0);
    const impactScore = Math.max(0, Math.min(100, (totalImpact / totalFactorWeight) * 100));

    return { impactScore, factors };
  }

  private calculateTemperatureImpact(avgTemp: number, zone: CellarZone): number {
    const { min, max, optimal } = zone.targetTemperature;
    if (avgTemp >= min && avgTemp <= max) {
      const distanceFromOptimal = Math.abs(avgTemp - optimal);
      const range = max - min;
      return 100 - (distanceFromOptimal / range) * 30;
    } else if (avgTemp < min) {
      return Math.max(50, 100 - (min - avgTemp) * 10);
    } else {
      return Math.max(50, 100 - (avgTemp - max) * 8);
    }
  }

  private calculateTemperatureVariationImpact(variation: number): number {
    if (variation <= 1) return 100;
    if (variation <= 2) return 85;
    if (variation <= 3) return 60;
    return Math.max(30, 100 - (variation - 2) * 20);
  }

  private calculateHumidityImpact(avgHumidity: number, zone: CellarZone): number {
    const { min, max, optimal } = zone.targetHumidity;
    if (avgHumidity >= min && avgHumidity <= max) {
      const distanceFromOptimal = Math.abs(avgHumidity - optimal);
      const range = max - min;
      return 100 - (distanceFromOptimal / range) * 20;
    } else if (avgHumidity < min) {
      return Math.max(40, 100 - (min - avgHumidity) * 3);
    } else {
      return Math.max(60, 100 - (avgHumidity - max) * 1.5);
    }
  }

  private calculateLightImpact(avgLight: number): number {
    if (avgLight <= 20) return 100;
    if (avgLight <= 50) return 90;
    if (avgLight <= 100) return 70;
    return Math.max(40, 100 - avgLight * 0.5);
  }

  private calculateVibrationImpact(avgVibration: number): number {
    if (avgVibration <= 0.1) return 100;
    if (avgVibration <= 0.3) return 85;
    if (avgVibration <= 0.5) return 70;
    return Math.max(50, 100 - avgVibration * 50);
  }

  private calculateVariation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  private getImpactFactor(metric: string): number {
    return this.mappings.find(m => m.sensorMetric === metric)?.impactFactor || 1;
  }

  alignSensorToWineProperty(
    sensorMetric: string,
    value: number,
    wineProperty: string
  ): { alignedValue: number; semanticDescription: string; correlation: number } {
    const mapping = this.mappings.find(
      m => m.sensorMetric === sensorMetric && m.wineProperty === wineProperty
    );

    if (!mapping) {
      return { alignedValue: value, semanticDescription: '未知映射', correlation: 0 };
    }

    let alignedValue: number;
    let semanticDescription: string;

    switch (sensorMetric) {
      case 'temperature':
        alignedValue = this.mapTemperatureToMaturationRate(value);
        semanticDescription = `当前温度下，熟化速度${alignedValue > 1 ? '加快' : '减慢'}约${Math.abs((alignedValue - 1) * 100).toFixed(0)}%`;
        break;
      case 'humidity':
        alignedValue = this.mapHumidityToCorkIntegrity(value);
        semanticDescription = `当前湿度下，软木塞完整性评分 ${alignedValue.toFixed(1)}/100`;
        break;
      default:
        alignedValue = value;
        semanticDescription = mapping.description;
    }

    return {
      alignedValue,
      semanticDescription,
      correlation: mapping.correlation,
    };
  }

  private mapTemperatureToMaturationRate(temp: number): number {
    const baseTemp = 13;
    const rate = Math.pow(1.1, temp - baseTemp);
    return Math.max(0.5, Math.min(2.5, rate));
  }

  private mapHumidityToCorkIntegrity(humidity: number): number {
    if (humidity >= 65 && humidity <= 75) return 95;
    if (humidity >= 60 && humidity <= 80) return 85;
    if (humidity >= 50 && humidity <= 85) return 70;
    return Math.max(40, 100 - Math.abs(humidity - 70) * 1.5);
  }

  generateMaturationAdjustment(
    baseMaturation: MaturationModel,
    impactScore: number,
    _storageDuration: number
  ): MaturationModel {
    const adjustmentFactor = impactScore / 100;

    return {
      ...baseMaturation,
      maturityScore: Math.max(0, Math.min(100, baseMaturation.maturityScore * adjustmentFactor)),
      tanninLevel: Math.max(0, Math.min(100, baseMaturation.tanninLevel * (0.8 + adjustmentFactor * 0.2))),
      acidityLevel: Math.max(0, Math.min(100, baseMaturation.acidityLevel * (0.9 + adjustmentFactor * 0.1))),
      fruitLevel: Math.max(0, Math.min(100, baseMaturation.fruitLevel * (0.85 + adjustmentFactor * 0.15))),
      complexityLevel: Math.max(0, Math.min(100, baseMaturation.complexityLevel * (0.7 + adjustmentFactor * 0.3))),
      predictedDevelopment: baseMaturation.predictedDevelopment.map(pred => ({
        ...pred,
        predictedScore: Math.max(0, Math.min(100, pred.predictedScore * adjustmentFactor)),
        confidence: pred.confidence * (0.7 + adjustmentFactor * 0.3),
      })),
      lastUpdated: Date.now(),
    };
  }

  getSemanticInsights(
    readings: SensorReading[],
    zone: CellarZone,
    wines: { bottle: WineBottle; label: WineLabel }[]
  ): {
    overallHealth: number;
    keyInsights: string[];
    recommendations: string[];
    zoneOptimization: string;
  } {
    const { impactScore, factors } = this.calculateMaturationImpact(readings, zone);

    const keyInsights: string[] = [];
    const recommendations: string[] = [];

    factors.forEach(factor => {
      if (factor.impact < 70) {
        const mapping = this.mappings.find(m => m.sensorMetric === factor.metric);
        if (mapping) {
          keyInsights.push(`${factor.metric}指标异常：${factor.description}，影响评分 ${factor.impact.toFixed(1)}`);
          recommendations.push(`建议调整${factor.metric}：${mapping.description}`);
        }
      }
    });

    const atRiskWines = wines.filter(w => {
      const peakYear = w.label.agingPotential.peakStart;
      const currentYear = new Date().getFullYear();
      return currentYear >= peakYear - 2 && currentYear <= peakYear + 2;
    });

    if (atRiskWines.length > 0) {
      keyInsights.push(`发现 ${atRiskWines.length} 瓶葡萄酒正处于适饮窗口期`);
    }

    let zoneOptimization: string;
    if (impactScore >= 90) {
      zoneOptimization = '储存条件极佳，非常适合长期陈年';
    } else if (impactScore >= 75) {
      zoneOptimization = '储存条件良好，小幅优化可提升陈年效果';
    } else if (impactScore >= 60) {
      zoneOptimization = '储存条件一般，建议检查温控和湿度系统';
    } else {
      zoneOptimization = '储存条件较差，需要立即调整以避免酒质受损';
    }

    return {
      overallHealth: impactScore,
      keyInsights,
      recommendations,
      zoneOptimization,
    };
  }
}

export const semanticEngine = new SemanticAlignmentEngine();
