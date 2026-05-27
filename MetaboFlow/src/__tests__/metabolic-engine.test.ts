import { predict, batchPredict, getPeakAlert, generateAlignments } from '../engine/metabolic';
import type { MealRecord, MetabolicProfile, BloodSugarPrediction } from '../types';

function createTestMeal(overrides: Partial<MealRecord> = {}): MealRecord {
  return {
    id: 'meal_test_001',
    userId: 'user_001',
    timestamp: Date.now(),
    mealType: 'lunch',
    items: [],
    totalNutrition: {
      calories: 350,
      protein: 8,
      fat: 12,
      carbs: 28.2,
      fiber: 2,
      gi: 75,
      gl: 29,
    },
    ...overrides,
  };
}

function createTestProfile(overrides: Partial<MetabolicProfile> = {}): MetabolicProfile {
  return {
    userId: 'user_001',
    basalMetabolicRate: 1600,
    insulinSensitivity: 50,
    glucoseTolerance: 50,
    bodyWeight: 70,
    age: 30,
    sex: 'male',
    ...overrides,
  };
}

describe('predict - 血糖预测引擎', () => {
  it('应基于高GI食物产生高风险预测', async () => {
    const meal = createTestMeal({
      totalNutrition: {
        calories: 600,
        protein: 5,
        fat: 15,
        carbs: 90,
        fiber: 1,
        gi: 95,
        gl: 65,
      },
    });
    const profile = createTestProfile();
    const result = await predict(meal, profile);

    expect(['medium', 'high']).toContain(result.riskLevel);
    expect(result.peakValue).toBeGreaterThan(7);
    expect(result.peakTime).toBeGreaterThan(0);
  });

  it('应基于低GI食物产生低风险预测', async () => {
    const meal = createTestMeal({
      totalNutrition: {
        calories: 80,
        protein: 2,
        fat: 0.5,
        carbs: 6.6,
        fiber: 1.5,
        gi: 10,
        gl: 1,
      },
    });
    const profile = createTestProfile();
    const result = await predict(meal, profile);

    expect(result.riskLevel).toBe('low');
    expect(result.peakValue).toBeLessThan(7.8);
  });

  it('预测曲线应包含37个点(0-180分钟,每5分钟)', async () => {
    const meal = createTestMeal();
    const profile = createTestProfile();
    const result = await predict(meal, profile);

    expect(result.curve.length).toBe(37);
  });

  it('曲线基线应约为5.0 mmol/L', async () => {
    const meal = createTestMeal();
    const profile = createTestProfile();
    const result = await predict(meal, profile);

    expect(result.curve[0].glucose).toBeCloseTo(5.0, 0);
  });

  it('胰岛素敏感度越高峰值越低', async () => {
    const meal = createTestMeal();
    const profileHigh = createTestProfile({ insulinSensitivity: 80 });
    const profileLow = createTestProfile({ insulinSensitivity: 20 });

    const resultHigh = await predict(meal, profileHigh);
    const resultLow = await predict(meal, profileLow);

    expect(resultHigh.peakValue).toBeLessThan(resultLow.peakValue);
  });

  it('葡萄糖耐受性越高峰值越低', async () => {
    const meal = createTestMeal();
    const profileHigh = createTestProfile({ glucoseTolerance: 80 });
    const profileLow = createTestProfile({ glucoseTolerance: 20 });

    const resultHigh = await predict(meal, profileHigh);
    const resultLow = await predict(meal, profileLow);

    expect(resultHigh.peakValue).toBeLessThan(resultLow.peakValue);
  });

  it('IAUC值应为正数', async () => {
    const meal = createTestMeal();
    const profile = createTestProfile();
    const result = await predict(meal, profile);

    expect(result.iauc).toBeGreaterThan(0);
  });

  it('峰值时间应在15-120分钟之间', async () => {
    const meal = createTestMeal();
    const profile = createTestProfile();
    const result = await predict(meal, profile);

    expect(result.peakTime).toBeGreaterThanOrEqual(15);
    expect(result.peakTime).toBeLessThanOrEqual(120);
  });
});

describe('batchPredict - 批量预测', () => {
  it('应并行预测多餐', async () => {
    const meals: MealRecord[] = [
      createTestMeal({ id: 'meal_1' }),
      createTestMeal({ id: 'meal_2', totalNutrition: { calories: 200, protein: 5, fat: 8, carbs: 15, fiber: 1, gi: 40, gl: 8 } }),
      createTestMeal({ id: 'meal_3', totalNutrition: { calories: 500, protein: 15, fat: 20, carbs: 50, fiber: 3, gi: 85, gl: 42 } }),
    ];
    const profile = createTestProfile();
    const results = await batchPredict(meals, profile);

    expect(results.length).toBe(3);
  });

  it('每条预测应独立完整', async () => {
    const meals: MealRecord[] = [
      createTestMeal({ id: 'meal_1' }),
      createTestMeal({ id: 'meal_2' }),
      createTestMeal({ id: 'meal_3' }),
    ];
    const profile = createTestProfile();
    const results = await batchPredict(meals, profile);

    for (const result of results) {
      expect(result.curve).toBeDefined();
      expect(result.peakTime).toBeDefined();
      expect(result.peakValue).toBeDefined();
      expect(result.iauc).toBeDefined();
      expect(result.riskLevel).toBeDefined();
    }
  });
});

describe('getPeakAlert - 波峰告警', () => {
  it('低风险预测不应产生告警', () => {
    const prediction: BloodSugarPrediction = {
      mealId: 'meal_low',
      curve: [],
      peakTime: 45,
      peakValue: 6.5,
      iauc: 50,
      riskLevel: 'low',
    };

    expect(getPeakAlert(prediction)).toBeNull();
  });

  it('高风险预测应产生高严重性告警', () => {
    const prediction: BloodSugarPrediction = {
      mealId: 'meal_high',
      curve: [],
      peakTime: 30,
      peakValue: 10.5,
      iauc: 200,
      riskLevel: 'high',
    };

    const alert = getPeakAlert(prediction);
    expect(alert).not.toBeNull();
    expect(alert!.severity).toBe('high');
    expect(alert!.type).toBe('peak');
  });

  it('中风险预测应产生告警', () => {
    const prediction: BloodSugarPrediction = {
      mealId: 'meal_medium',
      curve: [],
      peakTime: 40,
      peakValue: 8.5,
      iauc: 120,
      riskLevel: 'medium',
    };

    const alert = getPeakAlert(prediction);
    expect(alert).not.toBeNull();
  });

  it('告警应包含预测ID', () => {
    const prediction: BloodSugarPrediction = {
      mealId: 'meal_alert_id_test',
      curve: [],
      peakTime: 35,
      peakValue: 9.5,
      iauc: 150,
      riskLevel: 'high',
    };

    const alert = getPeakAlert(prediction);
    expect(alert).not.toBeNull();
    expect(alert!.predictionId).toBe('meal_alert_id_test');
  });
});

describe('generateAlignments - 语义对齐生成', () => {
  it('应生成8维对齐映射', () => {
    const alignments = generateAlignments();

    expect(alignments.length).toBe(8);
  });

  it('每个对齐应包含用户维度和专业维度', () => {
    const alignments = generateAlignments();

    for (const alignment of alignments) {
      expect(alignment.userDimension).toBeDefined();
      expect(alignment.professionalDimension).toBeDefined();
      expect(alignment.mappingConfidence).toBeDefined();
      expect(alignment.description).toBeDefined();
    }
  });

  it('置信度应在0-1之间', () => {
    const alignments = generateAlignments();

    for (const alignment of alignments) {
      expect(alignment.mappingConfidence).toBeGreaterThanOrEqual(0);
      expect(alignment.mappingConfidence).toBeLessThanOrEqual(1);
    }
  });

  it('应包含血糖动力学类别', () => {
    const alignments = generateAlignments();

    const hasCategory = alignments.some(a => a.category === '血糖动力学');
    expect(hasCategory).toBe(true);
  });
});
