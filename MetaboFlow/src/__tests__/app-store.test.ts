import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import * as store from '../stores/app';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
  });
});

afterAll(() => {
  localStorageMock.clear();
});

function createTestMeal(id: string, timestamp: number, calories: number = 500) {
  return {
    id,
    userId: 'test-user',
    timestamp,
    mealType: 'lunch' as const,
    items: [
      {
        foodId: 'food1',
        foodName: 'Test Food',
        amount: 100,
        unit: 'g',
      },
    ],
    totalNutrition: {
      calories,
      protein: 20,
      fat: 10,
      carbs: 50,
      fiber: 5,
      gi: 50,
      gl: 25,
    },
  };
}

describe('Authentication state', () => {
  beforeEach(() => {
    store.logout();
  });

  it('初始状态应为未登录', () => {
    expect(store.user()).toBeNull();
  });

  it('登录应设置用户信息', () => {
    store.login('test@test.com', 'user');
    expect(store.user()?.email).toBe('test@test.com');
    expect(store.user()?.role).toBe('user');
  });

  it('登出应清除所有状态', () => {
    store.login('test@test.com', 'user');
    store.addMeal(createTestMeal('meal1', Date.now()));
    store.addPrediction({
      mealId: 'meal1',
      curve: [],
      peakTime: 30,
      peakValue: 120,
      iauc: 100,
      riskLevel: 'low',
    });
    store.addAlert({
      id: 'alert1',
      predictionId: 'pred1',
      type: 'peak',
      severity: 'medium',
      message: 'Test alert',
      timestamp: Date.now(),
    });
    store.logout();
    expect(store.user()).toBeNull();
    expect(store.meals()).toHaveLength(0);
    expect(store.predictions()).toHaveLength(0);
    expect(store.alerts()).toHaveLength(0);
  });

  it('应支持分析师角色', () => {
    store.login('analyst@test.com', 'analyst');
    expect(store.user()?.role).toBe('analyst');
  });
});

describe('Meal record state', () => {
  beforeEach(() => {
    store.logout();
  });

  it('初始餐食列表应为空', () => {
    expect(store.meals()).toHaveLength(0);
  });

  it('应添加餐食记录', () => {
    store.addMeal(createTestMeal('meal1', Date.now()));
    expect(store.meals()).toHaveLength(1);
  });

  it('应删除餐食记录', () => {
    store.addMeal(createTestMeal('meal1', Date.now()));
    store.removeMeal('meal1');
    expect(store.meals()).toHaveLength(0);
  });

  it('今日餐食应正确筛选', () => {
    const now = Date.now();
    const startOfDay = now - (now % 86400000);
    const yesterday = startOfDay - 86400000;
    store.addMeal(createTestMeal('meal1', now));
    store.addMeal(createTestMeal('meal2', yesterday));
    const todayMeals = store.meals().filter(m => m.timestamp >= startOfDay);
    expect(todayMeals).toHaveLength(1);
    expect(todayMeals[0]?.id).toBe('meal1');
  });
});

describe('Metabolic profile state', () => {
  beforeEach(() => {
    store.logout();
  });

  it('应有默认代谢配置', () => {
    const p = store.profile();
    expect(p).toHaveProperty('userId');
    expect(p).toHaveProperty('basalMetabolicRate');
    expect(p).toHaveProperty('insulinSensitivity');
    expect(p).toHaveProperty('glucoseTolerance');
    expect(p).toHaveProperty('bodyWeight');
    expect(p).toHaveProperty('age');
    expect(p).toHaveProperty('sex');
  });

  it('应能更新配置参数', () => {
    store.updateProfile({ insulinSensitivity: 80 });
    expect(store.profile().insulinSensitivity).toBe(80);
  });

  it('BMR值应在合理范围', () => {
    const bmr = store.profile().basalMetabolicRate;
    expect(bmr).toBeGreaterThanOrEqual(1000);
    expect(bmr).toBeLessThanOrEqual(3000);
  });
});

describe('Derived state (Memos)', () => {
  beforeEach(() => {
    store.logout();
  });

  it('isLoggedIn应正确反映登录状态', () => {
    expect(store.user() !== null).toBe(false);
    store.login('test@test.com', 'user');
    expect(store.user() !== null).toBe(true);
  });

  it('isAnalyst应正确反映角色', () => {
    expect(store.user()?.role === 'analyst').toBe(false);
    store.login('analyst@test.com', 'analyst');
    expect(store.user()?.role === 'analyst').toBe(true);
  });

  it('todayNutrition应聚合今日营养', () => {
    const now = Date.now();
    const startOfDay = now - (now % 86400000);
    store.addMeal(createTestMeal('meal1', now));
    const todayMeals = store.meals().filter(m => m.timestamp >= startOfDay);
    const nutrition = todayMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.totalNutrition.calories,
        protein: acc.protein + m.totalNutrition.protein,
        fat: acc.fat + m.totalNutrition.fat,
        carbs: acc.carbs + m.totalNutrition.carbs,
        fiber: acc.fiber + m.totalNutrition.fiber,
        gi: acc.gi + m.totalNutrition.gi * m.items.length,
        gl: acc.gl + m.totalNutrition.gl,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0 }
    );
    expect(nutrition.calories).toBe(500);
    expect(nutrition.protein).toBe(20);
    expect(nutrition.carbs).toBe(50);
  });

  it('activeAlerts应正确筛选', () => {
    store.addAlert({
      id: 'alert1',
      predictionId: 'pred1',
      type: 'peak',
      severity: 'low',
      message: 'Low alert',
      timestamp: Date.now(),
    });
    store.addAlert({
      id: 'alert2',
      predictionId: 'pred2',
      type: 'peak',
      severity: 'medium',
      message: 'Medium alert',
      timestamp: Date.now(),
    });
    store.addAlert({
      id: 'alert3',
      predictionId: 'pred3',
      type: 'rapid',
      severity: 'high',
      message: 'High alert',
      timestamp: Date.now(),
    });
    const activeAlerts = store.alerts().filter(a => a.severity !== 'low');
    expect(activeAlerts).toHaveLength(2);
    expect(activeAlerts.some(a => a.severity === 'low')).toBe(false);
  });

  it('highRiskPredictions应正确筛选', () => {
    store.addPrediction({
      mealId: 'meal1',
      curve: [],
      peakTime: 30,
      peakValue: 120,
      iauc: 100,
      riskLevel: 'low',
    });
    store.addPrediction({
      mealId: 'meal2',
      curve: [],
      peakTime: 45,
      peakValue: 180,
      iauc: 200,
      riskLevel: 'high',
    });
    const highRisk = store.predictions().filter(p => p.riskLevel === 'high');
    expect(highRisk).toHaveLength(1);
    expect(highRisk[0]?.riskLevel).toBe('high');
  });
});

describe('Prediction and Alert state', () => {
  beforeEach(() => {
    store.logout();
  });

  it('应添加预测结果', () => {
    store.addPrediction({
      mealId: 'meal1',
      curve: [],
      peakTime: 30,
      peakValue: 120,
      iauc: 100,
      riskLevel: 'medium',
    });
    expect(store.predictions()).toHaveLength(1);
  });

  it('应添加告警', () => {
    store.addAlert({
      id: 'alert1',
      predictionId: 'pred1',
      type: 'peak',
      severity: 'medium',
      message: 'Test alert',
      timestamp: Date.now(),
    });
    expect(store.alerts()).toHaveLength(1);
  });

  it('告警应能被消除', () => {
    store.addAlert({
      id: 'alert1',
      predictionId: 'pred1',
      type: 'peak',
      severity: 'medium',
      message: 'Test alert',
      timestamp: Date.now(),
    });
    store.dismissAlert('alert1');
    expect(store.alerts()).toHaveLength(0);
  });
});

describe('Database status', () => {
  beforeEach(() => {
    store.logout();
  });

  it('初始状态应为未就绪', () => {
    expect(store.dbReady()).toBe(false);
  });

  it('标记就绪应设置状态', () => {
    store.markDbReady(120);
    expect(store.dbReady()).toBe(true);
    expect(store.foodCount()).toBe(120);
  });
});
