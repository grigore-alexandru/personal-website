'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface PreviewValidation {
  ok: boolean;
  message?: string;
}

interface InterstitialPreviewProps {
  code: string;
  /** When provided, the preview reports back whether the code loaded cleanly. */
  onValidation?: (result: PreviewValidation) => void;
  className?: string;
  /** Debounce before the iframe is rebuilt, so typing doesn't thrash it. */
  debounceMs?: number;
}

const VALIDATION_CHANNEL = 'interstitial:validation';

/**
 * Injected ahead of the author's code when validating.
 *
 * It reports the first runtime error back to us, and otherwise reports success
 * once the frame has loaded. `interstitial:ready` is deliberately swallowed
 * here: in the editor a finished animation should just be visible, not
 * navigate anything.
 */
const validationPrelude = `<script>
(function () {
  var reported = false;
  function report(ok, message) {
    if (reported) return;
    reported = true;
    parent.postMessage({ channel: '${VALIDATION_CHANNEL}', ok: ok, message: message }, '*');
  }
  window.onerror = function (message) { report(false, String(message)); };
  window.addEventListener('unhandledrejection', function (e) {
    report(false, 'Unhandled promise rejection: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });
  window.addEventListener('load', function () { setTimeout(function () { report(true); }, 60); });
})();
</script>`;

/**
 * Renders interstitial code in the same sandbox the live redirector uses, so
 * what an author sees here is what a visitor gets — including the restrictions.
 */
export function InterstitialPreview({
  code,
  onValidation,
  className = '',
  debounceMs = 500,
}: InterstitialPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [debouncedCode, setDebouncedCode] = useState(code);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedCode(code), debounceMs);
    return () => window.clearTimeout(timer);
  }, [code, debounceMs]);

  const srcDoc = useMemo(
    () => (onValidation ? validationPrelude + debouncedCode : debouncedCode),
    [debouncedCode, onValidation]
  );

  useEffect(() => {
    if (!onValidation) return;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { channel?: string; ok?: boolean; message?: string };
      if (data?.channel !== VALIDATION_CHANNEL) return;
      onValidation({ ok: !!data.ok, message: data.message });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onValidation]);

  return (
    <iframe
      // Remounting on every code change guarantees a clean execution context:
      // without it, timers and listeners from the previous version survive.
      key={srcDoc.length + ':' + debouncedCode.slice(0, 32)}
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      title="Interstitial preview"
      className={`w-full h-full border-0 bg-white ${className}`}
    />
  );
}
