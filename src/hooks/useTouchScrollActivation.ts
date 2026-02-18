import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Detects touch-capable devices using the most reliable heuristic available.
 *
 * We use `maxTouchPoints > 0` as the primary signal (supported in every modern
 * browser) and fall back to the older `ontouchstart` property.  We deliberately
 * avoid relying on pointer media queries alone because some hybrid
 * (laptop-with-touch) devices report both "coarse" and "fine" pointers.
 */
function isTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    navigator.maxTouchPoints > 0 ||
    // Legacy fallback for very old Android browsers
    ('ontouchstart' in window)
  );
}

/**
 * Returns `true` when the *vertical centre* of `rect` is within `tolerance`
 * pixels of the viewport's vertical midpoint.
 *
 * @param rect       - The element's DOMRect (from getBoundingClientRect)
 * @param tolerance  - Half-window around the midpoint that counts as "at center"
 */
function isAtViewportCenter(rect: DOMRect, tolerance: number): boolean {
  const viewportMid = window.innerHeight / 2;
  const elementMid  = rect.top + rect.height / 2;
  return Math.abs(elementMid - viewportMid) <= tolerance;
}

interface UseTouchScrollActivationOptions {
  /**
   * How many pixels either side of exact centre still counts as "centred".
   * Defaults to one-quarter of the viewport height, which works well for
   * both portrait (tall) and landscape (short) orientations.
   */
  tolerance?: number;
  /**
   * Whether the activated state should linger until *another* element
   * is centred, or whether it clears the moment the element leaves the
   * centre zone.  Defaults to `false` (clears when element leaves zone).
   */
  sticky?: boolean;
}

/**
 * useTouchScrollActivation
 *
 * On touch devices this hook watches the scroll position and returns `true`
 * whenever the host element passes through the vertical centre of the viewport.
 * On non-touch devices it always returns `false` so that normal CSS :hover
 * continues to work without interference.
 *
 * Performance notes
 * -----------------
 * • The scroll listener is attached to `window` with `passive: true` so it
 *   never blocks the browser's native scroll handling.
 * • `requestAnimationFrame` throttling ensures we do at most one
 *   `getBoundingClientRect` call per rendered frame regardless of how many
 *   scroll events fire in that interval.
 * • Each component instance only runs its own rAF loop while mounted, and
 *   cancels it on unmount.
 *
 * @param tolerance - pixels of leeway around viewport centre (default: vh/4)
 * @param sticky    - keep active state until another element takes over
 */
export function useTouchScrollActivation(
  options: UseTouchScrollActivationOptions = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const { sticky = false } = options;

  const elementRef   = useRef<HTMLDivElement>(null);
  const rafId        = useRef<number | null>(null);
  const isTouch      = useRef<boolean>(isTouchDevice());
  const [isActive, setIsActive] = useState(false);

  const checkPosition = useCallback(() => {
    if (!elementRef.current) return;

    // Tolerance defaults to 25 % of the current viewport height so it adapts
    // automatically when the device is rotated between portrait and landscape.
    const tolerance = options.tolerance ?? window.innerHeight / 4;
    const rect      = elementRef.current.getBoundingClientRect();
    const centred   = isAtViewportCenter(rect, tolerance);

    setIsActive(prev => {
      if (sticky) {
        // In sticky mode only ever turn on; turning off is handled externally.
        return centred ? true : prev;
      }
      return centred;
    });
  }, [options.tolerance, sticky]);

  useEffect(() => {
    if (!isTouch.current) return;

    const onScroll = () => {
      if (rafId.current !== null) return;
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        checkPosition();
      });
    };

    // Run once immediately to handle elements already near centre on mount.
    checkPosition();

    window.addEventListener('scroll', onScroll, { passive: true });

    // Also re-check on orientation change (portrait ↔ landscape).
    window.addEventListener('orientationchange', checkPosition, { passive: true });
    window.addEventListener('resize',            checkPosition, { passive: true });

    return () => {
      window.removeEventListener('scroll',            onScroll);
      window.removeEventListener('orientationchange', checkPosition);
      window.removeEventListener('resize',            checkPosition);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [checkPosition]);

  // On non-touch devices, never activate (always returns false).
  if (!isTouch.current) {
    return [elementRef, false];
  }

  return [elementRef, isActive];
}
