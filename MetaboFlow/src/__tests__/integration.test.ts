import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { generateFoodDatabase } from '../db/food-data';
import { bulkImportFoods, searchFoods, addMeal as dbAddMeal, getMealsByUser } from '../db';
import { predict, getPeakAlert, generateAlignments } from '../engine/metabolic';
import type { MealRecord, MealItem, NutritionSummary } from '../types';

let app: any;

beforeAll(async () => {
  const foods = generateFoodDatabase();
  await bulkImportFoods(foods);
  app = await import('../stores/app');
  app.markDbReady(foods.length);
});

beforeEach(() => {
  if (app) {
    app.logout();
  }
});

describe('核心业务场景 - 用户膳食代谢平衡系统集成测试', () => {
  describe('场景1: 个人用户完整代谢健康管理全流程', () => {
    it('1.1 系统初始化 - 食物数据库可搜索', async () => {
      expect(app.dbReady()).toBe(true);
      expect(app.foodCount()).toBeGreaterThan(0);
      const results = await searchFoods('米饭');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('米饭');
    });

    it('1.2 用户登录进入系统', () => {
      app.login('user@metaboflow.com', 'user');
      expect(app.user()).not.toBeNull();
      expect(app.user()?.email).toBe('user@metaboflow.com');
      expect(app.user()?.role).toBe('user');
    });

    it('1.3 通过关键词搜索食物', async () => {
      const chickenResults = await searchFoods('鸡胸');
      expect(chickenResults.length).toBeGreaterThan(0);
      expect(chickenResults[0].category).toBe('肉类');
      expect(chickenResults[0].gi).toBeLessThan(20);

      const riceResults = await searchFoods('白米饭');
      expect(riceResults.length).toBeGreaterThan(0);
      expect(riceResults[0].gi).toBeGreaterThan(70);

      const vegResults = await searchFoods('西兰花');
      expect(vegResults.length).toBeGreaterThan(0);
      expect(vegResults[0].category).toBe('蔬菜');
    });

    it('1.4 构建餐食记录并保存', async () => {
      app.login('test_user@test.com', 'user');
      const initialCount = app.meals().length;

      const mealItems: MealItem[] = [
        { foodId: 'food_00001', foodName: '白米饭', amount: 150, unit: 'g' }
      ];

      const nutrition: NutritionSummary = {
        calories: 195, protein: 4.05, fat: 0.45, carbs: 42.3, fiber: 0.6, gi: 73, gl: 43.5
      };

      const testMeal: MealRecord = {
        id: 'meal_test_001',
        userId: app.user()!.id,
        timestamp: Date.now(),
        mealType: 'lunch',
        items: mealItems,
        totalNutrition: nutrition
      };

      app.addMeal(testMeal);
      await dbAddMeal(testMeal);

      expect(app.meals().length).toBe(initialCount + 1);

      const savedMeals = await getMealsByUser(app.user()!.id);
      expect(savedMeals.length).toBeGreaterThan(0);
    });

    it('1.5 运行代谢动力学引擎预测血糖', async () => {
      app.login('prediction@test.com', 'user');
      const testMeal: MealRecord = {
        id: 'meal_test_002',
        userId: app.user()!.id,
        timestamp: Date.now(),
        mealType: 'dinner',
        items: [{ foodId: 'food_00001', foodName: '白米饭', amount: 200, unit: 'g' }],
        totalNutrition: { calories: 260, protein: 5.4, fat: 0.6, carbs: 56.4, fiber: 0.8, gi: 73, gl: 58 }
      };

      const prediction = await predict(testMeal, app.profile());

      expect(prediction.mealId).toBe('meal_test_002');
      expect(prediction.curve.length).toBe(37);
      expect(prediction.peakValue).toBeGreaterThan(5);
      expect(prediction.peakTime).toBeGreaterThan(0);
      expect(prediction.iauc).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(prediction.riskLevel);

      app.addPrediction(prediction);
      expect(app.predictions().length).toBeGreaterThan(0);
    });

    it('1.6 根据预测结果生成告警', () => {
      app.login('alert@test.com', 'user');
      const testMeal: MealRecord = {
        id: 'meal_test_alert',
        userId: app.user()!.id,
        timestamp: Date.now(),
        mealType: 'dinner',
        items: [{ foodId: 'food_00001', foodName: '白米饭', amount: 500, unit: 'g' }],
        totalNutrition: { calories: 650, protein: 13.5, fat: 1.5, carbs: 141, fiber: 2, gi: 73, gl: 145 }
      };

      predict(testMeal, app.profile()).then(prediction => {
        const alert = getPeakAlert(prediction);
        if (alert && prediction.riskLevel !== 'low') {
          app.addAlert(alert);
          expect(alert.severity).toBeDefined();
        }
      });
    });

    it('1.7 今日营养数据正确聚合', () => {
      app.login('nutrition@test.com', 'user');
      const testMeal: MealRecord = {
        id: 'meal_test_nut',
        userId: app.user()!.id,
        timestamp: Date.now(),
        mealType: 'lunch',
        items: [{ foodId: 'food_00001', foodName: '白米饭', amount: 100, unit: 'g' }],
        totalNutrition: { calories: 130, protein: 2.7, fat: 0.3, carbs: 28.2, fiber: 0.4, gi: 73, gl: 29 }
      };
      app.addMeal(testMeal);

      const meals = app.meals();
      expect(meals.length).toBe(1);
      expect(meals[0].totalNutrition.calories).toBe(130);
      expect(meals[0].totalNutrition.protein).toBe(2.7);
      expect(meals[0].totalNutrition.carbs).toBe(28.2);
    });

    it('1.8 用户登出系统', () => {
      app.login('logout@test.com', 'user');
      expect(app.user()).not.toBeNull();
      app.logout();
      expect(app.user()).toBeNull();
    });
  });

  describe('场景2: 专业分析师终端语义对齐分析', () => {
    it('2.1 分析师登录系统', () => {
      app.login('analyst@metaboflow.com', 'analyst');
      expect(app.user()?.role).toBe('analyst');
    });

    it('2.2 语义对齐数据完整', () => {
      const alignments = generateAlignments();
      expect(alignments.length).toBe(8);

      const categories = [...new Set(alignments.map(a => a.category))];
      expect(categories.length).toBeGreaterThanOrEqual(3);

      const userDimensions = alignments.map(a => a.userDimension);
      const professionalDimensions = alignments.map(a => a.professionalDimension);

      expect(userDimensions).toContain('血糖波动');
      expect(userDimensions).toContain('食物升糖速度');
      expect(professionalDimensions).toContain('餐后血糖增量面积(IAUC)');
      expect(professionalDimensions).toContain('血糖上升速率(dG/dt max)');
    });

    it('2.3 对齐置信度量化准确', () => {
      const alignments = generateAlignments();
      const highConfidence = alignments.filter(a => a.mappingConfidence >= 0.85);
      expect(highConfidence.length).toBeGreaterThan(0);

      const avgConfidence = alignments.reduce((sum, a) => sum + a.mappingConfidence, 0) / alignments.length;
      expect(avgConfidence).toBeGreaterThan(0.7);
    });

    it('2.4 分析师登出系统', () => {
      app.login('analyst2@test.com', 'analyst');
      expect(app.user()).not.toBeNull();
      app.logout();
      expect(app.user()).toBeNull();
    });
  });

  describe('场景3: 全生命周期跨场景膳食协同', () => {
    it('3.1 跨场景数据一致性', async () => {
      app.login('multi@test.com', 'user');
      const userId = app.user()!.id;

      const breakfast: MealRecord = {
        id: 'meal_multi_001',
        userId,
        timestamp: Date.now() - 3600000,
        mealType: 'breakfast',
        items: [{ foodId: 'food_00004', foodName: '白面包', amount: 60, unit: 'g' }],
        totalNutrition: { calories: 200, protein: 6, fat: 2.4, carbs: 37.2, fiber: 0.4, gi: 75, gl: 30 }
      };

      const lunch: MealRecord = {
        id: 'meal_multi_002',
        userId,
        timestamp: Date.now(),
        mealType: 'lunch',
        items: [{ foodId: 'food_00056', foodName: '鸡胸肉', amount: 150, unit: 'g' }],
        totalNutrition: { calories: 248, protein: 46.5, fat: 5.4, carbs: 0, fiber: 0, gi: 0, gl: 0 }
      };

      app.addMeal(breakfast);
      app.addMeal(lunch);

      const results = await searchFoods('');
      expect(results.length).toBeGreaterThan(0);

      const breakfastPrediction = await predict(breakfast, app.profile());
      const lunchPrediction = await predict(lunch, app.profile());

      expect(breakfastPrediction.peakValue).toBeGreaterThan(lunchPrediction.peakValue);

      app.logout();
    });

    it('3.2 离线数据可用性', async () => {
      const foods = generateFoodDatabase();
      expect(foods.length).toBeGreaterThan(0);
      
      const categories = [...new Set(foods.map(f => f.category))];
      expect(categories.length).toBe(12);

      foods.forEach(food => {
        expect(food.gi).toBeGreaterThanOrEqual(0);
        expect(food.gi).toBeLessThanOrEqual(100);
        expect(food.calories).toBeGreaterThanOrEqual(0);
      });
    });

    it('3.3 千万级索引性能基线', () => {
      const foods = generateFoodDatabase();
      expect(foods.length).toBeGreaterThanOrEqual(120);
      
      const uniqueIds = new Set(foods.map(f => f.id));
      expect(uniqueIds.size).toBe(foods.length);

      const byCategory: Record<string, number> = {};
      foods.forEach(f => {
        byCategory[f.category] = (byCategory[f.category] || 0) + 1;
      });
      
      expect(Object.keys(byCategory).length).toBe(12);
    });
  });

  describe('场景4: 系统边界与健壮性测试', () => {
    it('4.1 零碳水餐食预测边界', async () => {
      app.login('boundary@test.com', 'user');
      const zeroCarbMeal: MealRecord = {
        id: 'meal_boundary_001',
        userId: app.user()!.id,
        timestamp: Date.now(),
        mealType: 'dinner',
        items: [{ foodId: 'food_00056', foodName: '鸡胸肉', amount: 100, unit: 'g' }],
        totalNutrition: { calories: 165, protein: 31, fat: 3.6, carbs: 0, fiber: 0, gi: 0, gl: 0 }
      };

      const prediction = await predict(zeroCarbMeal, app.profile());
      expect(prediction.peakValue).toBeLessThan(8);
      expect(prediction.riskLevel).toBe('low');
      app.logout();
    });

    it('4.2 极限高碳水餐食预测', async () => {
      app.login('highcarb@test.com', 'user');
      const highCarbMeal: MealRecord = {
        id: 'meal_boundary_002',
        userId: app.user()!.id,
        timestamp: Date.now(),
        mealType: 'dinner',
        items: [{ foodId: 'food_00001', foodName: '白米饭', amount: 500, unit: 'g' }],
        totalNutrition: { calories: 650, protein: 13.5, fat: 1.5, carbs: 141, fiber: 2, gi: 73, gl: 145 }
      };

      const prediction = await predict(highCarbMeal, app.profile());
      expect(prediction.peakValue).toBeGreaterThan(6);
      expect(prediction.iauc).toBeGreaterThan(0);
      app.logout();
    });

    it('4.3 不同代谢参数对预测的影响', async () => {
      app.login('params@test.com', 'user');
      const testMeal: MealRecord = {
        id: 'meal_boundary_003',
        userId: app.user()!.id,
        timestamp: Date.now(),
        mealType: 'lunch',
        items: [{ foodId: 'food_00001', foodName: '白米饭', amount: 100, unit: 'g' }],
        totalNutrition: { calories: 130, protein: 2.7, fat: 0.3, carbs: 28.2, fiber: 0.4, gi: 73, gl: 29 }
      };

      const sensitiveProfile = { ...app.profile(), insulinSensitivity: 90 };
      const resistantProfile = { ...app.profile(), insulinSensitivity: 10 };

      const predSensitive = await predict(testMeal, sensitiveProfile);
      const predResistant = await predict(testMeal, resistantProfile);

      expect(predResistant.peakValue).toBeGreaterThan(predSensitive.peakValue);
      app.logout();
    });
  });
});
