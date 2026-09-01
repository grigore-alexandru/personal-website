'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * True while the page is scrolling down (past a small offset) on a narrow
 * viewport; false otherwise — including whenever the viewport is desktop
 * width, regardless of scroll direction. Built for the PDF viewer's own
 * toolbar, which should hide on scroll-down and reappear on scroll-up on
 * phones, the way native app toolbars do, but stay put on desktop.
 *
 * No existing pattern in this codebase does scroll-direction detection (the
 * codebase's other scroll listeners are all threshold-based — see
 * BlogPostScrollButton.tsx — not direction-based), so this is new.
 *
 * `scrollTarget` defaults to the window. Pass an element (e.g. the PDF
 * viewer's own fullscreen container) to track that element's scroll instead
 * — needed because a fullscreened element becomes its own scroll box, no
 * longer part of the window's scroll at all.
 */
export function useScrollDirection(
  mobileBreakpointPx = 768,
  hideAfterPx = 80,
  scrollTarget?: HTMLElement | null
) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const target: HTMLElement | Window = scrollTarget ?? window;
    const getY = () => (scrollTarget ? scrollTarget.scrollTop : window.scrollY);

    lastY.current = getY();

    const onScroll = () => {
      if (window.innerWidth >= mobileBreakpointPx) {
        setHidden(false);
        return;
      }

      const y = getY();
      const delta = y - lastY.current;

      // Ignore small jitter (momentum scrolling, rubber-banding) so the
      // toolbar doesn't flicker on tiny movements.
      if (Math.abs(delta) > 4) {
        setHidden(delta > 0 && y > hideAfterPx);
        lastY.current = y;
      }
    };

    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [mobileBreakpointPx, hideAfterPx, scrollTarget]);

  return hidden;
}
