import { SoilSample } from '@/types';

export interface CropRequirements {
  cropType: string;
  growthStage: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  nitrogenUptakeEfficiency: number;
  phosphorusUptakeEfficiency: number;
  potassiumUptakeEfficiency: number;
  rootDepth: number;
}

export interface FertilizerRecommendation {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicFertilizer: number;
  micronutrients: Record<string, number>;
  applicationMethod: string;
  applicationTiming: string;
  estimatedCost: number;
  environmentalRisk: {
    nitrogenLossRisk: 'low' | 'medium' | 'high';
    phosphorusLossRisk: 'low' | 'medium' | 'high';
    leachingRisk: 'low' | 'medium' | 'high';
  };
}

export interface OptimizationConstraints {
  maxNitrogenRate: number;
  maxPhosphorusRate: number;
  maxPotassiumRate: number;
  budgetLimit: number;
  organicFertilizerRatio: number;
  environmentalTarget: 'conservative' | 'balanced' | 'yield_optimized';
}

class FertilizationOptimizer {
  private static CROP_REQUIREMENTS: Record<string, CropRequirements[]> = {
    wheat: [
      { cropType: 'wheat', growthStage: 'seedling', nitrogen: 30, phosphorus: 20, potassium: 20, nitrogenUptakeEfficiency: 0.5, phosphorusUptakeEfficiency: 0.3, potassiumUptakeEfficiency: 0.6, rootDepth: 30 },
      { cropType: 'wheat', growthStage: 'tillering', nitrogen: 60, phosphorus: 30, potassium: 30, nitrogenUptakeEfficiency: 0.6, phosphorusUptakeEfficiency: 0.4, potassiumUptakeEfficiency: 0.7, rootDepth: 60 },
      { cropType: 'wheat', growthStage: 'heading', nitrogen: 80, phosphorus: 40, potassium: 40, nitrogenUptakeEfficiency: 0.7, phosphorusUptakeEfficiency: 0.5, potassiumUptakeEfficiency: 0.8, rootDepth: 90 },
      { cropType: 'wheat', growthStage: 'maturity', nitrogen: 40, phosphorus: 50, potassium: 50, nitrogenUptakeEfficiency: 0.5, phosphorusUptakeEfficiency: 0.6, potassiumUptakeEfficiency: 0.7, rootDepth: 100 },
    ],
    corn: [
      { cropType: 'corn', growthStage: 'seedling', nitrogen: 40, phosphorus: 25, potassium: 25, nitrogenUptakeEfficiency: 0.55, phosphorusUptakeEfficiency: 0.35, potassiumUptakeEfficiency: 0.65, rootDepth: 35 },
      { cropType: 'corn', growthStage: 'vegetative', nitrogen: 100, phosphorus: 40, potassium: 50, nitrogenUptakeEfficiency: 0.65, phosphorusUptakeEfficiency: 0.45, potassiumUptakeEfficiency: 0.75, rootDepth: 70 },
      { cropType: 'corn', growthStage: 'tasseling', nitrogen: 120, phosphorus: 50, potassium: 60, nitrogenUptakeEfficiency: 0.75, phosphorusUptakeEfficiency: 0.55, potassiumUptakeEfficiency: 0.85, rootDepth: 100 },
      { cropType: 'corn', growthStage: 'grain_filling', nitrogen: 80, phosphorus: 60, potassium: 70, nitrogenUptakeEfficiency: 0.6, phosphorusUptakeEfficiency: 0.65, potassiumUptakeEfficiency: 0.8, rootDepth: 120 },
    ],
    rice: [
      { cropType: 'rice', growthStage: 'transplanting', nitrogen: 50, phosphorus: 30, potassium: 30, nitrogenUptakeEfficiency: 0.5, phosphorusUptakeEfficiency: 0.35, potassiumUptakeEfficiency: 0.6, rootDepth: 25 },
      { cropType: 'rice', growthStage: 'tillering', nitrogen: 90, phosphorus: 40, potassium: 45, nitrogenUptakeEfficiency: 0.6, phosphorusUptakeEfficiency: 0.45, potassiumUptakeEfficiency: 0.7, rootDepth: 50 },
      { cropType: 'rice', growthStage: 'panicle_initiation', nitrogen: 110, phosphorus: 50, potassium: 60, nitrogenUptakeEfficiency: 0.7, phosphorusUptakeEfficiency: 0.55, potassiumUptakeEfficiency: 0.8, rootDepth: 75 },
      { cropType: 'rice', growthStage: 'flowering', nitrogen: 70, phosphorus: 60, potassium: 70, nitrogenUptakeEfficiency: 0.55, phosphorusUptakeEfficiency: 0.65, potassiumUptakeEfficiency: 0.75, rootDepth: 90 },
    ],
  };

  private static FERTILIZER_PRICES = {
    nitrogen: 2.5,
    phosphorus: 3.2,
    potassium: 2.8,
    organic: 1.5,
  };

  static getCropRequirements(cropType: string, growthStage: string): CropRequirements | null {
    const requirements = this.CROP_REQUIREMENTS[cropType];
    if (!requirements) return null;
    return requirements.find(r => r.growthStage === growthStage) || requirements[0];
  }

  static calculateSoilNutrientAvailability(soilSample: SoilSample): {
    availableNitrogen: number;
    availablePhosphorus: number;
    availablePotassium: number;
  } {
    const { pH, organicMatter, cationExchangeCapacity, moisture } = soilSample;
    
    const phFactor = pH >= 6 && pH <= 7.5 ? 1.0 : pH < 6 ? 0.7 + (pH / 6) * 0.3 : 0.8;
    const omFactor = Math.min(organicMatter / 30, 1.5);
    const cecFactor = Math.min(cationExchangeCapacity / 20, 1.2);
    const moistureFactor = Math.min(moisture / 0.3, 1.0);

    const availabilityFactor = phFactor * omFactor * cecFactor * moistureFactor * 0.6;

    return {
      availableNitrogen: soilSample.totalNitrogen * availabilityFactor * 0.8,
      availablePhosphorus: soilSample.availablePhosphorus * availabilityFactor,
      availablePotassium: soilSample.availablePotassium * availabilityFactor,
    };
  }

  static calculateNutrientDeficit(
    cropRequirements: CropRequirements,
    soilAvailability: ReturnType<typeof this.calculateSoilNutrientAvailability>
  ): {
    nitrogenDeficit: number;
    phosphorusDeficit: number;
    potassiumDeficit: number;
  } {
    return {
      nitrogenDeficit: Math.max(0, cropRequirements.nitrogen - soilAvailability.availableNitrogen),
      phosphorusDeficit: Math.max(0, cropRequirements.phosphorus - soilAvailability.availablePhosphorus),
      potassiumDeficit: Math.max(0, cropRequirements.potassium - soilAvailability.availablePotassium),
    };
  }

  static optimizeFertilizerRate(
    deficit: number,
    uptakeEfficiency: number,
    maxRate: number,
    environmentalFactor: number
  ): number {
    const baseRate = deficit / uptakeEfficiency;
    const optimizedRate = baseRate * environmentalFactor;
    return Math.min(optimizedRate, maxRate);
  }

  static calculateEnvironmentalRisk(
    nitrogenRate: number,
    phosphorusRate: number,
    soilSample: SoilSample,
    rainfallIntensity: number = 50
  ): FertilizerRecommendation['environmentalRisk'] {
    const nLossIndex = (nitrogenRate / 200) * (rainfallIntensity / 100) * (soilSample.moisture / 0.4);
    const pLossIndex = (phosphorusRate / 100) * (rainfallIntensity / 100) * (soilSample.organicMatter / 50);
    const leachingIndex = nLossIndex * (soilSample.bulkDensity / 1.5);

    const getRiskLevel = (index: number): 'low' | 'medium' | 'high' => {
      if (index < 0.3) return 'low';
      if (index < 0.7) return 'medium';
      return 'high';
    };

    return {
      nitrogenLossRisk: getRiskLevel(nLossIndex),
      phosphorusLossRisk: getRiskLevel(pLossIndex),
      leachingRisk: getRiskLevel(leachingIndex),
    };
  }

  static generateRecommendation(
    soilSample: SoilSample,
    cropType: string,
    growthStage: string,
    constraints: Partial<OptimizationConstraints> = {},
    area: number = 1
  ): FertilizerRecommendation {
    const defaultConstraints: OptimizationConstraints = {
      maxNitrogenRate: 200,
      maxPhosphorusRate: 100,
      maxPotassiumRate: 150,
      budgetLimit: Infinity,
      organicFertilizerRatio: 0.3,
      environmentalTarget: 'balanced',
    };

    const mergedConstraints = { ...defaultConstraints, ...constraints };

    const cropRequirements = this.getCropRequirements(cropType, growthStage);
    if (!cropRequirements) {
      throw new Error(`No requirements found for crop: ${cropType}, stage: ${growthStage}`);
    }

    const soilAvailability = this.calculateSoilNutrientAvailability(soilSample);
    const deficit = this.calculateNutrientDeficit(cropRequirements, soilAvailability);

    const environmentalFactors = {
      conservative: 0.7,
      balanced: 0.9,
      yield_optimized: 1.1,
    };
    const envFactor = environmentalFactors[mergedConstraints.environmentalTarget];

    let nitrogenRate = this.optimizeFertilizerRate(
      deficit.nitrogenDeficit,
      cropRequirements.nitrogenUptakeEfficiency,
      mergedConstraints.maxNitrogenRate,
      envFactor
    );

    let phosphorusRate = this.optimizeFertilizerRate(
      deficit.phosphorusDeficit,
      cropRequirements.phosphorusUptakeEfficiency,
      mergedConstraints.maxPhosphorusRate,
      envFactor
    );

    let potassiumRate = this.optimizeFertilizerRate(
      deficit.potassiumDeficit,
      cropRequirements.potassiumUptakeEfficiency,
      mergedConstraints.maxPotassiumRate,
      envFactor
    );

    const organicNitrogen = nitrogenRate * mergedConstraints.organicFertilizerRatio;
    const organicPhosphorus = phosphorusRate * mergedConstraints.organicFertilizerRatio;
    const organicPotassium = potassiumRate * mergedConstraints.organicFertilizerRatio * 0.5;

    nitrogenRate -= organicNitrogen;
    phosphorusRate -= organicPhosphorus;
    potassiumRate -= organicPotassium;

    nitrogenRate = Math.max(0, nitrogenRate) * area;
    phosphorusRate = Math.max(0, phosphorusRate) * area;
    potassiumRate = Math.max(0, potassiumRate) * area;
    const organicFertilizer = (organicNitrogen + organicPhosphorus + organicPotassium) * area * 10;

    const micronutrients: Record<string, number> = {};
    if (soilSample.pH > 7.5) {
      micronutrients.iron = 5 * area;
      micronutrients.zinc = 3 * area;
    }
    if (soilSample.organicMatter < 20) {
      micronutrients.manganese = 2 * area;
    }

    const estimatedCost = 
      nitrogenRate * this.FERTILIZER_PRICES.nitrogen +
      phosphorusRate * this.FERTILIZER_PRICES.phosphorus +
      potassiumRate * this.FERTILIZER_PRICES.potassium +
      organicFertilizer * this.FERTILIZER_PRICES.organic;

    const environmentalRisk = this.calculateEnvironmentalRisk(
      nitrogenRate,
      phosphorusRate,
      soilSample
    );

    const applicationMethods = {
      seedling: 'side_band',
      tillering: 'top_dressing',
      vegetative: 'split_application',
      heading: 'foliar_spray',
      flowering: 'fertigation',
      maturity: 'broadcast',
      panicle_initiation: 'deep_placement',
      grain_filling: 'top_dressing',
      transplanting: 'basal_application',
    };

    return {
      nitrogen: Math.round(nitrogenRate * 10) / 10,
      phosphorus: Math.round(phosphorusRate * 10) / 10,
      potassium: Math.round(potassiumRate * 10) / 10,
      organicFertilizer: Math.round(organicFertilizer * 10) / 10,
      micronutrients,
      applicationMethod: applicationMethods[growthStage as keyof typeof applicationMethods] || 'broadcast',
      applicationTiming: `${growthStage} stage - apply within 3-5 days`,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      environmentalRisk,
    };
  }

  static calculateYieldResponse(
    nitrogenRate: number,
    phosphorusRate: number,
    potassiumRate: number,
    cropType: string
  ): number {
    const yieldFactors: Record<string, { n: number; p: number; k: number; max: number }> = {
      wheat: { n: 25, p: 40, k: 30, max: 8000 },
      corn: { n: 30, p: 50, k: 35, max: 12000 },
      rice: { n: 22, p: 35, k: 28, max: 9000 },
    };

    const factors = yieldFactors[cropType] || yieldFactors.wheat;
    
    const nResponse = factors.n * (1 - Math.exp(-nitrogenRate / 100));
    const pResponse = factors.p * (1 - Math.exp(-phosphorusRate / 50));
    const kResponse = factors.k * (1 - Math.exp(-potassiumRate / 80));
    
    const theoreticalYield = nResponse + pResponse + kResponse;
    return Math.min(theoreticalYield, factors.max);
  }

  static optimizeForMultipleFields(
    soilSamples: SoilSample[],
    cropTypes: string[],
    growthStages: string[],
    totalBudget: number
  ): FertilizerRecommendation[] {
    const recommendations: FertilizerRecommendation[] = [];
    const marginalReturns: { index: number; returnPerCost: number }[] = [];

    for (let i = 0; i < soilSamples.length; i++) {
      const recommendation = this.generateRecommendation(
        soilSamples[i],
        cropTypes[i],
        growthStages[i]
      );
      recommendations.push(recommendation);

      const yieldResponse = this.calculateYieldResponse(
        recommendation.nitrogen,
        recommendation.phosphorus,
        recommendation.potassium,
        cropTypes[i]
      );
      const returnPerCost = yieldResponse / recommendation.estimatedCost;
      marginalReturns.push({ index: i, returnPerCost });
    }

    marginalReturns.sort((a, b) => b.returnPerCost - a.returnPerCost);

    let remainingBudget = totalBudget;
    const finalRecommendations: FertilizerRecommendation[] = [...recommendations];

    for (const { index } of marginalReturns) {
      const rec = finalRecommendations[index];
      if (remainingBudget >= rec.estimatedCost) {
        remainingBudget -= rec.estimatedCost;
      } else {
        const budgetRatio = remainingBudget / rec.estimatedCost;
        finalRecommendations[index] = {
          ...rec,
          nitrogen: rec.nitrogen * budgetRatio,
          phosphorus: rec.phosphorus * budgetRatio,
          potassium: rec.potassium * budgetRatio,
          organicFertilizer: rec.organicFertilizer * budgetRatio,
          estimatedCost: remainingBudget,
        };
        remainingBudget = 0;
      }
    }

    return finalRecommendations;
  }

  static calculateNutrientUseEfficiency(
    appliedNitrogen: number,
    appliedPhosphorus: number,
    appliedPotassium: number,
    cropUptake: { nitrogen: number; phosphorus: number; potassium: number }
  ): {
    nitrogenEfficiency: number;
    phosphorusEfficiency: number;
    potassiumEfficiency: number;
    overallEfficiency: number;
  } {
    const nitrogenEfficiency = appliedNitrogen > 0 ? (cropUptake.nitrogen / appliedNitrogen) * 100 : 0;
    const phosphorusEfficiency = appliedPhosphorus > 0 ? (cropUptake.phosphorus / appliedPhosphorus) * 100 : 0;
    const potassiumEfficiency = appliedPotassium > 0 ? (cropUptake.potassium / appliedPotassium) * 100 : 0;
    const overallEfficiency = (nitrogenEfficiency + phosphorusEfficiency + potassiumEfficiency) / 3;

    return {
      nitrogenEfficiency: Math.round(nitrogenEfficiency * 10) / 10,
      phosphorusEfficiency: Math.round(phosphorusEfficiency * 10) / 10,
      potassiumEfficiency: Math.round(potassiumEfficiency * 10) / 10,
      overallEfficiency: Math.round(overallEfficiency * 10) / 10,
    };
  }
}

export default FertilizationOptimizer;
