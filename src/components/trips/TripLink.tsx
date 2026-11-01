'use client';

import type { AnchorHTMLAttributes, MouseEvent } from 'react';

/**
 * In-app navigation without the server. Every trip screen is drawn in the browser from the plan it already holds
 * (see TripRouter), so changing the URL through the History API is enough: no request, no prefetch, and it works offline.
 * next/link would wait for a server round trip on each tab and prefetch every link on screen.
 */
export function tripGo(href: string) {
  window.history.pushState(null, '', href);
  const hash = new URL(href, window.location.href).hash.slice(1);
  if (!hash) {
    window.scrollTo(0, 0);
    return;
  }
  // the target appears once the new screen has rendered
  let tries = 0;
  const seek = () => {
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView();
    else if (tries++ < 20) requestAnimationFrame(seek);
  };
  requestAnimationFrame(seek);
}

export default function TripLink({ href, onClick, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab etc. stay native
    e.preventDefault();
    tripGo(href);
  };
  return (
    <a href={href} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
