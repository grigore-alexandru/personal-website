// src/components/VideoCarousel.tsx

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Video } from '../types';
import { designTokens } from '../styles/tokens';

interface VideoCarouselProps {
  videos: Video[];
}

const VideoCarousel: React.FC<VideoCarouselProps> = ({ videos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const instaContainerRef = useRef<HTMLDivElement>(null);

  const goToPrevious = () =>
    setCurrentIndex(i => (i === 0 ? videos.length - 1 : i - 1));
  const goToNext = () =>
    setCurrentIndex(i => (i === videos.length - 1 ? 0 : i + 1));

  const handleVideoPlay = (video: Video) => {
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'video_play',
        video_title: video.title,
        video_platform: video.platform,
      });
    }
  };

  // Whenever the slide changes and it's Instagram, re-hydrate the embed
  useEffect(() => {
    if (videos[currentIndex]?.platform === 'instagram' && window.instgrm) {
      // Instagram recommends a small delay after injecting the <blockquote>
      setTimeout(() => {
        window.instgrm.Embeds.process();
      }, 50);
    }
  }, [currentIndex, videos]);

  const renderSlide = (video: Video, index: number) => {
    const isActive = index === currentIndex;
    const baseClasses = `
      absolute inset-0 transition-opacity duration-500
      ${isActive ? 'opacity-100' : 'opacity-0'}
    `;

    if (video.platform === 'instagram') {
      return (
        <div key={index} className={baseClasses}>
          <div
            ref={instaContainerRef}
            className="instagram-container w-full h-full flex items-center justify-center"
            dangerouslySetInnerHTML={{
              __html: `
                <blockquote
                  class="instagram-media"
                  data-instgrm-permalink="${video.link}"
                  data-instgrm-version="14"
                  style="background:#FFF; border:0; border-radius:3px;
                         box-shadow:0 0 1px 0 rgba(0,0,0,0.5),
                         0 1px 10px 0 rgba(0,0,0,0.15);
                         margin:1px; max-width:540px;
                         min-width:326px; padding:0;
                         width:99.375%;
                         width:-webkit-calc(100% - 2px);
                         width:calc(100% - 2px);">
                </blockquote>`
            }}
          />
        </div>
      );
    }

    // Default to iframe (YouTube, Vimeo…)
    return (
      <div key={index} className={baseClasses}>
        <iframe
          src={video.link}
          title={video.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media;
                 gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => handleVideoPlay(video)}
        />
      </div>
    );
  };

  if (!videos.length) return null;

  return (
    <div className="relative">
      {/* Carousel Viewport */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {videos.map(renderSlide)}

        {/* Play Button (for iframe only) */}
        {videos[currentIndex].platform !== 'instagram' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              onClick={() => handleVideoPlay(videos[currentIndex])}
              className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full
                         flex items-center justify-center hover:bg-white/30
                         transition-colors pointer-events-auto"
            >
              <Play size={24} className="text-white ml-1" />
            </button>
          </div>
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

      {/* Dots */}
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

      {/* Title & Platform Label */}
      <div className="mt-4">
        <h3
          className="text-lg font-bold"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.bold,
            lineHeight: designTokens.typography.lineHeights.heading,
          }}
        >
          {videos[currentIndex].title}
        </h3>
        <p
          className="text-sm mt-1"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.regular,
            color: designTokens.colors.textSecondary,
          }}
        >
          {videos[currentIndex].platform.toUpperCase()}
        </p>
      </div>
    </div>
  );
};

// Ensure TypeScript knows about the global `instgrm`
declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

export default VideoCarousel;