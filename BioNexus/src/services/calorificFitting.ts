import { BiomassComposition, FeedingOptimization, CombustionParams } from '../types';

export interface FactorWeights {
  moisture: number;
  composition: number;
  spectral: number;
  historical: number;
}

export interface FittingResult {
  predictedCalorificValue: number;
  confidenceInterval: [number, number];
  rSquared: number;
  factors: FactorWeights;
}

export class AsyncMultiFactorCalorificFitting {
  private historicalData: BiomassComposition[] = [];
  private weights: FactorWeights = {
    moisture: 0.25,
    composition: 0.3,
    spectral: 0.3,
    historical: 0.15
  };
  private learningRate = 0.01;

  public async fitAsync(
    composition: BiomassComposition,
    signal?: AbortSignal
  ): Promise<FittingResult> {
    await this.delay(100, signal);

    const moistureFactor = this.calculateMoistureFactor(composition.moisture);
    await this.delay(50, signal);

    const compositionFactor = this.calculateCompositionFactor(composition);
    await this.delay(50, signal);

    const spectralFactor = this.calculateSpectralFactor(composition.spectralData);
    await this.delay(50, signal);

    const historicalFactor = this.calculateHistoricalFactor(composition.source);
    await this.delay(50, signal);

    const predictedCV = this.combineFactors(
      moistureFactor,
      compositionFactor,
      spectralFactor,
      historicalFactor
    );

    const rSquared = this.calculateRSquared(predictedCV, composition.calorificValue);

    this.updateWeights(composition.calorificValue, predictedCV);
    this.addHistoricalData(composition);

    return {
      predictedCalorificValue: predictedCV,
      confidenceInterval: [predictedCV - 0.5, predictedCV + 0.5],
      rSquared,
      factors: { ...this.weights }
    };
  }

  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Fitting aborted'));
      });
    });
  }

  private calculateMoistureFactor(moisture: number): number {
    const optimalMoisture = 15;
    const deviation = Math.abs(moisture - optimalMoisture) / optimalMoisture;
    return Math.max(0, 1 - deviation * 1.2);
  }

  private calculateCompositionFactor(composition: BiomassComposition): number {
    const idealComposition = {
      carbon: 50,
      hydrogen: 6,
      oxygen: 40,
      ash: 4
    };

    let score = 0;
    score += (1 - Math.abs(composition.carbon - idealComposition.carbon) / 100) * 0.4;
    score += (1 - Math.abs(composition.hydrogen - idealComposition.hydrogen) / 20) * 0.2;
    score += (1 - Math.abs(composition.oxygen - idealComposition.oxygen) / 100) * 0.2;
    score += (1 - Math.abs(composition.ash - idealComposition.ash) / 20) * 0.2;

    return Math.max(0, score);
  }

  private calculateSpectralFactor(spectralData: number[]): number {
    const mean = spectralData.reduce((a, b) => a + b, 0) / spectralData.length;
    const variance = spectralData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / spectralData.length;
    const stdDev = Math.sqrt(variance);
    
    return Math.max(0, 1 - stdDev * 2);
  }

  private calculateHistoricalFactor(source: string): number {
    const sourceData = this.historicalData.filter(d => d.source === source);
    if (sourceData.length < 3) return 0.5;

    const cvValues = sourceData.map(d => d.calorificValue);
    const meanCV = cvValues.reduce((a, b) => a + b, 0) / cvValues.length;
    const variance = cvValues.reduce((a, b) => a + Math.pow(b - meanCV, 2), 0) / cvValues.length;
    
    return Math.max(0, 1 - Math.sqrt(variance) / 5);
  }

  private combineFactors(
    moistureFactor: number,
    compositionFactor: number,
    spectralFactor: number,
    historicalFactor: number
  ): number {
    const baseCV = 18.5;
    const weightedScore = 
      moistureFactor * this.weights.moisture +
      compositionFactor * this.weights.composition +
      spectralFactor * this.weights.spectral +
      historicalFactor * this.weights.historical;

    return baseCV + (weightedScore - 0.5) * 8;
  }

  private calculateRSquared(predicted: number, actual: number): number {
    const residual = actual - predicted;
    const totalVariance = 25;
    return Math.max(0, 1 - Math.pow(residual, 2) / totalVariance);
  }

  private updateWeights(actual: number, predicted: number): void {
    const error = actual - predicted;
    const adjustment = error * this.learningRate;

    this.weights.moisture = Math.max(0.1, Math.min(0.4, this.weights.moisture + adjustment * 0.1));
    this.weights.composition = Math.max(0.15, Math.min(0.45, this.weights.composition + adjustment * 0.15));
    this.weights.spectral = Math.max(0.15, Math.min(0.45, this.weights.spectral + adjustment * 0.15));
    this.weights.historical = Math.max(0.05, Math.min(0.25, this.weights.historical + adjustment * 0.1));

    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    Object.keys(this.weights).forEach(key => {
      this.weights[key as keyof FactorWeights] /= total;
    });
  }

  private addHistoricalData(data: BiomassComposition): void {
    this.historicalData.push(data);
    if (this.historicalData.length > 1000) {
      this.historicalData = this.historicalData.slice(-500);
    }
  }

  public optimizeFeedingFrequency(
    currentCV: number,
    combustionParams: CombustionParams,
    targetEfficiency: number = 0.92
  ): FeedingOptimization {
    const baseFrequency = 60;
    const cvDeviation = (currentCV - 18.5) / 18.5;
    const loadFactor = combustionParams.boilerLoad / 100;
    const efficiencyGap = targetEfficiency - (combustionParams.efficiency / 100);

    let optimalFrequency = baseFrequency * (1 - cvDeviation * 0.3);
    optimalFrequency *= (0.8 + loadFactor * 0.4);
    optimalFrequency += efficiencyGap * 20;

    optimalFrequency = Math.max(30, Math.min(120, optimalFrequency));

    return {
      optimalFrequency: Math.round(optimalFrequency),
      currentFrequency: baseFrequency,
      predictedCalorificValue: currentCV,
      efficiencyGain: Math.max(0, efficiencyGap * 100),
      factors: {
        moisture: this.weights.moisture,
        composition: this.weights.composition,
        boilerLoad: loadFactor,
        historical: this.weights.historical
      }
    };
  }

  public getCurrentWeights(): FactorWeights {
    return { ...this.weights };
  }

  public getHistoricalStats(source?: string) {
    const data = source 
      ? this.historicalData.filter(d => d.source === source)
      : this.historicalData;

    if (data.length === 0) {
      return { count: 0, avgCV: 0, minCV: 0, maxCV: 0 };
    }

    const cvValues = data.map(d => d.calorificValue);
    
    return {
      count: data.length,
      avgCV: cvValues.reduce((a, b) => a + b, 0) / cvValues.length,
      minCV: Math.min(...cvValues),
      maxCV: Math.max(...cvValues)
    };
  }
}

export const calorificFitting = new AsyncMultiFactorCalorificFitting();
