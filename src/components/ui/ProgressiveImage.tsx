import React, { useState, useEffect, useRef } from 'react';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  eager?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  onLoad?: () => void;
  style?: React.CSSProperties;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  skeletonClassName = '',
  eager = false,
  fetchPriority,
  onLoad,
  style,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoaded(false);
    setError(false);

    if (!src) return () => { isMounted = false; };

    const img = new window.Image();
    img.src = src;

    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true);
      onLoad?.();
      return () => { isMounted = false; };
    }

    const handleLoad = () => {
      if (img.decode) {
        img.decode().then(() => {
          if (isMounted) {
            setLoaded(true);
            onLoad?.();
          }
        }).catch(() => {
          if (isMounted) {
            setLoaded(true);
            onLoad?.();
          }
        });
      } else if (isMounted) {
        setLoaded(true);
        onLoad?.();
      }
    };

    const handleError = () => {
      if (isMounted) {
        setError(true);
        onLoad?.();
      }
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      isMounted = false;
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src]);

  return (
    <>
      <div
        className={`absolute inset-0 skeleton-shimmer transition-opacity duration-300 ${
          loaded || error ? 'opacity-0 pointer-events-none' : 'opacity-100'
        } ${skeletonClassName}`}
      />

      {!error && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={fetchPriority}
          className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          style={style}
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
