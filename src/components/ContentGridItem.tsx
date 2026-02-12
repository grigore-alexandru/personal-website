import { useState, useRef } from 'react';
import { ContentWithProject, ContentThumbnailVideo, ContentThumbnailImage } from '../types';

interface ContentGridItemProps {
  content: ContentWithProject;
  onClick: () => void;
}

export function ContentGridItem({ content, onClick }: ContentGridItemProps) {
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const thumbnail = content.thumbnail;
  const hasVideoThumbnail = thumbnail && 'poster' in thumbnail && 'video' in thumbnail;
  const hasImageThumbnail = thumbnail && 'compressed' in thumbnail;
  const isPortrait = content.format === 'portrait';

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (hasVideoThumbnail && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (hasVideoThumbnail && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const year = content.published_at
    ? new Date(content.published_at).getFullYear()
    : null;

  return (
    <div
      className={`group relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg w-full h-full ${
        isPortrait ? '' : 'aspect-[16/10]'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {hasVideoThumbnail && (
        <>
          <img
            src={(thumbnail as ContentThumbnailVideo).poster}
            alt={content.title}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
              isHovering
                ? 'opacity-0 scale-105'
                : 'opacity-100 scale-100 saturate-[0.3]'
            }`}
          />
          <video
            ref={videoRef}
            src={(thumbnail as ContentThumbnailVideo).video}
            loop
            muted
            playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
              isHovering
                ? 'opacity-100 scale-105 saturate-110'
                : 'opacity-0 scale-100'
            }`}
          />
        </>
      )}

      {hasImageThumbnail && (
        <img
          src={(thumbnail as ContentThumbnailImage).compressed}
          alt={content.title}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
            isHovering
              ? 'scale-105 saturate-110'
              : 'scale-100 saturate-[0.3]'
          }`}
        />
      )}

      {!thumbnail && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <span className="text-gray-400 text-sm">No thumbnail</span>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-all duration-300 ${
          isHovering
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-white text-lg mb-2 line-clamp-2">
            {content.title}
          </h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">
              {content.project_info?.client_name || 'Independent'}
            </span>
            {year && (
              <span className="text-gray-300">
                {year}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
