import { useState, useRef, useEffect, useCallback } from 'react';
import { ContentWithProject, isVideoThumbnail } from '../types';
import { useTouchScrollActivation } from '../hooks/useTouchScrollActivation';
import { ProgressiveImage } from './ui/ProgressiveImage';

interface ContentGridItemProps {
  content: ContentWithProject;
  onClick: () => void;
}

export function ContentGridItem({ content, onClick }: ContentGridItemProps) {
  const [mouseHovering, setMouseHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [touchRef, touchActive] = useTouchScrollActivation();

  const isHovering = mouseHovering || touchActive;

  const thumbnail  = content.thumbnail;
  const isPortrait = content.format === 'portrait';

  const videoThumb = thumbnail && isVideoThumbnail(thumbnail) ? thumbnail : null;
  const imageThumb = thumbnail && !isVideoThumbnail(thumbnail) ? thumbnail : null;

  const syncVideo = useCallback((active: boolean) => {
    if (!videoThumb || !videoRef.current) return;
    if (active) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [videoThumb]);

  useEffect(() => {
    syncVideo(isHovering);
  }, [isHovering, syncVideo]);

  const handleMouseEnter = () => setMouseHovering(true);
  const handleMouseLeave = () => setMouseHovering(false);

  const year = content.published_at
    ? new Date(content.published_at).getFullYear()
    : null;

  return (
    <div
      <div
  ref={touchRef}
  className={`group relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg w-full h-full ${
    isPortrait
      ? 'aspect-[9/16] sm:aspect-auto'
      : 'aspect-[16/10] sm:aspect-auto'
  }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {videoThumb && (
        <>
          <ProgressiveImage
            src={videoThumb.poster}
            alt={content.title}
            className={`object-cover transition-all duration-1000 ease-out ${
              isHovering
                ? 'opacity-0 scale-[1.01]'
                : 'opacity-100 scale-100 saturate-[0.3]'
            }`}
          />
          <video
            ref={videoRef}
            src={videoThumb.hover_video}
            loop
            muted
            playsInline
            preload="none"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out ${
              isHovering
                ? 'opacity-100 scale-[1.01]'
                : 'opacity-0 scale-100'
            }`}
          />
        </>
      )}

      {imageThumb && (
        <ProgressiveImage
          src={imageThumb.poster}
          alt={content.title}
          className={`object-cover transition-all duration-1000 ease-out ${
            isHovering
              ? 'scale-[1.01] saturate-100'
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
        className={`absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-all duration-500 ease-in-out ${
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