import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animate = true,
}) => {
  const variantClass = {
    text:        'rounded',
    circular:    'rounded-full',
    rectangular: 'rounded-token-md',
  }[variant];

  const style: React.CSSProperties = {
    width:  typeof width  === 'number' ? `${width}px`  : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${animate ? 'skeleton-shimmer' : 'bg-[var(--skeleton-base)]'} ${variantClass} ${className}`}
      style={style}
    />
  );
};

export const ProjectCardSkeleton: React.FC = () => (
  <div className="bg-surface-raised card-raised overflow-hidden">
    <div className="relative overflow-hidden skeleton-shimmer" style={{ aspectRatio: '16 / 10' }} />
    <div className="px-4 pt-4 pb-5">
      <Skeleton height={22} className="mb-3" width="80%" />
      <div className="flex items-center justify-between">
        <Skeleton height={14} width="42%" />
        <Skeleton height={14} width="30%" />
      </div>
    </div>
  </div>
);

export const BlogPostCardSkeleton: React.FC = () => (
  <article className="bg-surface-raised card-raised overflow-hidden">
    <div className="p-6">
      <div className="mb-4">
        <Skeleton height={26} className="mb-2" width="78%" />
        <Skeleton height={14} width="28%" />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/5 flex-shrink-0">
          <div className="relative w-full pt-[60%] rounded-token-md overflow-hidden skeleton-shimmer" />
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div className="mb-4 space-y-2">
            <Skeleton height={18} width="100%" />
            <Skeleton height={18} width="100%" />
            <Skeleton height={18} width="72%" />
          </div>
          <div className="flex items-center justify-end">
            <Skeleton height={38} width={116} />
          </div>
        </div>
      </div>
    </div>
  </article>
);

export const BlogPostPageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-white">
    <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 pt-12 pb-12 md:pt-16 md:pb-16">
      <div className="mb-6 flex flex-col items-center gap-3">
        <Skeleton height={52} width="75%" className="mx-auto" />
        <Skeleton height={52} width="55%" className="mx-auto" />
        <Skeleton height={16} width={160} className="mx-auto mt-2" />
      </div>

      <div className="mb-12 md:mb-16">
        <div
          className="relative w-full overflow-hidden rounded-token-lg skeleton-shimmer"
          style={{ height: '380px' }}
        />
      </div>

      <div className="space-y-3 mb-10">
        <Skeleton height={20} width="100%" />
        <Skeleton height={20} width="100%" />
        <Skeleton height={20} width="92%" />
        <Skeleton height={20} width="100%" />
        <Skeleton height={20} width="87%" />
      </div>

      <div className="mb-6">
        <Skeleton height={28} width="40%" className="mb-4" />
      </div>

      <div className="space-y-3 mb-10">
        <Skeleton height={20} width="100%" />
        <Skeleton height={20} width="100%" />
        <Skeleton height={20} width="95%" />
        <Skeleton height={20} width="100%" />
        <Skeleton height={20} width="78%" />
      </div>

      <div className="pt-8 border-t border-[var(--color-border-default)]">
        <Skeleton height={28} width="20%" className="mb-5" />
        <div className="space-y-2">
          <Skeleton height={18} width="60%" />
          <Skeleton height={18} width="48%" />
          <Skeleton height={18} width="55%" />
        </div>
      </div>
    </div>
  </div>
);

export const ProjectDetailSkeleton: React.FC = () => (
  <div className="min-h-screen bg-white">
    <div
      className="relative w-full skeleton-shimmer"
      style={{ height: '100vh' }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
        <Skeleton height={56} width={480} className="mx-auto opacity-60" />
        <div className="flex items-center gap-4 mt-2">
          <Skeleton height={20} width={100} className="opacity-50" />
          <Skeleton height={20} width={80}  className="opacity-50" />
          <Skeleton height={20} width={120} className="opacity-50" />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto px-8 py-14">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="text-center">
          <Skeleton height={44} width="100%" className="mb-2" />
          <Skeleton height={18} width="70%" className="mx-auto" />
        </div>
      ))}
    </div>

    <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
      <Skeleton height={30} width="45%" className="mb-6" />
      <Skeleton height={20} width="100%" />
      <Skeleton height={20} width="100%" />
      <Skeleton height={20} width="92%" />
      <Skeleton height={20} width="100%" />
      <Skeleton height={20} width="86%" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto px-8 py-8">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="w-full" style={{ aspectRatio: '16/10' }} />
      ))}
    </div>
  </div>
);

export const ContentGridItemSkeleton: React.FC<{ isPortrait?: boolean }> = ({ isPortrait }) => (
  <div
    className={`skeleton-shimmer rounded-token-md overflow-hidden w-full h-full ${
      isPortrait ? '' : 'aspect-[16/10]'
    }`}
  />
);

export const HeroImageSkeleton: React.FC = () => (
  <div className="relative w-full overflow-hidden rounded-token-lg skeleton-shimmer" style={{ height: '60vh' }} />
);

export const ProjectDetailHeroSkeleton: React.FC = () => (
  <div className="relative skeleton-shimmer" style={{ height: '75vh' }}>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center max-w-4xl px-8">
        <Skeleton height={48} width={400} className="mb-4 mx-auto opacity-60" />
        <Skeleton height={24} width={300} className="mx-auto opacity-50" />
      </div>
    </div>
  </div>
);

export const ContentBlockSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto px-8 py-12 space-y-4">
    <Skeleton height={30} width="58%" className="mb-6" />
    <Skeleton height={20} width="100%" />
    <Skeleton height={20} width="100%" />
    <Skeleton height={20} width="95%" />
    <Skeleton height={20} width="100%" />
    <Skeleton height={20} width="90%" />
    <Skeleton height={20} width="100%" />
    <Skeleton height={20} width="85%" />
  </div>
);

export const MetricsSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto px-8 py-12">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="text-center">
        <Skeleton height={48} width="100%" className="mb-2" />
        <Skeleton height={20} width="80%" className="mx-auto" />
      </div>
    ))}
  </div>
);

export const GallerySkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto px-8 py-12">
    {[...Array(4)].map((_, i) => (
      <Skeleton key={i} className="w-full" style={{ aspectRatio: '16/10' }} />
    ))}
  </div>
);

interface StaggeredSkeletonListProps {
  count: number;
  SkeletonComponent: React.ComponentType;
  staggerDelay?: number;
}

export const StaggeredSkeletonList: React.FC<StaggeredSkeletonListProps> = ({
  count,
  SkeletonComponent,
  staggerDelay = 50,
}) => (
  <>
    {[...Array(count)].map((_, i) => (
      <div
        key={i}
        style={{ animation: `fadeIn 0.3s ease-in-out ${i * staggerDelay}ms both` }}
      >
        <SkeletonComponent />
      </div>
    ))}
  </>
);
