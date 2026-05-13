import { createSignal, createEffect, onCleanup } from 'solid-js';

interface UseAsyncOptions<T> {
  initialValue?: T;
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseAsyncResult<T> {
  data: () => T | undefined;
  loading: () => boolean;
  error: () => Error | null;
  execute: (...args: unknown[]) => Promise<T>;
  reset: () => void;
}

export function useAsync<T>(
  fn: (...args: unknown[]) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncResult<T> {
  const [data, setData] = createSignal<T | undefined>(options.initialValue);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);

  let isMounted = true;

  const execute = async (...args: unknown[]): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const result = await fn(...args);
      if (isMounted) {
        setData(() => result);
        options.onSuccess?.(result);
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (isMounted) {
        setError(() => error);
        options.onError?.(error);
      }
      throw error;
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const reset = () => {
    setData(undefined);
    setError(null);
    setLoading(false);
  };

  createEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  });

  onCleanup(() => {
    isMounted = false;
  });

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}
