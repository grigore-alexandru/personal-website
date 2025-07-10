
// src/components/VideoCarousel.tsx

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Video } from '../types';
import { designTokens } from '../styles/tokens';

interface VideoCarouselProps {
  videos: Video[];
}

const VideoCarousel: React.FC<VideoCarouselProps> = ({ videos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const instaRef = useRef<HTMLDivElement>(null);

  const goToPrevious = () =>
    setCurrentIndex(i => (i === 0 ? videos.length - 1 : i - 1));
  const goToNext = () =>
    setCurrentIndex(i => (i === videos.length - 1 ? 0 : i + 1));

  // Whenever we switch to an Instagram slide, clear & re-hydrate it
  useEffect(() => {
    const active = videos[currentIndex];
    if (active.platform === 'instagram' && instaRef.current) {
      // clear any previous content
      instaRef.current.innerHTML = '';
      // inject blockquote
      const block = document.createElement('blockquote');
      block.className = 'instagram-media';
      block.setAttribute('data-instgrm-permalink', active.link);
      block.setAttribute('data-instgrm-version', '14');
      block.style.cssText = `
        background:#FFF; border:0; border-radius:3px;
        box-shadow:0 0 1px 0 rgba(0,0,0,0.5),
                   0 1px 10px 0 rgba(0,0,0,0.15);
        margin:1px; max-width:540px; min-width:326px;
        padding:0; width:calc(100% - 2px);
      `;
      instaRef.current.appendChild(block);

      // give Instagram script a moment to find the new blockquote
      setTimeout(() => {
        window.instgrm?.Embeds.process();
      }, 100);
    }
  }, [currentIndex, videos]);

  if (!videos.length) return null;

  const active = videos[currentIndex];

  return (
    <div className="relative">
      {/* Carousel Viewport */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {active.platform === 'instagram' ? (
          <div
            ref={instaRef}
            className="instagram-container w-full h-full flex items-center justify-center"
          />
        ) : (
          <iframe
            key={active.link}
            src={active.link}
            title={active.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      {/* Navigation Arrows */}
      {videos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2
                       w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full
                       flex items-center justify-center transition-colors z-10"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2
                       w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full
                       flex items-center justify-center transition-colors z-10"
          >
            <ChevronRight size={20} className="text-white" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {videos.length > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          {videos.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? 'bg-black' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Title & Platform */}
      <div className="mt-4 text-center">
        <h3
          className="text-lg font-bold"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.bold,
            lineHeight: designTokens.typography.lineHeights.heading,
          }}
        >
          {active.title}
        </h3>
        <p
          className="text-sm mt-1"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.regular,
            color: designTokens.colors.textSecondary,
          }}
        >
          {active.platform.toUpperCase()}
        </p>
      </div>
    </div>
  );
}

// Make TypeScript aware of the global Instagram script
declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

export default VideoCarousel;