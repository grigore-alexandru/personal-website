'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
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

  // 1. Preluăm valoarea inițială din URL
  const urlValue = searchParams.get(key) ?? defaultValue;

  // 2. Creăm o stare locală pentru a actualiza interfața INSTANTANEU
  const [localValue, setLocalValue] = useState<FilterValue>(urlValue);

  // 3. Sincronizăm starea locală dacă URL-ul se schimbă din altă parte 
  // (ex: butonul "Back" din browser sau funcția de "Clear Filters")
  useEffect(() => {
    setLocalValue(searchParams.get(key) ?? defaultValue);
  }, [searchParams, key, defaultValue]);

  const setValue = useCallback(
    (newValue: FilterValue) => {
      // Actualizăm starea locală IMEDIAT pentru un scris fluid
      setLocalValue(newValue);

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

      // Aplicăm debounce-ul DOAR pe funcția care modifică router-ul (URL-ul)
      if (debounce) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(apply, 300);
      } else {
        apply();
      }
    },
    [key, defaultValue, debounce, searchParams, pathname, router]
  );

  // 4. Returnăm localValue în loc de valoarea brută din URL
  return [localValue, setValue];
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