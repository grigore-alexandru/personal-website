'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  eager?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  onLoad?: () => void;
  style?: React.CSSProperties;
  /* Optional responsive-size hint for next/image's srcset generation. Every
     call site renders this absolutely-positioned inside a sized, relatively
     positioned parent (grid cards, etc.), so a generic default is a
     reasonable fallback where a caller doesn't know its exact grid width. */
  sizes?: string;
}

/*
 * Was previously a raw <img> driven by a manually-created `new Image()` in a
 * useEffect purely to detect load state. That meant every thumbnail across
 * the site (portfolio grid, content grid, blog list, admin cards) shipped
 * whatever full-resolution file was uploaded, with no resizing, no format
 * conversion (WebP/AVIF), and no real responsive srcset — a major
 * contributor to page weight on the listing pages, which render many of
 * these at once.
 *
 * Now backed by next/image: automatic resizing/format conversion via
 * Netlify's Image CDN, real srcset, and native lazy-loading — while keeping
 * the exact same external API so none of the 6 call sites need to change.
 */
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  skeletonClassName = '',
  eager = false,
  fetchPriority,
  onLoad,
  style,
  sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw',
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const isPriority = eager || fetchPriority === 'high';

  return (
    <>
      <div
        className={`absolute inset-0 skeleton-shimmer transition-opacity duration-300 ${
          loaded || error ? 'opacity-0 pointer-events-none' : 'opacity-100'
        } ${skeletonClassName}`}
      />

      {!error && src && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={isPriority}
          loading={isPriority ? undefined : 'lazy'}
          className={`transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          style={style}
          onLoad={() => {
            setLoaded(true);
            onLoad?.();
          }}
          onError={() => {
            setError(true);
            onLoad?.();
          }}
        />
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
          <span className="text-neutral-400 text-xs">Failed to load</span>
        </div>
      )}
    </>
  );
};
