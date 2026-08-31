'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { SITE_URL } from '../../config/site';

/** The canonical public URL for a slug — the string that gets printed. */
export function shortLinkFor(slug: string): string {
  return `${SITE_URL}/r/${slug}`;
}

interface ShortLinkDisplayProps {
  slug: string;
  onCopied?: () => void;
  onCopyFailed?: (message: string) => void;
}

/**
 * Read-only short link with a copy button.
 *
 * Always shows the production URL even in development: this is the string that
 * ends up on a business card or inside a QR code, so showing a localhost
 * variant would be actively misleading.
 */
export function ShortLinkDisplay({ slug, onCopied, onCopyFailed }: ShortLinkDisplayProps) {
  const [copied, setCopied] = useState(false);
  const url = shortLinkFor(slug);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onCopyFailed?.('Clipboard access was blocked — copy the link manually');
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <code className="px-2.5 py-1.5 bg-neutral-100 border border-neutral-200 rounded-lg text-sm text-neutral-800 truncate font-mono">
        {url}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : 'Copy short link'}
        className="p-1.5 rounded-lg text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors flex-shrink-0"
      >
        {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
      </button>
    </div>
  );
}
