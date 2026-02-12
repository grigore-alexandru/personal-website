import { useState, useRef } from 'react';
import { ContentThumbnailVideo } from '../../types';

interface VideoThumbnailHoverPreviewProps {
  thumbnail: ContentThumbnailVideo;
  className?: string;
}

export function VideoThumbnailHoverPreview({ thumbnail, className = '' }: VideoThumbnailHoverPreviewProps) {
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

  return (
    <div
      className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={thumbnail.poster}
        alt="Poster frame"
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isHovering ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      <video
        ref={videoRef}
        src={thumbnail.video}
        loop
        muted
        playsInline
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isHovering ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ position: 'relative', display: 'block' }}
      />
    </div>
  );
}
