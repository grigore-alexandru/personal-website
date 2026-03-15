import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import YouTube from 'react-youtube';
import { ProjectContentItem } from '../../types';
import { designTokens } from '../../styles/tokens';

const getYoutubeDetails = (url: string): { videoId: string | null; start: number | undefined } => {
  if (!url) return { videoId: null, start: undefined };
  let videoId: string | null = null;
  if (url.includes('/shorts/')) {
    const m = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (m) videoId = m[1];
  }
  if (!videoId) {
    const m = url.match(/^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    videoId = m && m[1].length === 11 ? m[1] : null;
  }
  let start: number | undefined;
  const timeMatch = url.match(/[?&]t=(\d+)/);
  if (timeMatch) start = parseInt(timeMatch[1], 10);
  return { videoId, start };
};

const getVimeoEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/);
  const videoId = m ? m[1] : null;
  if (videoId) return `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479`;
  return url;
};

interface GalleryModalProps {
  items: ProjectContentItem[];
  initialIndex: number;
  onClose: () => void;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

const MediaItem: React.FC<{ item: ProjectContentItem; onReady?: () => void }> = ({ item, onReady }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const instaRef = useRef<HTMLDivElement>(null);

  const c = item.content;
  const isImage = c.content_type?.slug === 'image' || (!c.platform && !c.format);
  const isPortrait = c.format === 'portrait';
  const isYoutube = !isImage && (c.platform === 'youtube' || (c.url?.includes('youtube.com') ?? false) || (c.url?.includes('youtu.be') ?? false));
  const isVimeo = !isImage && !isYoutube && (c.platform === 'vimeo' || (c.url?.includes('vimeo.com') ?? false));
  const isInstagram = c.platform === 'instagram';

  const youtubeDetails = isYoutube ? getYoutubeDetails(c.url) : { videoId: null, start: undefined };
  const vimeoUrl = isVimeo ? getVimeoEmbedUrl(c.url) : c.url;

  useEffect(() => {
    if (isInstagram && instaRef.current) {
      instaRef.current.innerHTML = '';
      const block = document.createElement('blockquote');
      block.className = 'instagram-media';
      block.setAttribute('data-instgrm-permalink', c.url);
      block.setAttribute('data-instgrm-version', '14');
      block.style.cssText =
        'background:#FFF;border:0;border-radius:3px;box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15);margin:1px;max-width:540px;min-width:326px;padding:0;width:calc(100% - 2px);';
      instaRef.current.appendChild(block);
      setTimeout(() => window.instgrm?.Embeds.process(), 100);
      setLoading(false);
      onReady?.();
    }
  }, [c.url, isInstagram, onReady]);

  const handleLoad = () => {
    setLoading(false);
    onReady?.();
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
    onReady?.();
  };

  if (isImage) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        )}
        <img
          src={c.url}
          alt={c.title}
          className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
            loading ? 'opacity-0' : 'opacity-100'
          } ${isPortrait ? 'h-full w-auto' : 'w-full h-auto'}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  if (isInstagram) {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-auto">
        <div ref={instaRef} className="w-full flex items-center justify-center" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}
      {error ? (
        <div className="text-center text-white/70 px-6">
          <p className="mb-3">Unable to load video</p>
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline hover:text-white transition-colors"
          >
            Open in new tab
          </a>
        </div>
      ) : isYoutube && youtubeDetails.videoId ? (
        <div className={`w-full ${isPortrait ? 'max-w-sm' : 'max-w-5xl'} mx-auto`}>
          <div style={{ aspectRatio: isPortrait ? '9/16' : '16/9' }}>
            <YouTube
              videoId={youtubeDetails.videoId}
              className="w-full h-full"
              iframeClassName="w-full h-full"
              opts={{
                height: '100%',
                width: '100%',
                playerVars: { autoplay: 0, modestbranding: 1, rel: 0, start: youtubeDetails.start },
              }}
              onReady={handleLoad}
              onError={handleError}
            />
          </div>
        </div>
      ) : (
        <div className={`w-full ${isPortrait ? 'max-w-sm' : 'max-w-5xl'} mx-auto`}>
          <div style={{ aspectRatio: isPortrait ? '9/16' : '16/9' }}>
            <iframe
              src={vimeoUrl || ''}
              title={c.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const GalleryModal: React.FC<GalleryModalProps> = ({ items, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [mediaReady, setMediaReady] = useState(false);

  const goTo = useCallback(
    (index: number, dir: number) => {
      setDirection(dir);
      setCurrentIndex(index);
      setMediaReady(false);
    },
    []
  );

  const goPrev = useCallback(() => {
    const next = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    goTo(next, -1);
  }, [currentIndex, items.length, goTo]);

  const goNext = useCallback(() => {
    const next = currentIndex === items.length - 1 ? 0 : currentIndex + 1;
    goTo(next, 1);
  }, [currentIndex, items.length, goTo]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const active = items[currentIndex].content;
  const total = items.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Gallery fullscreen viewer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-white/50 text-sm tabular-nums flex-shrink-0"
            style={{ fontFamily: designTokens.typography.fontFamily }}
          >
            {currentIndex + 1} of {total}
          </span>
          <span
            className="text-white text-sm font-medium truncate"
            style={{ fontFamily: designTokens.typography.fontFamily }}
          >
            {active.title}
          </span>
        </div>
        <button
          onClick={onClose}
          className="ml-4 flex-shrink-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Close gallery"
        >
          <X size={18} className="text-white" />
        </button>
      </div>

      {/* Media area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center px-14 sm:px-20">
        {!mediaReady && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        )}

        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0 flex items-center justify-center px-14 sm:px-20"
          >
            <MediaItem
              item={items[currentIndex]}
              onReady={() => setMediaReady(true)}
            />
          </motion.div>
        </AnimatePresence>

        {total > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
              aria-label="Previous item"
            >
              <ChevronLeft size={22} className="text-white" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
              aria-label="Next item"
            >
              <ChevronRight size={22} className="text-white" />
            </button>
          </>
        )}
      </div>

      {/* Caption */}
      {active.caption && (
        <div className="flex-shrink-0 px-6 py-3 text-center">
          <p
            className="text-white/50 text-sm"
            style={{ fontFamily: designTokens.typography.fontFamily }}
          >
            {active.caption}
          </p>
        </div>
      )}

      {/* Dot nav */}
      {total > 1 && total <= 20 && (
        <div className="flex-shrink-0 flex justify-center gap-1.5 py-4">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > currentIndex ? 1 : -1)}
              className={`rounded-full transition-all duration-200 ${
                i === currentIndex
                  ? 'w-5 h-1.5 bg-white'
                  : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to item ${i + 1}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

export default GalleryModal;
