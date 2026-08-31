'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAutosaveFieldOptions<T> {
  initial: T;
  /** Returns an error message, or undefined when the value is acceptable. */
  validate?: (value: T) => string | undefined;
  save: (value: T) => Promise<void>;
  onError?: (message: string) => void;
}

/**
 * One inline-editable field that writes itself back on blur.
 *
 * Three rules make this predictable:
 * - An unchanged value never hits the network, so tabbing through a card is free.
 * - An invalid value never hits the network either; the error shows inline and
 *   `commit` reports failure, which is what blocks the card from collapsing.
 * - A failed save reverts the field to the last known-good value. Leaving the
 *   rejected text on screen would look saved when it isn't, and the card would
 *   then disagree with the database.
 */
export function useAutosaveField<T>({ initial, validate, save, onError }: UseAutosaveFieldOptions<T>) {
  const [value, setValue] = useState<T>(initial);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const savedRef = useRef<T>(initial);

  // Re-sync when the row changes underneath us (a reload, or another field's
  // save returning a fresh record).
  useEffect(() => {
    savedRef.current = initial;
    setValue(initial);
    setError(undefined);
  }, [initial]);

  const commit = useCallback(async (): Promise<boolean> => {
    if (value === savedRef.current) {
      setError(undefined);
      return true;
    }

    const validationError = validate?.(value);
    setError(validationError);
    if (validationError) return false;

    setSaving(true);
    try {
      await save(value);
      savedRef.current = value;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save that change';
      setValue(savedRef.current);
      setError(message);
      onError?.(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [value, validate, save, onError]);

  return {
    value,
    setValue,
    error,
    setError,
    saving,
    commit,
    dirty: value !== savedRef.current,
  };
}
