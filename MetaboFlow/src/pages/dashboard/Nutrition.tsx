import { For, Show } from 'solid-js';
import { todayNutrition, profile } from '../../stores/app';
import NutritionRing from '../../components/NutritionRing';

const MICRONUTRIENTS = [
  { key: 'A', label: '维生素A', unit: 'μg', daily: 800 },
  { key: 'C', label: '维生素C', unit: 'mg', daily: 90 },
  { key: 'D', label: '维生素D', unit: 'μg', daily: 15 },
  { key: 'E', label: '维生素E', unit: 'mg', daily: 15 },
  { key: 'B1', label: '维生素B1', unit: 'mg', daily: 1.2 },
  { key: 'B2', label: '维生素B2', unit: 'mg', daily: 1.3 },
  { key: 'B12', label: '维生素B12', unit: 'μg', daily: 2.4 },
  { key: 'Ca', label: '钙', unit: 'mg', daily: 800 },
  { key: 'Fe', label: '铁', unit: 'mg', daily: 12 },
  { key: 'Zn', label: '锌', unit: 'mg', daily: 11 },
  { key: 'K', label: '钾', unit: 'mg', daily: 2000 },
  { key: 'Mg', label: '镁', unit: 'mg', daily: 330 },
];

const GOAL_ITEMS = [
  { label: '热量', key: 'calories', unit: 'kcal', getColor: () => '#00FF88' },
  { label: '蛋白质', key: 'protein', unit: 'g', getColor: () => '#3B82F6' },
  { label: '脂肪', key: 'fat', unit: 'g', getColor: () => '#F5A623' },
  { label: '碳水', key: 'carbs', unit: 'g', getColor: () => '#A855F7' },
  { label: '膳食纤维', key: 'fiber', unit: 'g', getColor: () => '#10B981' },
];

export default function Nutrition() {
  const p = profile();
  const tn = todayNutrition();

  const calorieTarget = p.basalMetabolicRate;
  const proteinTarget = Math.round(p.bodyWeight * 1.2);
  const fatTarget = Math.round((calorieTarget * 0.25) / 9);
  const carbsTarget = Math.round((calorieTarget * 0.5) / 4);

  const targets: Record<string, number> = {
    calories: calorieTarget,
    protein: proteinTarget,
    fat: fatTarget,
    carbs: carbsTarget,
    fiber: 25,
  };

  return (
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h2 class="section-title mb-6">营养概览</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <NutritionRing
            value={Math.round(tn.calories)}
            maxValue={calorieTarget}
            label="热量 (kcal)"
            color="#00FF88"
            size={160}
          />
          <NutritionRing
            value={Math.round(tn.protein)}
            maxValue={proteinTarget}
            label="蛋白质 (g)"
            color="#3B82F6"
            size={160}
          />
          <NutritionRing
            value={Math.round(tn.fat)}
            maxValue={fatTarget}
            label="脂肪 (g)"
            color="#F5A623"
            size={160}
          />
          <NutritionRing
            value={Math.round(tn.carbs)}
            maxValue={carbsTarget}
            label="碳水 (g)"
            color="#A855F7"
            size={160}
          />
        </div>
      </div>

      <div class="glass-card p-6">
        <h3 class="section-title mb-4">每日目标达成</h3>
        <div class="space-y-4">
          <For each={GOAL_ITEMS}>
            {(item) => {
              const current = Math.round(tn[item.key as keyof typeof tn]);
              const target = targets[item.key] || 100;
              const pct = Math.min((current / target) * 100, 150);
              return (
                <div>
                  <div class="flex justify-between mb-1 font-body text-sm">
                    <span class="text-metabo-text">{item.label}</span>
                    <span class="text-metabo-muted">
                      {current} / {target} {item.unit}
                    </span>
                  </div>
                  <div class="h-2 bg-metabo-border rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        'background-color': item.getColor(),
                        'box-shadow': `0 0 8px ${item.getColor()}66`,
                      }}
                    />
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      <div class="glass-card p-6">
        <h3 class="section-title mb-4">微量营养素</h3>
        <Show when={tn.calories > 0} fallback={
          <div class="flex flex-col items-center py-8 gap-2">
            <span class="font-body text-sm text-metabo-muted">今天还没有饮食记录</span>
            <span class="font-body text-xs text-metabo-muted">记录餐食后查看微量营养素摄入</span>
          </div>
        }>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <For each={MICRONUTRIENTS}>
              {(micro) => {
                const pct = Math.min((0 / micro.daily) * 100, 100);
                const color = pct >= 80 ? '#00FF88' : pct >= 40 ? '#F5A623' : '#EF4444';
                return (
                  <div class="p-3 bg-metabo-surface/60 rounded-xl border border-metabo-border">
                    <div class="flex justify-between mb-2 font-body text-sm">
                      <span class="text-metabo-text">{micro.label}</span>
                      <span class="text-metabo-muted">0 / {micro.daily} {micro.unit}</span>
                    </div>
                    <div class="h-1.5 bg-metabo-border rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          'background-color': color,
                        }}
                      />
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}
