'use client';

import { useEffect, useRef } from 'react';

interface InterstitialShellProps {
  /** Self-contained HTML (with inline <style>/<script>) authored in the admin. */
  code: string;
  /** Where the visitor ends up. Never enters the iframe. */
  destination: string;
  /** Hard ceiling, 1–30s, after which we navigate regardless. */
  fallbackSeconds: number;
}

/** The one message the sandboxed code may send us. */
const READY_MESSAGE = 'interstitial:ready';

/**
 * Hosts an admin-authored interstitial animation, then forwards the visitor.
 *
 * Two properties matter here and both are load-bearing:
 *
 * 1. The iframe is `sandbox="allow-scripts"` with NO `allow-same-origin`. That
 *    combination puts the code in an opaque origin: it cannot read cookies or
 *    localStorage, cannot touch the parent DOM, and cannot navigate the top
 *    level. It can only run and paint.
 *
 * 2. The destination lives only in this component's closure and is never
 *    injected into the iframe. The interstitial's entire vocabulary is one
 *    message: `parent.postMessage('interstitial:ready', '*')`.
 *
 * Together those mean a broken or hostile interstitial has exactly one failure
 * mode available to it — failing to signal — which the fallback timer already
 * covers. It can never send a visitor somewhere unintended, and changing a
 * destination later never requires touching interstitial code.
 */
export function InterstitialShell({ code, destination, fallbackSeconds }: InterstitialShellProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
    const go = () => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      // `replace`, not `href`: pressing Back must return the visitor to wherever
      // they came from, not bounce them into the animation again.
      window.location.replace(destination);
    };

    const onMessage = (event: MessageEvent) => {
      // The sandbox is an opaque origin, so `event.origin` is the string "null"
      // and useless for validation. Identity comes from the source window
      // itself: only our own iframe can be this exact WindowProxy.
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data !== READY_MESSAGE) return;
      go();
    };

    window.addEventListener('message', onMessage);
    const timer = window.setTimeout(go, Math.max(1, fallbackSeconds) * 1000);

    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
    };
  }, [destination, fallbackSeconds]);

  return (
    <>
      <noscript>
        <meta httpEquiv="refresh" content={`0;url=${destination}`} />
      </noscript>

      <iframe
        ref={iframeRef}
        srcDoc={code}
        sandbox="allow-scripts"
        title="Redirecting"
        className="fixed inset-0 w-full h-full border-0"
      />
    </>
  );
}
