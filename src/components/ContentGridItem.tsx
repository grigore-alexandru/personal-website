import { useState, useRef, useEffect, useCallback } from 'react';
import { ContentWithProject, isVideoThumbnail } from '../types';
import { useTouchScrollActivation } from '../hooks/useTouchScrollActivation';
import { ProgressiveImage } from './ui/ProgressiveImage';

interface ContentGridItemProps {
  content: ContentWithProject;
  onClick: () => void;
  onLoad?: () => void;
  fetchPriority?: 'high' | 'low' | 'auto';
}

export function ContentGridItem({ content, onClick, onLoad, fetchPriority }: ContentGridItemProps) {
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
      // Reset to 0 ONLY when starting to play
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      // Just pause. DO NOT reset to 0 here. 
      // This lets the video stay on its last frame while it fades out smoothly.
      videoRef.current.pause();
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
      ref={touchRef}
      className={`group relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg w-full h-full ${
        isPortrait
          ? 'aspect-[9/16]'
          : 'aspect-[16/10]'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {videoThumb && (
        <>
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              transform: isHovering ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          >
            <ProgressiveImage
              src={videoThumb.poster}
              alt={content.title}
              onLoad={onLoad}
              fetchPriority={fetchPriority}
              className={`object-cover transition-[filter,opacity] duration-[350ms] ease-in-out ${
                isHovering
                  ? 'opacity-0'
                  : 'opacity-100 saturate-[0.3]'
              }`}
            />
          </div>
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              transform: isHovering ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          >
            <video
              ref={videoRef}
              src={videoThumb.hover_video}
              loop
              muted
              playsInline
              preload="none"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[350ms] ease-in-out ${
                isHovering ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>
        </>
      )}

      {imageThumb && (
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: isHovering ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          <ProgressiveImage
            src={imageThumb.poster}
            alt={content.title}
            onLoad={onLoad}
            fetchPriority={fetchPriority}
            className={`object-cover transition-[filter] duration-[350ms] ease-in-out ${
              isHovering ? 'saturate-100' : 'saturate-[0.3]'
            }`}
          />
        </div>
      )}

      {!thumbnail && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-200"
          ref={(el) => { if (el) onLoad?.(); }}
        >
          <span className="text-gray-400 text-sm">No thumbnail</span>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-all duration-500 ease-smooth ${
          isHovering
            ? 'opacity-100'
            : 'opacity-0'
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