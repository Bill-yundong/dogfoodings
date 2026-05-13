import { createSignal, createEffect, onCleanup } from 'solid-js';

export function useDebounce<T>(value: () => T, delay: number): () => T {
  const [debouncedValue, setDebouncedValue] = createSignal(value());

  createEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(() => value());
    }, delay);

    onCleanup(() => clearTimeout(timer));
  });

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: number | null = null;

  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delay);
  };
}
