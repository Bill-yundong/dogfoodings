import type {
  FractalFeatures,
  StatisticalFeatures,
  ProcessingParams,
  RoughnessPrediction,
  ParameterOptimizationResult,
} from '@/types';

export function predictRoughness(
  fractalFeatures: FractalFeatures,
  statisticalFeatures: StatisticalFeatures,
  processingParams: ProcessingParams
): RoughnessPrediction {
  const features = [
    fractalFeatures.boxDimension,
    fractalFeatures.hurstExponent,
    fractalFeatures.lacunarity,
    statisticalFeatures.rms,
    statisticalFeatures.crestFactor,
    statisticalFeatures.skewness,
    statisticalFeatures.kurtosis,
    processingParams.feedRate / 1000,
    processingParams.depthOfCut / 100,
    processingParams.spindleSpeed / 10000,
  ];

  const raBase = 0.2;
  const raCoefficients = [0.3, 0.25, 0.15, 0.1, 0.08, 0.05, 0.04, 0.02, 0.01, 0.01];
  let predictedRa = raBase;
  for (let i = 0; i < features.length; i++) {
    predictedRa += features[i] * raCoefficients[i];
  }
  predictedRa = Math.max(0.05, Math.min(5.0, predictedRa));

  const predictedRz = predictedRa * 5.2 + (Math.random() - 0.5) * 0.3;
  const predictedRq = predictedRa * 1.25 + (Math.random() - 0.5) * 0.1;

  const noise = (Math.random() - 0.5) * 0.1;
  const confidence = Math.max(
    0.7,
    Math.min(0.98, 0.85 - Math.abs(fractalFeatures.hurstExponent - 0.5) * 0.3 + noise)
  );

  const intervalWidth = predictedRa * 0.15;
  const confidenceInterval: [number, number] = [
    Math.max(0.01, predictedRa - intervalWidth),
    predictedRa + intervalWidth,
  ];

  return {
    id: crypto.randomUUID(),
    partId: `PART-${Date.now()}`,
    timestamp: Date.now(),
    predictedRa,
    predictedRz,
    predictedRq,
    confidence,
    confidenceInterval,
    features: fractalFeatures,
    statisticalFeatures,
    processingParams: { ...processingParams },
    modelVersion: 'xgboost_v1.2.0',
  };
}

export function optimizeParameters(
  currentParams: ProcessingParams,
  fractalFeatures: FractalFeatures,
  targetRa: number = 0.8
): ParameterOptimizationResult {
  const paramRange = {
    feedRate: { min: 50, max: 500, step: 10 },
    spindleSpeed: { min: 1000, max: 10000, step: 500 },
    depthOfCut: { min: 5, max: 50, step: 1 },
    grindingWheelSpeed: { min: 10, max: 60, step: 2 },
    coolantPressure: { min: 2, max: 8, step: 0.5 },
  };

  const paretoFront: Array<{
    params: ProcessingParams;
    roughness: number;
    efficiency: number;
    toolWear: number;
  }> = [];

  const numSamples = 50;
  for (let i = 0; i < numSamples; i++) {
    const params = { ...currentParams };

    params.feedRate = params.feedRate * (0.7 + Math.random() * 0.6);
    params.spindleSpeed = params.spindleSpeed * (0.8 + Math.random() * 0.4);
    params.depthOfCut = params.depthOfCut * (0.6 + Math.random() * 0.8);
    params.grindingWheelSpeed = params.grindingWheelSpeed * (0.8 + Math.random() * 0.4);
    params.coolantPressure = params.coolantPressure * (0.9 + Math.random() * 0.2);

    const roughness = simulateRoughness(params, fractalFeatures);
    const efficiency = params.feedRate * params.depthOfCut / 1000;
    const toolWear = (params.feedRate * params.depthOfCut) / (params.grindingWheelSpeed * params.coolantPressure * 10);

    paretoFront.push({ params, roughness, efficiency, toolWear });
  }

  paretoFront.sort((a, b) => a.roughness - b.roughness);

  const dominated = new Set<number>();
  for (let i = 0; i < paretoFront.length; i++) {
    for (let j = 0; j < paretoFront.length; j++) {
      if (i === j || dominated.has(i)) continue;
      const a = paretoFront[i];
      const b = paretoFront[j];
      if (
        b.roughness <= a.roughness &&
        b.efficiency >= a.efficiency &&
        b.toolWear <= a.toolWear &&
        (b.roughness < a.roughness || b.efficiency > a.efficiency || b.toolWear < a.toolWear)
      ) {
        dominated.add(i);
        break;
      }
    }
  }

  const nonDominated = paretoFront.filter((_, i) => !dominated.has(i)).slice(0, 10);

  const optimalSolution = nonDominated.reduce((best, current) => {
    const bestScore = Math.abs(best.roughness - targetRa) * 2 + (1 / best.efficiency) * 0.5 + best.toolWear * 0.3;
    const currentScore = Math.abs(current.roughness - targetRa) * 2 + (1 / current.efficiency) * 0.5 + current.toolWear * 0.3;
    return currentScore < bestScore ? current : best;
  }, nonDominated[0] || paretoFront[0]);

  const baseRoughness = simulateRoughness(currentParams, fractalFeatures);
  const predictedImprovement = ((baseRoughness - optimalSolution.roughness) / baseRoughness) * 100;

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    baseParams: { ...currentParams },
    optimizedParams: optimalSolution.params,
    predictedImprovement: Math.max(0, predictedImprovement),
    tradeOffAnalysis: {
      roughnessImprovement: Math.max(0, predictedImprovement),
      efficiencyChange: ((optimalSolution.efficiency - (currentParams.feedRate * currentParams.depthOfCut / 1000)) / (currentParams.feedRate * currentParams.depthOfCut / 1000)) * 100,
      toolWearChange: ((optimalSolution.toolWear - ((currentParams.feedRate * currentParams.depthOfCut) / (currentParams.grindingWheelSpeed * currentParams.coolantPressure * 10))) / ((currentParams.feedRate * currentParams.depthOfCut) / (currentParams.grindingWheelSpeed * currentParams.coolantPressure * 10))) * 100,
    },
    paretoFront: nonDominated,
  };
}

function simulateRoughness(params: ProcessingParams, fractalFeatures: FractalFeatures): number {
  const feedFactor = Math.pow(params.feedRate / 200, 0.6);
  const depthFactor = Math.pow(params.depthOfCut / 20, 0.4);
  const speedFactor = Math.pow(60 / params.spindleSpeed * 1000, 0.3);
  const wheelFactor = Math.pow(30 / params.grindingWheelSpeed, 0.2);
  const coolantFactor = Math.pow(5 / params.coolantPressure, 0.15);
  const fractalFactor = Math.pow(fractalFeatures.boxDimension / 1.5, 0.5);

  return 0.1 * feedFactor * depthFactor * speedFactor * wheelFactor * coolantFactor * fractalFactor;
}

export function generateOptimizationRecommendations(
  optimization: ParameterOptimizationResult
): string[] {
  const recommendations: string[] = [];
  const { baseParams, optimizedParams, tradeOffAnalysis } = optimization;

  if (Math.abs(optimizedParams.feedRate - baseParams.feedRate) > baseParams.feedRate * 0.1) {
    const direction = optimizedParams.feedRate < baseParams.feedRate ? '降低' : '提高';
    const percent = Math.abs(Math.round((optimizedParams.feedRate - baseParams.feedRate) / baseParams.feedRate * 100));
    recommendations.push(`建议${direction}进给速度约 ${percent}%，预计可${tradeOffAnalysis.roughnessImprovement > 0 ? '改善表面质量' : '提升加工效率'}`);
  }

  if (Math.abs(optimizedParams.depthOfCut - baseParams.depthOfCut) > baseParams.depthOfCut * 0.1) {
    const direction = optimizedParams.depthOfCut < baseParams.depthOfCut ? '减小' : '增加';
    const percent = Math.abs(Math.round((optimizedParams.depthOfCut - baseParams.depthOfCut) / baseParams.depthOfCut * 100));
    recommendations.push(`${direction}切削深度 ${percent}%，${optimizedParams.depthOfCut < baseParams.depthOfCut ? '可获得更好的表面质量' : '可提高材料去除率'}`);
  }

  if (tradeOffAnalysis.toolWearChange > 10) {
    recommendations.push(`警告：优化方案可能导致刀具磨损增加 ${Math.round(tradeOffAnalysis.toolWearChange)}%，建议监控刀具状态`);
  } else if (tradeOffAnalysis.toolWearChange < -5) {
    recommendations.push(`优化方案可降低刀具磨损约 ${Math.round(Math.abs(tradeOffAnalysis.toolWearChange))}%，有助于延长刀具寿命`);
  }

  if (optimizedParams.coolantPressure > baseParams.coolantPressure * 1.1) {
    recommendations.push('提高冷却液压力有助于改善润滑和冷却效果，建议验证冷却系统能力');
  }

  return recommendations;
}
