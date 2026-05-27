import { onMount, For, Show } from 'solid-js';
import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { user, meals, profile, predictions, alerts, dbReady, foodCount, login, logout, addMeal, removeMeal, addPrediction, addAlert, todayMeals, todayNutrition, activeAlerts, highRiskPredictions, markDbReady, isLoggedIn, isAnalyst } from '../../stores/app';
import { searchFoods, getDBStats, bulkImportFoods, addMeal as dbAddMeal, getMealsByUser } from '../../db';
import { predict, getPeakAlert, generateAlignments } from '../../engine/metabolic';
import { generateFoodDatabase, generateBulkFoods } from '../../db/food-data';
import NutritionRing from '../../components/NutritionRing';
import BloodSugarChart from '../../components/BloodSugarChart';
import FoodSearch from '../../components/FoodSearch';
import type { FoodItem, MealRecord, MealItem, NutritionSummary, BloodSugarPrediction, SemanticAlignment, Alert, UserRole } from '../../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [initLoading, setInitLoading] = createSignal(true);
  const [quickSearchFood, setQuickSearchFood] = createSignal<FoodItem | null>(null);

  onMount(async () => {
    if (!dbReady()) {
      try {
        const foods = generateFoodDatabase();
        await bulkImportFoods(foods);
        markDbReady(foods.length);
      } catch (e) {
        console.error(e);
      }
    }
    setInitLoading(false);
  });

  function handleQuickAdd(food: FoodItem) {
    const meal: MealRecord = {
      id: `meal_${Date.now()}`,
      userId: user()?.id || 'default',
      timestamp: Date.now(),
      mealType: 'snack',
      items: [{ foodId: food.id, foodName: food.name, amount: 100, unit: 'g' }],
      totalNutrition: {
        calories: food.calories,
        protein: food.protein,
        fat: food.fat,
        carbs: food.carbs,
        fiber: food.fiber,
        gi: food.gi,
        gl: food.gl,
      },
    };
    addMeal(meal);
    dbAddMeal(meal);
    setQuickSearchFood(null);
  }

  const nutrition = todayNutrition();
  const riskLevel = () => {
    const highRisk = highRiskPredictions();
    if (highRisk.length > 0) return 'high';
    const active = activeAlerts();
    if (active.length > 0) return 'medium';
    return 'low';
  };

  const riskBadge = () => {
    switch (riskLevel()) {
      case 'high': return 'badge-high';
      case 'medium': return 'badge-medium';
      default: return 'badge-low';
    }
  };

  const riskLabel = () => {
    switch (riskLevel()) {
      case 'high': return '高风险';
      case 'medium': return '中等';
      default: return '低风险';
    }
  };

  const latestPrediction = () => {
    const preds = predictions();
    return preds.length > 0 ? preds[preds.length - 1] : null;
  };

  return (
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <Show when={initLoading()}>
        <div class="flex items-center justify-center h-64">
          <div class="flex flex-col items-center gap-3">
            <div class="w-8 h-8 border-2 border-metabo-glow/30 border-t-metabo-glow rounded-full animate-spin" />
            <span class="font-body text-metabo-muted text-sm">正在初始化食物数据库...</span>
          </div>
        </div>
      </Show>

      <Show when={!initLoading()}>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="glass-card p-4 flex flex-col gap-2">
            <span class="font-body text-sm text-metabo-muted">今日热量</span>
            <span class="stat-number text-metabo-glow">{Math.round(nutrition.calories)}</span>
            <span class="font-body text-xs text-metabo-muted">kcal</span>
          </div>
          <div class="glass-card p-4 flex flex-col gap-2">
            <span class="font-body text-sm text-metabo-muted">今日蛋白质</span>
            <span class="stat-number text-metabo-glow">{Math.round(nutrition.protein)}</span>
            <span class="font-body text-xs text-metabo-muted">g</span>
          </div>
          <div class="glass-card p-4 flex flex-col gap-2">
            <span class="font-body text-sm text-metabo-muted">今日碳水</span>
            <span class="stat-number text-metabo-amber">{Math.round(nutrition.carbs)}</span>
            <span class="font-body text-xs text-metabo-muted">g</span>
          </div>
          <div class="glass-card p-4 flex flex-col gap-2">
            <span class="font-body text-sm text-metabo-muted">血糖风险</span>
            <span class={riskBadge()} style="font-size: 14px; padding: 4px 12px; align-self: flex-start; margin-top: 4px;">{riskLabel()}</span>
            <span class="font-body text-xs text-metabo-muted">{highRiskPredictions().length} 条高风险</span>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="glass-card p-6 flex flex-col gap-4">
            <h3 class="section-title">快速添加食物</h3>
            <FoodSearch onSelect={(food) => setQuickSearchFood(food)} />
            <Show when={quickSearchFood()}>
              <div class="flex items-center justify-between p-3 bg-metabo-surface/80 rounded-xl border border-metabo-border">
                <div>
                  <span class="font-body text-sm text-metabo-text">{quickSearchFood()!.name}</span>
                  <span class="font-body text-xs text-metabo-muted ml-2">{quickSearchFood()!.calories} kcal/100g</span>
                </div>
                <button class="btn-primary text-sm px-4 py-1.5" onClick={() => handleQuickAdd(quickSearchFood()!)}>
                  添加
                </button>
              </div>
            </Show>
            <button class="btn-secondary w-full text-sm" onClick={() => navigate('/dashboard/meal-input')}>
              完整餐食录入 →
            </button>
          </div>

          <div>
            <Show when={latestPrediction()} fallback={
              <div class="glass-card p-6 h-full flex flex-col items-center justify-center gap-3">
                <svg class="w-12 h-12 text-metabo-muted/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <span class="font-body text-sm text-metabo-muted">暂无血糖预测数据</span>
                <span class="font-body text-xs text-metabo-muted">录入餐食后点击"预测血糖"生成</span>
              </div>
            }>
              <BloodSugarChart
                curve={latestPrediction()!.curve}
                peakTime={latestPrediction()!.peakTime}
                peakValue={latestPrediction()!.peakValue}
                riskLevel={latestPrediction()!.riskLevel}
              />
            </Show>
          </div>
        </div>

        <div>
          <h3 class="section-title mb-4">最近记录</h3>
          <Show when={todayMeals().length > 0} fallback={
            <div class="glass-card p-8 flex flex-col items-center justify-center gap-2">
              <span class="font-body text-sm text-metabo-muted">今天还没有饮食记录</span>
              <button class="btn-primary text-sm px-4 py-1.5 mt-2" onClick={() => navigate('/dashboard/meal-input')}>
                开始记录
              </button>
            </div>
          }>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <For each={todayMeals().slice(-6).reverse()}>
                {(meal) => {
                  const typeLabel: Record<string, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
                  const typeColor: Record<string, string> = { breakfast: 'badge-low', lunch: 'badge-medium', dinner: 'badge-high', snack: 'badge-low' };
                  return (
                    <div class="glass-card p-4 flex flex-col gap-2">
                      <div class="flex items-center justify-between">
                        <span class={typeColor[meal.mealType]}>{typeLabel[meal.mealType]}</span>
                        <span class="font-body text-xs text-metabo-muted">
                          {new Date(meal.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div class="font-body text-sm text-metabo-text">
                        {meal.items.map(i => i.foodName).join('、')}
                      </div>
                      <div class="flex gap-3 font-body text-xs text-metabo-muted">
                        <span>{Math.round(meal.totalNutrition.calories)} kcal</span>
                        <span>P {Math.round(meal.totalNutrition.protein)}g</span>
                        <span>C {Math.round(meal.totalNutrition.carbs)}g</span>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
