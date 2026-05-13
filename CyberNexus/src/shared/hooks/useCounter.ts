import { createSignal } from 'solid-js';

interface UseCounterOptions {
  min?: number;
  max?: number;
}

export function useCounter(initialValue = 0, options: UseCounterOptions = {}) {
  const [count, setCount] = createSignal(initialValue);

  const increment = () => {
    setCount(c => {
      if (options.max !== undefined && c >= options.max) return c;
      return c + 1;
    });
  };

  const decrement = () => {
    setCount(c => {
      if (options.min !== undefined && c <= options.min) return c;
      return c - 1;
    });
  };

  const reset = () => setCount(initialValue);

  const set = (value: number) => {
    let newValue = value;
    if (options.min !== undefined) newValue = Math.max(options.min, newValue);
    if (options.max !== undefined) newValue = Math.min(options.max, newValue);
    setCount(newValue);
  };

  return {
    count,
    increment,
    decrement,
    reset,
    set,
  };
}
