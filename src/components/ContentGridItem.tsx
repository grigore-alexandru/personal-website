import { useState, useRef } from 'react';
import { ContentWithProject, ContentThumbnailVideo, ContentThumbnailImage } from '../types';

interface ContentGridItemProps {
  content: ContentWithProject;
  onClick: () => void;
}

export function ContentGridItem({ content, onClick }: ContentGridItemProps) {
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isVideo = content.content_type.slug === 'video';
  const thumbnail = content.thumbnail;
  const hasVideoThumbnail = thumbnail && 'poster' in thumbnail && 'video' in thumbnail;
  const hasImageThumbnail = thumbnail && 'compressed' in thumbnail;
  const isPortrait = content.format === 'portrait';

  const year = content.published_at
    ? new Date(content.published_at).getFullYear()
    : null;

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

  const handleClick = () => {
    onClick();
  };

  const mediaAspectClass = isPortrait ? 'aspect-[9/16]' : 'aspect-video';

  return (
    <div className="break-inside-avoid mb-6 group">
      <div
        ref={containerRef}
        className={`relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg ${mediaAspectClass} ${
          isPortrait ? 'mx-auto max-w-xs' : 'w-full'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
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
      </div>

      <div className="mt-4 space-y-3">
        <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          {year}
        </div>

        <div className="grid grid-cols-3 gap-4 pb-3 border-b border-gray-200">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Client</p>
            <p className="text-sm text-gray-900 font-medium line-clamp-2">
              {content.project_info?.client_name || 'Unassigned'}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Type</p>
            <p className="text-sm text-gray-900 font-medium line-clamp-2">
              {content.project_info?.project_type_name || '—'}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Project</p>
            <p className="text-sm text-gray-900 font-medium line-clamp-2">
              {content.project_info?.project_title || '—'}
            </p>
          </div>
        </div>

        {content.contributors && content.contributors.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Collaborators</p>
            <div className="space-y-1">
              {content.contributors.map((contributor, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-700 font-medium">{contributor.name}</span>
                  <span className="text-gray-500 text-xs">{contributor.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
