import { onMount, For, Show } from 'solid-js';
import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { foodCount } from '../../stores/app';
import { searchFoods, getFoodsByCategory, getFoodsByGI, getDBStats } from '../../db';
import type { FoodItem } from '../../types';

const CATEGORIES = [
  '全部', '谷物', '蔬菜', '水果', '肉类', '水产', '乳制品',
  '豆类', '坚果', '饮品', '调味品', '糕点', '速食',
];

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

export default function FoodDatabase() {
  const navigate = useNavigate();
  const [query, setQuery] = createSignal('');
  const [foods, setFoods] = createSignal<FoodItem[]>([]);
  const [selectedCategory, setSelectedCategory] = createSignal('全部');
  const [selectedGI, setSelectedGI] = createSignal<'all' | 'low' | 'medium' | 'high'>('all');
  const [displayCount, setDisplayCount] = createSignal(50);
  const [loading, setLoading] = createSignal(false);
  const [stats, setStats] = createSignal({ foods: 0, meals: 0, predictions: 0 });

  onMount(async () => {
    try {
      const s = await getDBStats();
      setStats(s);
    } catch (e) {
      console.error(e);
    }
  });

  async function doSearch() {
    setLoading(true);
    try {
      let results: FoodItem[] = [];

      if (query().trim().length >= 1) {
        results = await searchFoods(query(), 500);
      } else if (selectedCategory() !== '全部') {
        results = await getFoodsByCategory(selectedCategory());
      } else if (selectedGI() !== 'all') {
        switch (selectedGI()) {
          case 'low': results = await getFoodsByGI(0, 55); break;
          case 'medium': results = await getFoodsByGI(55, 70); break;
          case 'high': results = await getFoodsByGI(70, 100); break;
        }
      } else {
        results = await searchFoods('', 500);
      }

      if (selectedCategory() !== '全部' && query().trim().length >= 1) {
        results = results.filter(f => f.category === selectedCategory());
      }
      if (selectedGI() !== 'all') {
        switch (selectedGI()) {
          case 'low': results = results.filter(f => f.gi > 0 && f.gi <= 55); break;
          case 'medium': results = results.filter(f => f.gi > 55 && f.gi <= 70); break;
          case 'high': results = results.filter(f => f.gi > 70); break;
        }
      }

      setFoods(results);
      setDisplayCount(50);
    } catch (e) {
      console.error(e);
      setFoods([]);
    } finally {
      setLoading(false);
    }
  }

  function handleCategoryChange(cat: string) {
    setSelectedCategory(cat);
    setTimeout(doSearch, 0);
  }

  function handleGIChange(gi: 'all' | 'low' | 'medium' | 'high') {
    setSelectedGI(gi);
    setTimeout(doSearch, 0);
  }

  function handleSearch() {
    doSearch();
  }

  const visibleFoods = () => foods().slice(0, displayCount());
  const hasMore = () => displayCount() < foods().length;

  onMount(() => {
    doSearch();
  });

  return (
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="section-title">食物数据库</h2>
        <span class="font-body text-sm text-metabo-muted">
          共 {stats().foods} 种食物
        </span>
      </div>

      <div class="glass-card p-6 space-y-4">
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-metabo-muted"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            class="input-field w-full pl-10"
            placeholder="搜索食物名称..."
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div class="flex flex-wrap gap-2">
          <For each={CATEGORIES}>
            {(cat) => (
              <button
                class={`px-3 py-1 rounded-full font-body text-xs transition-all duration-200 ${
                  selectedCategory() === cat
                    ? 'bg-metabo-glow text-metabo-dark font-semibold'
                    : 'bg-metabo-surface border border-metabo-border text-metabo-muted hover:border-metabo-glow/50'
                }`}
                onClick={() => handleCategoryChange(cat)}
              >
                {cat}
              </button>
            )}
          </For>
        </div>

        <div class="flex gap-2">
          <button
            class={`px-3 py-1 rounded-full font-body text-xs transition-all duration-200 ${
              selectedGI() === 'all'
                ? 'bg-metabo-glow text-metabo-dark font-semibold'
                : 'bg-metabo-surface border border-metabo-border text-metabo-muted hover:border-metabo-glow/50'
            }`}
            onClick={() => handleGIChange('all')}
          >
            全部GI
          </button>
          <button
            class={`px-3 py-1 rounded-full font-body text-xs transition-all duration-200 ${
              selectedGI() === 'low'
                ? 'bg-metabo-glow text-metabo-dark font-semibold'
                : 'bg-metabo-surface border border-metabo-border text-metabo-muted hover:border-metabo-glow/50'
            }`}
            onClick={() => handleGIChange('low')}
          >
            低GI (&lt;55)
          </button>
          <button
            class={`px-3 py-1 rounded-full font-body text-xs transition-all duration-200 ${
              selectedGI() === 'medium'
                ? 'bg-metabo-amber text-metabo-dark font-semibold'
                : 'bg-metabo-surface border border-metabo-border text-metabo-muted hover:border-metabo-amber/50'
            }`}
            onClick={() => handleGIChange('medium')}
          >
            中GI (55-70)
          </button>
          <button
            class={`px-3 py-1 rounded-full font-body text-xs transition-all duration-200 ${
              selectedGI() === 'high'
                ? 'bg-red-500 text-white font-semibold'
                : 'bg-metabo-surface border border-metabo-border text-metabo-muted hover:border-red-500/50'
            }`}
            onClick={() => handleGIChange('high')}
          >
            高GI (&gt;70)
          </button>
        </div>
      </div>

      <Show when={loading()} fallback={
        <Show when={foods().length > 0} fallback={
          <div class="glass-card p-12 flex flex-col items-center gap-3">
            <span class="font-body text-sm text-metabo-muted">未找到匹配的食物</span>
          </div>
        }>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <For each={visibleFoods()}>
              {(food) => (
                <button
                  class="glass-card p-4 text-left transition-all duration-200 hover:border-metabo-glow/30"
                  onClick={() => navigate(`/food-database/${food.id}`)}
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-body text-sm text-metabo-text font-medium">{food.name}</span>
                    <span class="badge-low text-xs">{food.category}</span>
                  </div>
                  <div class="font-body text-xs text-metabo-muted mb-2">{food.nameEn}</div>
                  <div class="flex items-center gap-2 mb-3">
                    <span class={giBadgeClass(food.gi)}>{giLabel(food.gi)}</span>
                    <span class="font-body text-xs text-metabo-muted">GI {food.gi}</span>
                  </div>
                  <div class="flex gap-2 font-body text-xs text-metabo-muted">
                    <span>{food.calories} kcal</span>
                    <span>P {food.protein}g</span>
                    <span>F {food.fat}g</span>
                    <span>C {food.carbs}g</span>
                  </div>
                  <div class="mt-2 flex gap-1">
                    <div class="flex-1 h-1 bg-metabo-border rounded-full overflow-hidden">
                      <div class="h-full bg-blue-500/60 rounded-full" style={{ width: `${Math.min((food.protein / 30) * 100, 100)}%` }} />
                    </div>
                    <div class="flex-1 h-1 bg-metabo-border rounded-full overflow-hidden">
                      <div class="h-full bg-metabo-amber/60 rounded-full" style={{ width: `${Math.min((food.fat / 30) * 100, 100)}%` }} />
                    </div>
                    <div class="flex-1 h-1 bg-metabo-border rounded-full overflow-hidden">
                      <div class="h-full bg-purple-500/60 rounded-full" style={{ width: `${Math.min((food.carbs / 50) * 100, 100)}%` }} />
                    </div>
                  </div>
                </button>
              )}
            </For>
          </div>

          <Show when={hasMore()}>
            <div class="flex justify-center pt-4">
              <button class="btn-secondary" onClick={() => setDisplayCount(prev => prev + 50)}>
                加载更多 ({foods().length - displayCount()} 条剩余)
              </button>
            </div>
          </Show>
        </Show>
      }>
        <div class="flex items-center justify-center py-12">
          <div class="w-6 h-6 border-2 border-metabo-glow/30 border-t-metabo-glow rounded-full animate-spin" />
        </div>
      </Show>
    </div>
  );
}
