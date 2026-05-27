import { createSignal, For, Show } from 'solid-js';
import { user, profile, addMeal, addPrediction, addAlert } from '../../stores/app';
import { addMeal as dbAddMeal } from '../../db';
import { predict, getPeakAlert } from '../../engine/metabolic';
import FoodSearch from '../../components/FoodSearch';
import NutritionRing from '../../components/NutritionRing';
import BloodSugarChart from '../../components/BloodSugarChart';
import type { FoodItem, MealItem, MealRecord, BloodSugarPrediction } from '../../types';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '加餐' },
];

interface SelectedFood {
  food: FoodItem;
  amount: number;
}

export default function MealInput() {
  const [selectedFoods, setSelectedFoods] = createSignal<SelectedFood[]>([]);
  const [mealType, setMealType] = createSignal<MealType>('lunch');
  const [predicting, setPredicting] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [lastPrediction, setLastPrediction] = createSignal<BloodSugarPrediction | null>(null);

  function handleFoodSelect(food: FoodItem) {
    setSelectedFoods(prev => [...prev, { food, amount: 100 }]);
  }

  function removeFood(index: number) {
    setSelectedFoods(prev => prev.filter((_, i) => i !== index));
  }

  function updateAmount(index: number, amount: number) {
    setSelectedFoods(prev => prev.map((item, i) => i === index ? { ...item, amount } : item));
  }

  const totalNutrition = () => {
    const foods = selectedFoods();
    return foods.reduce(
      (acc, item) => {
        const factor = item.amount / 100;
        return {
          calories: acc.calories + item.food.calories * factor,
          protein: acc.protein + item.food.protein * factor,
          fat: acc.fat + item.food.fat * factor,
          carbs: acc.carbs + item.food.carbs * factor,
          fiber: acc.fiber + item.food.fiber * factor,
          gi: acc.gi + item.food.gi * factor,
          gl: acc.gl + item.food.gl * factor,
        };
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0 }
    );
  };

  const weightedGI = () => {
    const foods = selectedFoods();
    if (foods.length === 0) return 0;
    const totalCarbs = foods.reduce((s, f) => s + f.food.carbs * (f.amount / 100), 0);
    if (totalCarbs === 0) return 0;
    return foods.reduce((s, f) => s + f.food.gi * f.food.carbs * (f.amount / 100), 0) / totalCarbs;
  };

  async function handlePredict() {
    if (selectedFoods().length === 0) return;
    setPredicting(true);

    const meal: MealRecord = {
      id: `meal_${Date.now()}`,
      userId: user()?.id || 'default',
      timestamp: Date.now(),
      mealType: mealType(),
      items: selectedFoods().map(f => ({
        foodId: f.food.id,
        foodName: f.food.name,
        amount: f.amount,
        unit: 'g',
      })),
      totalNutrition: {
        calories: Math.round(totalNutrition().calories),
        protein: Math.round(totalNutrition().protein * 10) / 10,
        fat: Math.round(totalNutrition().fat * 10) / 10,
        carbs: Math.round(totalNutrition().carbs * 10) / 10,
        fiber: Math.round(totalNutrition().fiber * 10) / 10,
        gi: Math.round(weightedGI() * 10) / 10,
        gl: Math.round(totalNutrition().gl * 10) / 10,
      },
    };

    try {
      const prediction = await predict(meal, profile());
      setLastPrediction(prediction);
      addPrediction(prediction);

      const alert = getPeakAlert(prediction);
      if (alert) addAlert(alert);
    } catch (e) {
      console.error(e);
    } finally {
      setPredicting(false);
    }
  }

  async function handleSave() {
    if (selectedFoods().length === 0) return;
    setSaving(true);

    const meal: MealRecord = {
      id: `meal_${Date.now()}`,
      userId: user()?.id || 'default',
      timestamp: Date.now(),
      mealType: mealType(),
      items: selectedFoods().map(f => ({
        foodId: f.food.id,
        foodName: f.food.name,
        amount: f.amount,
        unit: 'g',
      })),
      totalNutrition: {
        calories: Math.round(totalNutrition().calories),
        protein: Math.round(totalNutrition().protein * 10) / 10,
        fat: Math.round(totalNutrition().fat * 10) / 10,
        carbs: Math.round(totalNutrition().carbs * 10) / 10,
        fiber: Math.round(totalNutrition().fiber * 10) / 10,
        gi: Math.round(weightedGI() * 10) / 10,
        gl: Math.round(totalNutrition().gl * 10) / 10,
      },
    };

    try {
      addMeal(meal);
      await dbAddMeal(meal);
      setSelectedFoods([]);
      setLastPrediction(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const tn = totalNutrition();

  return (
    <div class="flex-1 overflow-y-auto p-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="glass-card p-6 relative z-10">
            <h3 class="section-title mb-4">搜索食物</h3>
            <FoodSearch onSelect={handleFoodSelect} />
          </div>

          <div class="glass-card p-6 relative z-0">
            <div class="flex items-center justify-between mb-4">
              <h3 class="section-title">已选食物</h3>
              <span class="font-body text-sm text-metabo-muted">{selectedFoods().length} 项</span>
            </div>
            <Show when={selectedFoods().length === 0} fallback={
              <div class="space-y-3">
                <For each={selectedFoods()}>
                  {(item, index) => (
                    <div class="flex items-center gap-4 p-3 bg-metabo-surface/80 rounded-xl border border-metabo-border">
                      <div class="flex-1 min-w-0">
                        <span class="font-body text-sm text-metabo-text">{item.food.name}</span>
                        <span class="font-body text-xs text-metabo-muted ml-2">{item.food.calories} kcal/100g</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="500"
                          value={item.amount}
                          onInput={(e) => updateAmount(index(), parseInt(e.currentTarget.value))}
                          class="w-24 accent-metabo-glow"
                        />
                        <span class="font-body text-xs text-metabo-muted w-14 text-right">{item.amount}g</span>
                        <button
                          class="text-metabo-amber hover:text-red-400 transition-colors"
                          onClick={() => removeFood(index())}
                        >
                          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            }>
              <div class="flex flex-col items-center py-8 gap-2">
                <span class="font-body text-sm text-metabo-muted">请搜索并添加食物</span>
              </div>
            </Show>
          </div>

          <div class="glass-card p-6">
            <h3 class="section-title mb-4">餐食类型</h3>
            <div class="flex gap-3">
              <For each={MEAL_TYPES}>
                {(type) => (
                  <button
                    class={`px-5 py-2 rounded-full font-body text-sm transition-all duration-200 ${
                      mealType() === type.value
                        ? 'bg-metabo-glow text-metabo-dark font-semibold'
                        : 'bg-metabo-surface border border-metabo-border text-metabo-muted hover:border-metabo-glow/50'
                    }`}
                    onClick={() => setMealType(type.value)}
                  >
                    {type.label}
                  </button>
                )}
              </For>
            </div>
          </div>

          <Show when={lastPrediction()}>
            <BloodSugarChart
              curve={lastPrediction()!.curve}
              peakTime={lastPrediction()!.peakTime}
              peakValue={lastPrediction()!.peakValue}
              riskLevel={lastPrediction()!.riskLevel}
            />
          </Show>
        </div>

        <div class="space-y-6">
          <div class="glass-card p-6">
            <h3 class="section-title mb-4">营养概览</h3>
            <div class="grid grid-cols-2 gap-4">
              <NutritionRing value={Math.round(tn.calories)} maxValue={profile().basalMetabolicRate} label="热量" color="#00FF88" size={100} />
              <NutritionRing value={Math.round(tn.protein)} maxValue={80} label="蛋白质" color="#3B82F6" size={100} />
              <NutritionRing value={Math.round(tn.fat)} maxValue={65} label="脂肪" color="#F5A623" size={100} />
              <NutritionRing value={Math.round(tn.carbs)} maxValue={300} label="碳水" color="#A855F7" size={100} />
            </div>
          </div>

          <div class="glass-card p-6 space-y-4">
            <h3 class="section-title">操作</h3>
            <button
              class="btn-secondary w-full"
              onClick={handlePredict}
              disabled={predicting() || selectedFoods().length === 0}
            >
              {predicting() ? '预测中...' : '预测血糖'}
            </button>
            <button
              class="btn-primary w-full"
              onClick={handleSave}
              disabled={saving() || selectedFoods().length === 0}
            >
              {saving() ? '保存中...' : '保存记录'}
            </button>
          </div>

          <div class="glass-card p-6">
            <h3 class="section-title mb-3">营养详情</h3>
            <div class="space-y-2 font-body text-sm">
              <div class="flex justify-between">
                <span class="text-metabo-muted">热量</span>
                <span class="text-metabo-text">{Math.round(tn.calories)} kcal</span>
              </div>
              <div class="flex justify-between">
                <span class="text-metabo-muted">蛋白质</span>
                <span class="text-metabo-text">{Math.round(tn.protein * 10) / 10} g</span>
              </div>
              <div class="flex justify-between">
                <span class="text-metabo-muted">脂肪</span>
                <span class="text-metabo-text">{Math.round(tn.fat * 10) / 10} g</span>
              </div>
              <div class="flex justify-between">
                <span class="text-metabo-muted">碳水</span>
                <span class="text-metabo-text">{Math.round(tn.carbs * 10) / 10} g</span>
              </div>
              <div class="flex justify-between">
                <span class="text-metabo-muted">膳食纤维</span>
                <span class="text-metabo-text">{Math.round(tn.fiber * 10) / 10} g</span>
              </div>
              <div class="flex justify-between">
                <span class="text-metabo-muted">加权GI</span>
                <span class="text-metabo-text">{Math.round(weightedGI() * 10) / 10}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-metabo-muted">GL</span>
                <span class="text-metabo-text">{Math.round(tn.gl * 10) / 10}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
