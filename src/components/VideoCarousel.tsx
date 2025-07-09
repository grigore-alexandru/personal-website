import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Video } from '../types';
import { designTokens } from '../styles/tokens';

interface VideoCarouselProps {
  videos: Video[];
}

const VideoCarousel: React.FC<VideoCarouselProps> = ({ videos }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
  };

  const handleVideoPlay = (video: Video) => {
    // Analytics event
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'video_play',
        video_title: video.title,
        video_platform: video.platform,
      });
    }
  };

  // Load Instagram embed script when needed
  useEffect(() => {
    const hasInstagramVideo = videos.some(video => video.platform === 'instagram');
    
    if (hasInstagramVideo && typeof window !== 'undefined') {
      // Check if script is already loaded
      if (!document.querySelector('script[src="https://www.instagram.com/embed.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.instagram.com/embed.js';
        script.async = true;
        document.body.appendChild(script);
      } else {
        // If script exists, trigger Instagram embed processing
        if (window.instgrm) {
          window.instgrm.Embeds.process();
        }
      }
    }
  }, [videos]);

  // Re-process Instagram embeds when current video changes
  useEffect(() => {
    if (videos[currentIndex]?.platform === 'instagram' && typeof window !== 'undefined' && window.instgrm) {
      setTimeout(() => {
        window.instgrm.Embeds.process();
      }, 100);
    }
  }, [currentIndex, videos]);

  const renderVideo = (video: Video, index: number) => {
    const isActive = index === currentIndex;
    
    if (video.platform === 'instagram') {
      return (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-500 ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="instagram-container w-full h-full flex items-center justify-center">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: `<blockquote class="instagram-media" data-instgrm-permalink="${video.link}" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"></blockquote>`
              }}
            />
          </div>
        </div>
      );
    }

    // YouTube and other iframe-based videos
    return (
      <div
        key={index}
        className={`absolute inset-0 transition-opacity duration-500 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <iframe
          src={video.link}
          title={video.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => handleVideoPlay(video)}
        />
      </div>
    );
  };

  if (videos.length === 0) return null;

  return (
    <div className="relative">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {videos.map((video, index) => renderVideo(video, index))}
        
        {/* Play Button Overlay - Only show for non-Instagram videos */}
        {videos[currentIndex]?.platform !== 'instagram' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              onClick={() => handleVideoPlay(videos[currentIndex])}
              className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors pointer-events-auto"
            >
              <Play size={24} className="text-white ml-1" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      {videos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors z-10"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>
          
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors z-10"
          >
            <ChevronRight size={20} className="text-white" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {videos.length > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-black' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Video Title */}
      <div className="mt-4">
        <h3 
          className="text-lg font-bold text-black"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.bold,
            lineHeight: designTokens.typography.lineHeights.heading,
          }}
        >
          {videos[currentIndex].title}
        </h3>
        <p 
          className="text-sm text-gray-600 mt-1"
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

// Extend window interface for Instagram embed
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

export default VideoCarousel;