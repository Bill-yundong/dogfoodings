import { onMount, For, Show } from 'solid-js';
import { createSignal } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { getFoodById, getFoodsByCategory } from '../../db';
import type { FoodItem } from '../../types';

function giBadgeClass(gi: number) {
  if (gi <= 55) return 'badge-low';
  if (gi <= 70) return 'badge-medium';
  return 'badge-high';
}

function giLabel(gi: number) {
  if (gi <= 55) return '低GI';
  if (gi <= 70) return '中GI';
  if (gi > 70) return '高GI';
  return '无GI';
}

const RADAR_AXES = ['蛋白质', '脂肪', '碳水', '纤维', '维生素', '矿物质'];

function normalizeForRadar(food: FoodItem): number[] {
  return [
    Math.min(food.protein / 30, 1),
    Math.min(food.fat / 30, 1),
    Math.min(food.carbs / 50, 1),
    Math.min(food.fiber / 10, 1),
    Math.min(Object.values(food.vitamins).reduce((s, v) => s + v, 0) / 100, 1),
    Math.min(Object.values(food.minerals).reduce((s, v) => s + v, 0) / 200, 1),
  ];
}

function radarPoints(values: number[], cx: number, cy: number, r: number): string {
  const n = values.length;
  return values
    .map((v, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + r * v * Math.cos(angle);
      const y = cy + r * v * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(' ');
}

function radarAxisPoints(cx: number, cy: number, r: number, index: number): string {
  const angle = (Math.PI * 2 * index) / RADAR_AXES.length - Math.PI / 2;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  return `${cx},${cy} ${x},${y}`;
}

function radarLabelPos(index: number, cx: number, cy: number, r: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / RADAR_AXES.length - Math.PI / 2;
  return {
    x: cx + (r + 20) * Math.cos(angle),
    y: cy + (r + 20) * Math.sin(angle),
  };
}

export default function FoodDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const [food, setFood] = createSignal<FoodItem | null>(null);
  const [similar, setSimilar] = createSignal<FoodItem[]>([]);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    try {
      const f = await getFoodById(params.id!);
      if (f) {
        setFood(f);
        const catFoods = await getFoodsByCategory(f.category);
        setSimilar(catFoods.filter(sf => sf.id !== f.id).slice(0, 3));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div class="flex-1 overflow-y-auto p-6">
      <Show when={loading()} fallback={
        <Show when={food()} fallback={
          <div class="flex flex-col items-center justify-center h-96 gap-4">
            <span class="font-body text-metabo-muted">未找到该食物</span>
            <button class="btn-secondary" onClick={() => navigate('/food-database')}>
              返回数据库
            </button>
          </div>
        }>
          {(() => {
            const f = food()!;
            const radarValues = normalizeForRadar(f);
            const cx = 200;
            const cy = 200;
            const r = 140;

            return (
              <div class="space-y-6">
                <div class="flex items-center gap-4">
                  <button
                    class="text-metabo-muted hover:text-metabo-text transition-colors"
                    onClick={() => navigate('/food-database')}
                  >
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <div class="flex-1">
                    <div class="flex items-center gap-3">
                      <h1 class="font-display text-2xl font-bold text-metabo-text">{f.name}</h1>
                      <span class="badge-low">{f.category}</span>
                    </div>
                    <span class="font-body text-sm text-metabo-muted">{f.nameEn}</span>
                  </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div class="glass-card p-6">
                    <div class="flex items-center justify-between mb-6">
                      <h3 class="section-title">GI / GL</h3>
                      <span class={giBadgeClass(f.gi)} style="font-size: 14px; padding: 6px 14px;">
                        {giLabel(f.gi)} · GI {f.gi}
                      </span>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div class="p-4 bg-metabo-dark/50 rounded-xl border border-metabo-border text-center">
                        <span class="stat-number text-metabo-glow">{f.gi}</span>
                        <p class="font-body text-xs text-metabo-muted mt-1">升糖指数 (GI)</p>
                      </div>
                      <div class="p-4 bg-metabo-dark/50 rounded-xl border border-metabo-border text-center">
                        <span class="stat-number text-metabo-amber">{f.gl}</span>
                        <p class="font-body text-xs text-metabo-muted mt-1">升糖负荷 (GL)</p>
                      </div>
                    </div>

                    <div class="mt-6">
                      <h4 class="font-display text-sm font-semibold text-metabo-text mb-3">营养雷达图</h4>
                      <svg viewBox="0 0 400 400" class="w-full max-w-sm mx-auto">
                        <For each={[0.25, 0.5, 0.75, 1]}>
                          {(scale) => (
                            <polygon
                              points={radarPoints(Array(RADAR_AXES.length).fill(scale), cx, cy, r)}
                              fill="none"
                              stroke="#21262D"
                              stroke-width="0.5"
                            />
                          )}
                        </For>
                        <For each={RADAR_AXES}>
                          {(_, i) => (
                            <polyline
                              points={radarAxisPoints(cx, cy, r, i())}
                              fill="none"
                              stroke="#21262D"
                              stroke-width="0.5"
                            />
                          )}
                        </For>
                        <polygon
                          points={radarPoints(radarValues, cx, cy, r)}
                          fill="rgba(0, 255, 136, 0.1)"
                          stroke="#00FF88"
                          stroke-width="2"
                        />
                        <For each={RADAR_AXES}>
                          {(label, i) => {
                            const pos = radarLabelPos(i(), cx, cy, r);
                            return (
                              <text
                                x={pos.x}
                                y={pos.y}
                                text-anchor="middle"
                                dominant-baseline="middle"
                                fill="#8B949E"
                                class="font-body"
                                style="font-size: 11px"
                              >
                                {label}
                              </text>
                            );
                          }}
                        </For>
                      </svg>
                    </div>
                  </div>

                  <div class="space-y-6">
                    <div class="glass-card p-6">
                      <h3 class="section-title mb-4">营养详情 (每100g)</h3>
                      <div class="space-y-3">
                        <div class="flex justify-between font-body text-sm">
                          <span class="text-metabo-muted">热量</span>
                          <span class="text-metabo-glow font-medium">{f.calories} kcal</span>
                        </div>
                        <div class="flex justify-between font-body text-sm">
                          <span class="text-metabo-muted">蛋白质</span>
                          <span class="text-metabo-text">{f.protein} g</span>
                        </div>
                        <div class="flex justify-between font-body text-sm">
                          <span class="text-metabo-muted">脂肪</span>
                          <span class="text-metabo-text">{f.fat} g</span>
                        </div>
                        <div class="flex justify-between font-body text-sm">
                          <span class="text-metabo-muted">碳水</span>
                          <span class="text-metabo-text">{f.carbs} g</span>
                        </div>
                        <div class="flex justify-between font-body text-sm">
                          <span class="text-metabo-muted">膳食纤维</span>
                          <span class="text-metabo-text">{f.fiber} g</span>
                        </div>
                        <div class="border-t border-metabo-border pt-3 mt-3">
                          <span class="font-body text-xs text-metabo-muted">维生素</span>
                          <div class="grid grid-cols-2 gap-2 mt-2">
                            <For each={Object.entries(f.vitamins)}>
                              {([key, val]) => (
                                <div class="flex justify-between font-body text-xs">
                                  <span class="text-metabo-muted">{key}</span>
                                  <span class="text-metabo-text">{val}</span>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                        <div class="border-t border-metabo-border pt-3">
                          <span class="font-body text-xs text-metabo-muted">矿物质</span>
                          <div class="grid grid-cols-2 gap-2 mt-2">
                            <For each={Object.entries(f.minerals)}>
                              {([key, val]) => (
                                <div class="flex justify-between font-body text-xs">
                                  <span class="text-metabo-muted">{key}</span>
                                  <span class="text-metabo-text">{val}</span>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Show when={similar().length > 0}>
                  <div>
                    <h3 class="section-title mb-4">同类替代</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <For each={similar()}>
                        {(sf) => (
                          <button
                            class="glass-card p-4 text-left transition-all duration-200 hover:border-metabo-glow/30"
                            onClick={() => {
                              navigate(`/food-database/${sf.id}`);
                              window.location.reload();
                            }}
                          >
                            <div class="font-body text-sm text-metabo-text font-medium mb-1">{sf.name}</div>
                            <div class="font-body text-xs text-metabo-muted mb-2">{sf.nameEn}</div>
                            <div class="flex gap-2 mb-2">
                              <span class={giBadgeClass(sf.gi)}>{giLabel(sf.gi)}</span>
                            </div>
                            <div class="flex gap-2 font-body text-xs text-metabo-muted">
                              <span>{sf.calories} kcal</span>
                              <span>P {sf.protein}g</span>
                              <span>C {sf.carbs}g</span>
                            </div>
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            );
          })()}
        </Show>
      }>
        <div class="flex items-center justify-center h-96">
          <div class="w-8 h-8 border-2 border-metabo-glow/30 border-t-metabo-glow rounded-full animate-spin" />
        </div>
      </Show>
    </div>
  );
}
