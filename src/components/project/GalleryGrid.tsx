import React, { useState } from 'react';
import { Play, Image as ImageIcon } from 'lucide-react';
import { ProjectContentItem } from '../../types';
import { Skeleton } from '../ui/SkeletonLoader';

interface GalleryGridProps {
  items: ProjectContentItem[];
  onItemClick: (index: number) => void;
}

const isVideoItem = (item: ProjectContentItem): boolean => {
  const c = item.content;
  return c.content_type?.slug !== 'image' && (
    c.platform === 'youtube' ||
    c.platform === 'vimeo' ||
    c.platform === 'mega' ||
    (c.url?.includes('youtube.com') ?? false) ||
    (c.url?.includes('youtu.be') ?? false) ||
    (c.url?.includes('vimeo.com') ?? false)
  );
};

const getThumbnailUrl = (item: ProjectContentItem): string | null => {
  const c = item.content;
  if (c.thumbnail) {
    return (c.thumbnail as { poster: string }).poster || null;
  }
  return null;
};

const getYouTubeThumbnail = (url: string): string | null => {
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|\/shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = match && match[1].length === 11 ? match[1] : null;
  if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return null;
};

interface GalleryTileProps {
  item: ProjectContentItem;
  index: number;
  onClick: (index: number) => void;
}

const GalleryTile: React.FC<GalleryTileProps> = ({ item, index, onClick }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const c = item.content;
  const isVideo = isVideoItem(item);
  const isPortrait = c.format === 'portrait';

  let thumbUrl = getThumbnailUrl(item);
  if (!thumbUrl && isVideo && c.url) {
    thumbUrl = getYouTubeThumbnail(c.url);
  }

  return (
    <button
      onClick={() => onClick(index)}
      className={`group relative overflow-hidden rounded-lg bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99] ${
        isPortrait ? 'row-span-2' : ''
      }`}
      style={{ aspectRatio: isPortrait ? '9 / 16' : '16 / 9' }}
      aria-label={`Open ${c.title} in fullscreen`}
    >
      {!imgLoaded && !imgError && (
        <div className="absolute inset-0 skeleton-shimmer" />
      )}

      {thumbUrl && !imgError ? (
        <img
          src={thumbUrl}
          alt={c.title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            setImgError(true);
            setImgLoaded(true);
          }}
        />
      ) : imgError || !thumbUrl ? (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-200">
          <ImageIcon size={32} className="text-neutral-400" />
        </div>
      ) : null}

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />

      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/70 transition-colors duration-200">
            <Play size={20} className="text-white ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-200">
        <p className="text-white text-sm font-medium truncate">{c.title}</p>
      </div>
    </button>
  );
};

const GalleryGridSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {[...Array(count)].map((_, i) => (
      <Skeleton
        key={i}
        className="w-full"
        style={{ aspectRatio: '16 / 9', animationDelay: `${i * 60}ms` } as React.CSSProperties}
      />
    ))}
  </div>
);

const GalleryGrid: React.FC<GalleryGridProps> = ({ items, onItemClick }) => {
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((item, index) => (
        <GalleryTile
          key={item.id}
          item={item}
          index={index}
          onClick={onItemClick}
        />
      ))}
    </div>
  );
};

export { GalleryGridSkeleton };
export default GalleryGrid;
