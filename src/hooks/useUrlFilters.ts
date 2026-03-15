import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

type FilterValue = string;

export function useUrlFilter(key: string, defaultValue: FilterValue): [FilterValue, (value: FilterValue) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (newValue: FilterValue) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!newValue || newValue === defaultValue) {
            next.delete(key);
          } else {
            next.set(key, newValue);
          }
          return next;
        },
        { replace: true }
      );
    },
    [key, defaultValue, setSearchParams]
  );

  return [value, setValue];
}

export function useClearUrlFilters(keys: string[]) {
  const [, setSearchParams] = useSearchParams();

  return useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        keys.forEach((k) => next.delete(k));
        return next;
      },
      { replace: true }
    );
  }, [keys, setSearchParams]);
}
