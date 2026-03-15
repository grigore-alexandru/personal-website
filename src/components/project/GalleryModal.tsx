import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  const tm = url.match(/[?&]t=(\d+)/);
  if (tm) start = parseInt(tm[1], 10);
  return { videoId, start };
};

const getVimeoEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/);
  const videoId = m ? m[1] : null;
  if (videoId) {
    return `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479`;
  }
  return url;
};

interface GalleryModalProps {
  items: ProjectContentItem[];
  initialIndex: number;
  onClose: () => void;
}

const GalleryModal: React.FC<GalleryModalProps> = ({ items, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const instaRef = useRef<HTMLDivElement>(null);

  const active = items[currentIndex]?.content;
  const isImage = active
    ? active.content_type?.slug === 'image' || (!active.platform && !active.format)
    : false;
  const isYoutube = active
    ? !isImage && (active.platform === 'youtube' || active.url.includes('youtube.com') || active.url.includes('youtu.be'))
    : false;
  const isVimeo = active
    ? !isImage && !isYoutube && (active.platform === 'vimeo' || active.url.includes('vimeo.com'))
    : false;
  const isInstagram = active ? active.platform === 'instagram' : false;

  const youtubeDetails = isYoutube && active ? getYoutubeDetails(active.url) : { videoId: null, start: undefined };
  const vimeoUrl = isVimeo && active ? getVimeoEmbedUrl(active.url) : null;

  const goTo = useCallback((index: number, dir: number) => {
    setDirection(dir);
    setCurrentIndex(index);
    setMediaLoading(true);
    setMediaError(false);
  }, []);

  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    goTo(newIndex, -1);
  }, [currentIndex, items.length, goTo]);

  const goToNext = useCallback(() => {
    const newIndex = currentIndex === items.length - 1 ? 0 : currentIndex + 1;
    goTo(newIndex, 1);
  }, [currentIndex, items.length, goTo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrevious, goToNext]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (isInstagram && active && instaRef.current) {
      instaRef.current.innerHTML = '';
      const block = document.createElement('blockquote');
      block.className = 'instagram-media';
      block.setAttribute('data-instgrm-permalink', active.url);
      block.setAttribute('data-instgrm-version', '14');
      block.style.cssText =
        'background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15); margin:1px; max-width:540px; min-width:326px; padding:0; width:calc(100% - 2px);';
      instaRef.current.appendChild(block);
      setTimeout(() => window.instgrm?.Embeds.process(), 100);
    }
  }, [currentIndex, isInstagram, active]);

  if (!active) return null;

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      role="dialog"
      aria-modal="true"
      aria-label="Gallery viewer"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0 z-10">
        <span
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontSize: designTokens.typography.sizes.xxs,
            fontWeight: designTokens.typography.weights.medium,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {currentIndex + 1} / {items.length}
        </span>

        <button
          onClick={onClose}
          aria-label="Close gallery"
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.16)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
        >
          <X size={18} color="white" />
        </button>
      </div>

      {/* Media area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0">
        {/* Prev arrow */}
        {items.length > 1 && (
          <button
            onClick={goToPrevious}
            aria-label="Previous item"
            className="absolute left-3 sm:left-6 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.22)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          >
            <ChevronLeft size={22} color="white" />
          </button>
        )}

        {/* Media container */}
        <div className="w-full h-full flex items-center justify-center px-16 sm:px-20 relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full h-full flex items-center justify-center"
              style={{ willChange: 'transform' }}
            >
              {isImage ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {mediaLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <Spinner />
                    </div>
                  )}
                  <img
                    src={active.url}
                    alt={active.title}
                    className="max-w-full max-h-full object-contain"
                    style={{
                      maxHeight: 'calc(100vh - 160px)',
                      opacity: mediaLoading ? 0 : 1,
                      transition: 'opacity 0.3s ease',
                    }}
                    onLoad={() => setMediaLoading(false)}
                    onError={() => { setMediaError(true); setMediaLoading(false); }}
                    loading="eager"
                    decoding="async"
                  />
                  {mediaError && <MediaErrorFallback url={active.url} />}
                </div>
              ) : isInstagram ? (
                <div
                  ref={instaRef}
                  className="w-full max-w-lg flex items-center justify-center overflow-auto"
                />
              ) : (
                <div
                  className="relative w-full"
                  style={{ maxHeight: 'calc(100vh - 160px)' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      paddingBottom: active.format === 'portrait' ? '177.78%' : '56.25%',
                      height: 0,
                      maxWidth: active.format === 'portrait' ? '360px' : '100%',
                      margin: '0 auto',
                    }}
                  >
                    {mediaLoading && !mediaError && (
                      <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: 'rgba(20,20,20,0.8)', borderRadius: '8px' }}>
                        <Spinner />
                      </div>
                    )}

                    {mediaError ? (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(20,20,20,0.9)', borderRadius: '8px' }}>
                        <MediaErrorFallback url={active.url} />
                      </div>
                    ) : isYoutube && youtubeDetails.videoId ? (
                      <YouTube
                        videoId={youtubeDetails.videoId}
                        className="absolute inset-0 w-full h-full"
                        iframeClassName="absolute inset-0 w-full h-full rounded-lg"
                        opts={{
                          height: '100%',
                          width: '100%',
                          playerVars: {
                            autoplay: 0,
                            modestbranding: 1,
                            rel: 0,
                            start: youtubeDetails.start,
                          },
                        }}
                        onReady={() => setMediaLoading(false)}
                        onError={() => { setMediaError(true); setMediaLoading(false); }}
                      />
                    ) : (
                      <iframe
                        src={vimeoUrl || active.url}
                        title={active.title}
                        className="absolute inset-0 w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        onLoad={() => setMediaLoading(false)}
                        onError={() => { setMediaError(true); setMediaLoading(false); }}
                      />
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next arrow */}
        {items.length > 1 && (
          <button
            onClick={goToNext}
            aria-label="Next item"
            className="absolute right-3 sm:right-6 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.22)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          >
            <ChevronRight size={22} color="white" />
          </button>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="flex-shrink-0 px-4 sm:px-8 py-5 text-center z-10">
        <h3
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontSize: designTokens.typography.sizes.xs,
            fontWeight: designTokens.typography.weights.semibold,
            color: 'rgba(255,255,255,0.9)',
            lineHeight: designTokens.typography.lineHeights.heading,
          }}
        >
          {active.title}
        </h3>
        {active.caption && (
          <p
            className="mt-1"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontSize: designTokens.typography.sizes.xxs,
              fontWeight: designTokens.typography.weights.regular,
              color: 'rgba(255,255,255,0.4)',
              lineHeight: designTokens.typography.lineHeights.body,
            }}
          >
            {active.caption}
          </p>
        )}

        {items.length > 1 && (
          <div className="flex justify-center mt-4 gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > currentIndex ? 1 : -1)}
                aria-label={`Go to item ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === currentIndex ? '20px' : '6px',
                  height: '6px',
                  backgroundColor: i === currentIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Spinner: React.FC = () => (
  <div
    className="rounded-full border-2 animate-spin"
    style={{
      width: 36,
      height: 36,
      borderColor: 'rgba(255,255,255,0.15)',
      borderTopColor: 'rgba(255,255,255,0.8)',
    }}
  />
);

const MediaErrorFallback: React.FC<{ url: string }> = ({ url }) => (
  <div className="text-center px-6">
    <p
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: '14px',
        color: 'rgba(255,255,255,0.5)',
        marginBottom: '12px',
      }}
    >
      Unable to load media
    </p>
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: '12px',
        color: 'rgba(255,255,255,0.7)',
        textDecoration: 'underline',
      }}
    >
      Open in new tab
    </a>
  </div>
);

export default GalleryModal;
