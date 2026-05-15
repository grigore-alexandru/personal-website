'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type FilterValue = string;

export function useUrlFilter(key: string, defaultValue: FilterValue): [FilterValue, (value: FilterValue) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (newValue: FilterValue) => {
      const next = new URLSearchParams(searchParams.toString());
      if (!newValue || newValue === defaultValue) {
        next.delete(key);
      } else {
        next.set(key, newValue);
      }
      router.replace(`${pathname}?${next.toString()}`);
    },
    [key, defaultValue, searchParams, pathname, router]
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
    router.replace(`${pathname}?${next.toString()}`);
  }, [keys, searchParams, pathname, router]);
}
