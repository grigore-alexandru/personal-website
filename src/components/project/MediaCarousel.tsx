'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import YouTube from 'react-youtube';
import { ProjectContentItem } from '../../types';
import { designTokens } from '../../styles/tokens';
import GalleryModal from './GalleryModal';

// --- Helper Functions ---

const getYoutubeDetails = (url: string): { videoId: string | null; start: number | undefined } => {
  if (!url) return { videoId: null, start: undefined };

  let videoId: string | null = null;

  if (url.includes('/shorts/')) {
    const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) videoId = shortsMatch[1];
  }

  if (!videoId) {
    const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    videoId = match && match[1].length === 11 ? match[1] : null;
  }

  let start: number | undefined;
  const timeMatch = url.match(/[?&]t=(\d+)/);
  if (timeMatch) start = parseInt(timeMatch[1], 10);

  return { videoId, start };
};

const getVimeoEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/);
  const videoId = match ? match[1] : null;
  if (videoId) {
    return `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479`;
  }
  return url;
};

// --- Component ---

interface MediaCarouselProps {
  items: ProjectContentItem[];
}

const MediaCarousel: React.FC<MediaCarouselProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const instaRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
    setIframeError(false);
    setIframeLoading(true);
    setImageLoaded(false);
  }, [currentIndex]);

  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    setDirection(-1);
    setCurrentIndex(newIndex);
    setIframeError(false);
    setIframeLoading(true);
    setImageLoaded(false);
  }, [currentIndex, items.length]);

  const goToNext = useCallback(() => {
    const newIndex = currentIndex === items.length - 1 ? 0 : currentIndex + 1;
    setDirection(1);
    setCurrentIndex(newIndex);
    setIframeError(false);
    setIframeLoading(true);
    setImageLoaded(false);
  }, [currentIndex, items.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalOpen) return;
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, modalOpen]);

  useEffect(() => {
    const active = items[currentIndex]?.content;
    if (active?.platform === 'instagram' && instaRef.current) {
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
  }, [currentIndex, items]);

  if (!items.length) return null;

  const active = items[currentIndex].content;

  const isImage = active.content_type?.slug === 'image' || (!active.platform && !active.format);
  const isYoutube = !isImage && (active.platform === 'youtube' || active.url.includes('youtube.com') || active.url.includes('youtu.be'));
  const isVimeo = !isImage && !isYoutube && (active.platform === 'vimeo' || active.url.includes('vimeo.com'));

  const youtubeDetails = isYoutube ? getYoutubeDetails(active.url) : { videoId: null, start: undefined };
  const vimeoUrl = isVimeo ? getVimeoEmbedUrl(active.url) : active.url;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <>
      <div className="relative">
        <div
          className="relative overflow-hidden rounded-lg bg-neutral-950 mx-auto w-full"
          style={{ aspectRatio: '16 / 9' }}
        >
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {isImage ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {!imageLoaded && (
                    <div
                      className="absolute inset-0 flex items-center justify-center z-10"
                      style={{ transition: 'opacity 300ms ease', opacity: imageLoaded ? 0 : 1 }}
                    >
                      <div
                        className="rounded-full animate-spin"
                        style={{
                          width: 36,
                          height: 36,
                          border: '2px solid rgba(255,255,255,0.15)',
                          borderTopColor: 'rgba(255,255,255,0.75)',
                        }}
                      />
                    </div>
                  )}
                  <img
                    src={active.url}
                    alt={active.title}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                    style={{
                      opacity: imageLoaded ? 1 : 0,
                      transition: 'opacity 400ms ease',
                    }}
                    onLoad={() => setImageLoaded(true)}
                  />
                </div>
              ) : active.platform === 'instagram' ? (
                <div
                  ref={instaRef}
                  className="w-full h-full flex items-center justify-center"
                />
              ) : (
                <div className="w-full h-full relative">
                  {iframeLoading && !iframeError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
                    </div>
                  )}

                  {iframeError ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-white px-4 z-10">
                      <div className="text-center">
                        <p className="mb-2">Unable to load video</p>
                        <a
                          href={active.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline hover:text-gray-300"
                        >
                          Open in new tab
                        </a>
                      </div>
                    </div>
                  ) : isYoutube && youtubeDetails.videoId ? (
                    <YouTube
                      videoId={youtubeDetails.videoId}
                      className="w-full h-full"
                      iframeClassName="w-full h-full"
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
                      onReady={() => setIframeLoading(false)}
                      onError={() => {
                        setIframeError(true);
                        setIframeLoading(false);
                      }}
                    />
                  ) : (
                    <iframe
                      src={vimeoUrl || ''}
                      title={active.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onLoad={() => setIframeLoading(false)}
                      onError={() => {
                        setIframeError(true);
                        setIframeLoading(false);
                      }}
                    />
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {items.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                aria-label="Previous"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={20} className="text-white" />
              </button>
              <button
                onClick={goToNext}
                aria-label="Next"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronRight size={20} className="text-white" />
              </button>
            </>
          )}

          {/* Expand / fullscreen button */}
          <button
            onClick={() => setModalOpen(true)}
            aria-label="View fullscreen"
            className="absolute top-3 right-3 z-20 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
          >
            <Maximize2 size={14} className="text-white" />
          </button>
        </div>

        <div className="mt-5 text-center">
          <h3
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontSize: designTokens.typography.sizes.sm,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
              color: designTokens.colors.textPrimary,
            }}
          >
            {active.title}
          </h3>
          {active.caption && (
            <p
              className="mt-1"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.xs,
                fontWeight: designTokens.typography.weights.regular,
                color: designTokens.colors.textSecondary,
                lineHeight: designTokens.typography.lineHeights.body,
              }}
            >
              {active.caption}
            </p>
          )}
        </div>

        {items.length > 1 && (
          <div className="flex justify-center mt-4 gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to item ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? 'bg-black scale-125'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <GalleryModal
            items={items}
            initialIndex={currentIndex}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

export default MediaCarousel;
