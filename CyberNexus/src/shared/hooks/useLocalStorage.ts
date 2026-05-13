import { createSignal, createEffect } from 'solid-js';

interface UseLocalStorageOptions<T> {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {}
): [() => T, (value: T) => void] {
  const serializer = options.serializer ?? JSON.stringify;
  const deserializer = options.deserializer ?? JSON.parse;

  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserializer(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = createSignal<T>(readValue());

  const setValue = (value: T) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue()) : value;
      setStoredValue(() => valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, serializer(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  createEffect(() => {
    setStoredValue(() => readValue());
  });

  return [storedValue, setValue];
}
