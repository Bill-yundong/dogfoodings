import { createSignal, createEffect, onCleanup, For, Show } from 'solid-js';
import { searchFoods } from '../db';
import type { FoodItem } from '../types';

interface FoodSearchProps {
  onSelect: (food: FoodItem) => void;
}

function giBadge(gi: number) {
  if (gi <= 55) return 'badge-low';
  if (gi <= 70) return 'badge-medium';
  return 'badge-high';
}

function giLabel(gi: number) {
  if (gi <= 55) return 'Low GI';
  if (gi <= 70) return 'Med GI';
  return 'High GI';
}

export default function FoodSearch(props: FoodSearchProps) {
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<FoodItem[]>([]);
  const [isOpen, setIsOpen] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  createEffect(() => {
    const q = query();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    debounceTimer = setTimeout(async () => {
      setLoading(true);
      try {
        const foods = await searchFoods(q);
        setResults(foods);
        setIsOpen(foods.length > 0);
      } catch {
        setResults([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  });

  onCleanup(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  function handleSelect(food: FoodItem) {
    props.onSelect(food);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  }

  function handleBlur() {
    setTimeout(() => setIsOpen(false), 200);
  }

  function handleFocus() {
    if (results().length > 0) setIsOpen(true);
  }

  return (
    <div class="relative">
      <div class="relative">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-metabo-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          class="input-field w-full pl-10"
          placeholder="Search foods..."
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <Show when={loading()}>
          <div class="absolute right-3 top-1/2 -translate-y-1/2">
            <div class="w-4 h-4 border-2 border-metabo-glow/30 border-t-metabo-glow rounded-full animate-spin" />
          </div>
        </Show>
      </div>

      <Show when={isOpen() && results().length > 0}>
        <div class="absolute z-50 top-full left-0 right-0 mt-1 glass-card max-h-64 overflow-y-auto">
          <For each={results()}>
            {(food) => (
              <button
                class="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-metabo-surface/80 transition-colors duration-150 text-left border-b border-metabo-border/50 last:border-b-0"
                onClick={() => handleSelect(food)}
              >
                <div class="flex-1 min-w-0">
                  <div class="font-body text-sm text-metabo-text truncate">{food.name}</div>
                  <div class="font-body text-xs text-metabo-muted truncate">{food.nameEn}</div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span class="badge-low">{food.category}</span>
                  <span class={giBadge(food.gi)}>{giLabel(food.gi)}</span>
                </div>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
