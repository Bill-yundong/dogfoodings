import type { MealRecord, MetabolicProfile, BloodSugarPrediction, CurvePoint, Alert, SemanticAlignment } from '../types';

function simulateGlucoseCurve(
  weightedGI: number,
  weightedGL: number,
  carbs: number,
  profile: MetabolicProfile
): CurvePoint[] {
  const points: CurvePoint[] = [];
  const baseline = 5.0;
  const sensitivityFactor = 1 / (profile.insulinSensitivity * 0.01 + 0.5);
  const toleranceFactor = profile.glucoseTolerance * 0.01;
  const weightFactor = 70 / profile.bodyWeight;

  const peakHeight = (weightedGI / 100) * (weightedGL / 10) * sensitivityFactor * weightFactor * (1 - toleranceFactor * 0.3);
  const clampedPeak = Math.min(Math.max(peakHeight, 0.5), 12);
  const peakTimeMin = 30 + (100 - weightedGI) * 0.3;
  const absorptionRate = 0.02 + (weightedGI / 100) * 0.03;
  const eliminationRate = 0.008 + profile.insulinSensitivity * 0.0005;

  for (let t = 0; t <= 180; t += 5) {
    let glucose = baseline;
    const tRise = t;
    const tPeak = peakTimeMin;

    if (tRise <= tPeak) {
      const progress = tRise / tPeak;
      glucose += clampedPeak * Math.pow(progress, 1.5);
    } else {
      const tFall = tRise - tPeak;
      glucose += clampedPeak * Math.exp(-eliminationRate * tFall * (1 + toleranceFactor));
      if (tFall > 60 && carbs > 30) {
        glucose += clampedPeak * 0.08 * Math.exp(-absorptionRate * tFall);
      }
    }

    glucose += (Math.random() - 0.5) * 0.1;
    glucose = Math.max(3.5, Math.min(15, glucose));

    points.push({ time: t, glucose: Math.round(glucose * 100) / 100 });
  }

  return points;
}

function calculateIAUC(curve: CurvePoint[]): number {
  const baseline = 5.0;
  let iauc = 0;
  for (let i = 1; i < curve.length; i++) {
    const diff = Math.max(0, curve[i].glucose - baseline);
    const prevDiff = Math.max(0, curve[i - 1].glucose - baseline);
    iauc += (diff + prevDiff) / 2 * (curve[i].time - curve[i - 1].time);
  }
  return Math.round(iauc * 100) / 100;
}

export async function predict(
  meal: MealRecord,
  profile: MetabolicProfile
): Promise<BloodSugarPrediction> {
  await new Promise(r => setTimeout(r, 50));

  const weightedGI = meal.totalNutrition.gi;
  const weightedGL = meal.totalNutrition.gl;
  const carbs = meal.totalNutrition.carbs;

  const curve = simulateGlucoseCurve(weightedGI, weightedGL, carbs, profile);

  let peakValue = 0;
  let peakTime = 0;
  for (const point of curve) {
    if (point.glucose > peakValue) {
      peakValue = point.glucose;
      peakTime = point.time;
    }
  }

  const iauc = calculateIAUC(curve);

  let riskLevel: 'low' | 'medium' | 'high';
  if (peakValue < 7.8) riskLevel = 'low';
  else if (peakValue < 10.0) riskLevel = 'medium';
  else riskLevel = 'high';

  return {
    mealId: meal.id,
    curve,
    peakTime,
    peakValue: Math.round(peakValue * 100) / 100,
    iauc,
    riskLevel,
  };
}

export async function batchPredict(
  meals: MealRecord[],
  profile: MetabolicProfile
): Promise<BloodSugarPrediction[]> {
  return Promise.all(meals.map(m => predict(m, profile)));
}

export function getPeakAlert(prediction: BloodSugarPrediction): Alert | null {
  if (prediction.riskLevel === 'low') return null;

  let type: Alert['type'];
  let severity: Alert['severity'];
  let message: string;

  if (prediction.peakValue >= 10.0) {
    type = 'peak';
    severity = 'high';
    message = `血糖波峰 ${prediction.peakValue} mmol/L 超过安全阈值，建议立即关注`;
  } else if (prediction.peakValue >= 9.0) {
    type = 'rapid';
    severity = 'medium';
    message = `血糖快速升至 ${prediction.peakValue} mmol/L，上升速率偏快`;
  } else {
    type = 'sustained';
    severity = 'low';
    message = `血糖波峰 ${prediction.peakValue} mmol/L 处于边缘区间，持续监测`;
  }

  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    predictionId: prediction.mealId,
    type,
    severity,
    message,
    timestamp: Date.now(),
  };
}

export function generateAlignments(): SemanticAlignment[] {
  return [
    {
      id: 'align_001',
      userDimension: '血糖波动',
      professionalDimension: '餐后血糖增量面积(IAUC)',
      mappingConfidence: 0.94,
      description: '用户感知的血糖波动程度与专业IAUC指标的线性映射，置信度基于历史数据回归',
      category: '血糖动力学',
    },
    {
      id: 'align_002',
      userDimension: '食物升糖速度',
      professionalDimension: '血糖上升速率(dG/dt max)',
      mappingConfidence: 0.89,
      description: '用户对食物升糖快慢的直觉与导数峰值的一致性校准',
      category: '血糖动力学',
    },
    {
      id: 'align_003',
      userDimension: '饱腹感持续时间',
      professionalDimension: '血糖回归基线时间(Tbaseline)',
      mappingConfidence: 0.82,
      description: '用户主观饱腹感与血糖回归基线时间的关联映射',
      category: '代谢时间学',
    },
    {
      id: 'align_004',
      userDimension: '饮食满足度',
      professionalDimension: '宏量营养素比例偏差度',
      mappingConfidence: 0.76,
      description: '用户对膳食满足感的评价与宏量营养素偏离理想比例的相关性',
      category: '营养平衡',
    },
    {
      id: 'align_005',
      userDimension: '体力精力水平',
      professionalDimension: '餐后血糖曲线下面积(AUC)',
      mappingConfidence: 0.71,
      description: '用户自我报告的精力水平与总AUC的非线性关系',
      category: '能量代谢',
    },
    {
      id: 'align_006',
      userDimension: '饥饿回归时间',
      professionalDimension: '胰岛素响应延迟(τinsulin)',
      mappingConfidence: 0.68,
      description: '用户饥饿感重新出现的时间与胰岛素响应延迟参数的映射',
      category: '代谢时间学',
    },
    {
      id: 'align_007',
      userDimension: '食物消化舒适度',
      professionalDimension: '膳食纤维缓释指数',
      mappingConfidence: 0.85,
      description: '消化舒适度评价与膳食纤维对葡萄糖缓释效应的定量关联',
      category: '营养平衡',
    },
    {
      id: 'align_008',
      userDimension: '甜食渴望度',
      professionalDimension: '血糖谷值深度(Nadir)',
      mappingConfidence: 0.79,
      description: '甜食渴望强度与餐后血糖谷值偏离基线深度的反向映射',
      category: '血糖动力学',
    },
  ];
}
