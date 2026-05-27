import { For, Show } from 'solid-js';
import { todayMeals, removeMeal } from '../../stores/app';
import type { MealRecord } from '../../types';

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

const MEAL_TYPE_BADGE: Record<string, string> = {
  breakfast: 'badge-low',
  lunch: 'badge-medium',
  dinner: 'badge-high',
  snack: 'badge-low',
};

export default function Timeline() {
  const meals = todayMeals();

  return (
    <div class="flex-1 overflow-y-auto p-6">
      <h2 class="section-title mb-6">今日饮食时间线</h2>

      <Show when={meals.length === 0} fallback={
        <div class="relative pl-8">
          <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-metabo-border" />

          <div class="space-y-6">
            <For each={[...meals].sort((a, b) => b.timestamp - a.timestamp)}>
              {(meal) => (
                <div class="relative">
                  <div class="absolute -left-8 top-4 w-4 h-4 rounded-full bg-metabo-surface border-2 border-metabo-glow shadow-glow-sm" />

                  <div class="glass-card p-5">
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-3">
                        <span class={MEAL_TYPE_BADGE[meal.mealType]}>
                          {MEAL_TYPE_LABEL[meal.mealType]}
                        </span>
                        <span class="font-body text-sm text-metabo-muted">
                          {new Date(meal.timestamp).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <button
                        class="text-metabo-muted hover:text-metabo-amber transition-colors duration-200"
                        onClick={() => removeMeal(meal.id)}
                      >
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>

                    <div class="space-y-1.5 mb-3">
                      <For each={meal.items}>
                        {(item) => (
                          <div class="flex items-center justify-between font-body text-sm">
                            <span class="text-metabo-text">{item.foodName}</span>
                            <span class="text-metabo-muted">{item.amount}{item.unit}</span>
                          </div>
                        )}
                      </For>
                    </div>

                    <div class="flex gap-4 pt-2 border-t border-metabo-border">
                      <div class="font-body text-xs">
                        <span class="text-metabo-muted">热量</span>
                        <span class="text-metabo-glow ml-1">{Math.round(meal.totalNutrition.calories)} kcal</span>
                      </div>
                      <div class="font-body text-xs">
                        <span class="text-metabo-muted">蛋白质</span>
                        <span class="text-metabo-text ml-1">{Math.round(meal.totalNutrition.protein)}g</span>
                      </div>
                      <div class="font-body text-xs">
                        <span class="text-metabo-muted">脂肪</span>
                        <span class="text-metabo-text ml-1">{Math.round(meal.totalNutrition.fat)}g</span>
                      </div>
                      <div class="font-body text-xs">
                        <span class="text-metabo-muted">碳水</span>
                        <span class="text-metabo-text ml-1">{Math.round(meal.totalNutrition.carbs)}g</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      }>
        <div class="flex flex-col items-center justify-center py-24 gap-4">
          <svg class="w-16 h-16 text-metabo-muted/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span class="font-body text-metabo-muted">今天还没有饮食记录</span>
          <span class="font-body text-xs text-metabo-muted">添加餐食后将在此处显示时间线</span>
        </div>
      </Show>
    </div>
  );
}
