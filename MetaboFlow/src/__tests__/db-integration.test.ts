import { describe, it, expect, beforeAll } from 'vitest';
import {
  getDB,
  getDBStats,
  bulkImportFoods,
  getFoodById,
  searchFoods,
  getFoodsByCategory,
  getFoodsByGI,
  addMeal,
  getMealsByUser,
  getMealsByDateRange,
  deleteMeal,
  saveProfile,
  getProfile,
  savePrediction,
  getPredictionsByRisk,
  saveAlignment,
  getAllAlignments,
} from '../db';
import type { FoodItem, MealRecord, MetabolicProfile, BloodSugarPrediction, SemanticAlignment } from '../types';

const testFoods: FoodItem[] = [
  {
    id: 'food-1',
    name: '白米饭',
    nameEn: 'White Rice',
    category: '主食',
    calories: 130,
    protein: 2.7,
    fat: 0.3,
    carbs: 28,
    fiber: 0.4,
    gi: 73,
    gl: 21,
    vitamins: {},
    minerals: {},
    tags: ['主食', '碳水'],
  },
  {
    id: 'food-2',
    name: '鸡胸肉',
    nameEn: 'Chicken Breast',
    category: '肉类',
    calories: 165,
    protein: 31,
    fat: 3.6,
    carbs: 0,
    fiber: 0,
    gi: 0,
    gl: 0,
    vitamins: {},
    minerals: {},
    tags: ['肉类', '高蛋白'],
  },
  {
    id: 'food-3',
    name: '西兰花',
    nameEn: 'Broccoli',
    category: '蔬菜',
    calories: 34,
    protein: 2.8,
    fat: 0.4,
    carbs: 7,
    fiber: 2.6,
    gi: 10,
    gl: 1,
    vitamins: {},
    minerals: {},
    tags: ['蔬菜', '低卡'],
  },
  {
    id: 'food-4',
    name: '燕麦片',
    nameEn: 'Oatmeal',
    category: '主食',
    calories: 68,
    protein: 2.4,
    fat: 1.4,
    carbs: 12,
    fiber: 1.7,
    gi: 55,
    gl: 7,
    vitamins: {},
    minerals: {},
    tags: ['主食', '全谷物'],
  },
  {
    id: 'food-5',
    name: '苹果',
    nameEn: 'Apple',
    category: '水果',
    calories: 52,
    protein: 0.3,
    fat: 0.2,
    carbs: 14,
    fiber: 2.4,
    gi: 36,
    gl: 5,
    vitamins: {},
    minerals: {},
    tags: ['水果', '低GI'],
  },
];

describe('Database initialization', () => {
  it('应成功打开数据库并创建对象仓库', async () => {
    const db = await getDB();
    expect(db).toBeDefined();
    expect(db.objectStoreNames.contains('foods')).toBe(true);
    expect(db.objectStoreNames.contains('meals')).toBe(true);
    expect(db.objectStoreNames.contains('profiles')).toBe(true);
    expect(db.objectStoreNames.contains('predictions')).toBe(true);
    expect(db.objectStoreNames.contains('alignments')).toBe(true);
  });

  it('应返回0条初始食物数据', async () => {
    const stats = await getDBStats();
    expect(stats.foods).toBe(0);
  });
});

describe('Food CRUD operations', () => {
  beforeAll(async () => {
    await bulkImportFoods(testFoods);
  });

  it('应批量导入食物数据', async () => {
    const stats = await getDBStats();
    expect(stats.foods).toBe(5);
  });

  it('应能按ID查询食物', async () => {
    const food = await getFoodById('food-1');
    expect(food).toBeDefined();
    expect(food?.name).toBe('白米饭');
  });

  it('查询不存在的ID应返回undefined', async () => {
    const food = await getFoodById('non-existent-id');
    expect(food).toBeUndefined();
  });

  it('应按关键词搜索食物', async () => {
    const results = await searchFoods('米饭');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(f => f.name.includes('米饭'))).toBe(true);
  });

  it('应按分类筛选食物', async () => {
    const results = await getFoodsByCategory('主食');
    expect(results.length).toBe(2);
    expect(results.every(f => f.category === '主食')).toBe(true);
  });

  it('应按GI范围筛选食物', async () => {
    const results = await getFoodsByGI(55, 70);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(f => f.gi >= 55 && f.gi <= 70)).toBe(true);
  });
});

describe('Meal record operations', () => {
  const testUserId = 'test-user-1';

  it('应保存餐食记录', async () => {
    const meal: MealRecord = {
      id: 'meal-1',
      userId: testUserId,
      timestamp: Date.now(),
      mealType: 'lunch',
      items: [{ foodId: 'food-1', foodName: '白米饭', amount: 100, unit: 'g' }],
      totalNutrition: { calories: 130, protein: 2.7, fat: 0.3, carbs: 28, fiber: 0.4, gi: 73, gl: 21 },
    };
    await addMeal(meal);
    const meals = await getMealsByUser(testUserId);
    expect(meals.length).toBe(1);
  });

  it('应按用户查询所有餐食', async () => {
    const now = Date.now();
    const meals: MealRecord[] = [
      {
        id: 'meal-2',
        userId: testUserId,
        timestamp: now - 86400000,
        mealType: 'breakfast',
        items: [],
        totalNutrition: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0 },
      },
      {
        id: 'meal-3',
        userId: testUserId,
        timestamp: now - 172800000,
        mealType: 'dinner',
        items: [],
        totalNutrition: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0 },
      },
    ];
    for (const meal of meals) {
      await addMeal(meal);
    }
    const userMeals = await getMealsByUser(testUserId);
    expect(userMeals.length).toBe(3);
  });

  it('应按日期范围筛选餐食', async () => {
    const now = Date.now();
    const start = now - 100000000;
    const end = now;
    const results = await getMealsByDateRange(testUserId, start, end);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(m => m.timestamp >= start && m.timestamp <= end)).toBe(true);
  });

  it('应删除餐食记录', async () => {
    await deleteMeal('meal-1');
    const meals = await getMealsByUser(testUserId);
    expect(meals.find(m => m.id === 'meal-1')).toBeUndefined();
  });
});

describe('Profile and Prediction operations', () => {
  const testUserId = 'test-user-2';

  it('应保存代谢配置', async () => {
    const profile: MetabolicProfile = {
      userId: testUserId,
      basalMetabolicRate: 1500,
      insulinSensitivity: 0.8,
      glucoseTolerance: 0.9,
      bodyWeight: 70,
      age: 30,
      sex: 'male',
    };
    await saveProfile(profile);
    const saved = await getProfile(testUserId);
    expect(saved).toBeDefined();
    expect(saved?.bodyWeight).toBe(70);
    expect(saved?.basalMetabolicRate).toBe(1500);
  });

  it('应保存血糖预测结果', async () => {
    const prediction: BloodSugarPrediction = {
      mealId: 'pred-meal-1',
      curve: [{ time: 0, glucose: 90 }, { time: 30, glucose: 120 }],
      peakTime: 30,
      peakValue: 120,
      iauc: 500,
      riskLevel: 'medium',
    };
    await savePrediction(prediction);
    const results = await getPredictionsByRisk('medium');
    expect(results.length).toBeGreaterThan(0);
  });

  it('应按风险等级筛选预测', async () => {
    const predictions: BloodSugarPrediction[] = [
      {
        mealId: 'pred-meal-2',
        curve: [],
        peakTime: 45,
        peakValue: 180,
        iauc: 1000,
        riskLevel: 'high',
      },
      {
        mealId: 'pred-meal-3',
        curve: [],
        peakTime: 60,
        peakValue: 100,
        iauc: 200,
        riskLevel: 'low',
      },
    ];
    for (const pred of predictions) {
      await savePrediction(pred);
    }
    const highRisk = await getPredictionsByRisk('high');
    const lowRisk = await getPredictionsByRisk('low');
    expect(highRisk.every(p => p.riskLevel === 'high')).toBe(true);
    expect(lowRisk.every(p => p.riskLevel === 'low')).toBe(true);
  });
});

describe('Semantic Alignment operations', () => {
  it('应保存语义对齐记录', async () => {
    const alignment: SemanticAlignment = {
      id: 'align-1',
      userDimension: '感觉很饱',
      professionalDimension: '饱腹感',
      mappingConfidence: 0.95,
      description: '用户描述的饱腹感对应专业维度的饱腹感',
      category: '主观感受',
    };
    await saveAlignment(alignment);
    const all = await getAllAlignments();
    expect(all.length).toBe(1);
  });

  it('应能查询所有对齐记录', async () => {
    const alignments: SemanticAlignment[] = [
      {
        id: 'align-2',
        userDimension: '头晕',
        professionalDimension: '低血糖症状',
        mappingConfidence: 0.85,
        description: '用户描述的头晕可能对应低血糖',
        category: '症状',
      },
      {
        id: 'align-3',
        userDimension: '没力气',
        professionalDimension: '疲劳',
        mappingConfidence: 0.8,
        description: '用户描述的没力气对应专业维度的疲劳',
        category: '主观感受',
      },
    ];
    for (const align of alignments) {
      await saveAlignment(align);
    }
    const all = await getAllAlignments();
    expect(all.length).toBe(3);
  });
});
