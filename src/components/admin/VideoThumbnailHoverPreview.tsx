import { useState, useRef } from 'react';
import { ContentThumbnailVideo } from '../../types';

interface VideoThumbnailHoverPreviewProps {
  thumbnail: ContentThumbnailVideo;
  format?: 'portrait' | 'landscape';
  className?: string;
}

export function VideoThumbnailHoverPreview({ thumbnail, format = 'landscape', className = '' }: VideoThumbnailHoverPreviewProps) {
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const aspectRatioClass = format === 'portrait' ? 'aspect-[3/4]' : 'aspect-video';

  return (
    <div
      className={`relative bg-gray-100 rounded-lg overflow-hidden ${aspectRatioClass} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={thumbnail.poster}
        alt="Poster frame"
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isHovering ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <video
        ref={videoRef}
        src={thumbnail.video}
        loop
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
          isHovering ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
