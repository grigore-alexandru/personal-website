'use client';

import { useEffect } from 'react';

/** Scrolls the window to the top whenever this component mounts.
 *  Drop it anywhere inside a Server Component page to guarantee the
 *  page opens at the top after client-side navigation. */
export default function ScrollToTop() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return null;
}
