'use client';

import { useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type FilterValue = string;

export function useUrlFilter(
  key: string,
  defaultValue: FilterValue,
  debounce = false
): [FilterValue, (value: FilterValue) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (newValue: FilterValue) => {
      const apply = () => {
        const next = new URLSearchParams(searchParams.toString());
        if (!newValue || newValue === defaultValue) {
          next.delete(key);
        } else {
          next.set(key, newValue);
        }
        const qs = next.toString();
        router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
      };

      if (debounce) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(apply, 300);
      } else {
        apply();
      }
    },
    [key, defaultValue, debounce, searchParams, pathname, router]
  );

  return [value, setValue];
}

export function useClearUrlFilters(keys: string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    keys.forEach((k) => next.delete(k));
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [keys, searchParams, pathname, router]);
}
