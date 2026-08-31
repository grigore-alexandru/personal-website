'use client';

import { useEffect } from 'react';

/**
 * The behaviour every overlay in the admin shares: Escape closes it, and the
 * page behind it stops scrolling while it is open.
 *
 * Lives in a hook rather than in a wrapper component so that Modal and
 * ConfirmDialog can each keep their own panel markup — ConfirmDialog has to
 * stay byte-identical to the hand-rolled dialogs it replaces.
 */
export function useModalBehavior(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);
}
