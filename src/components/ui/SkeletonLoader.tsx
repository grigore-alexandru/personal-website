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
  const baseClass = `bg-gray-200 ${animate ? 'animate-pulse' : ''}`;

  const variantClass = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }[variant];

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return <div className={`${baseClass} ${variantClass} ${className}`} style={style} />;
};

export const BlogPostCardSkeleton: React.FC = () => {
  return (
    <article className="block bg-white border border-gray-100 rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="mb-4">
          <Skeleton height={28} className="mb-2" width="80%" />
          <Skeleton height={16} width="30%" />
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-2/5 flex-shrink-0">
            <div className="relative w-full pt-[60%] bg-gray-100 rounded-lg overflow-hidden">
              <Skeleton className="absolute inset-0" />
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between">
            <div className="mb-4 space-y-2">
              <Skeleton height={20} width="100%" />
              <Skeleton height={20} width="100%" />
              <Skeleton height={20} width="75%" />
            </div>

            <div className="flex items-center justify-end">
              <Skeleton height={40} width={120} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export const ProjectCardSkeleton: React.FC = () => {
  return (
    <div className="block overflow-hidden rounded-lg bg-white">
      <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
        <Skeleton className="w-full h-full" />
      </div>

      <div className="p-4">
        <Skeleton height={24} className="mb-2" width="85%" />
        <div className="flex items-center justify-between">
          <Skeleton height={16} width="40%" />
          <Skeleton height={16} width="35%" />
        </div>
      </div>
    </div>
  );
};

export const ContentGridItemSkeleton: React.FC<{ isPortrait?: boolean }> = ({ isPortrait }) => {
  return (
    <div
      className={`bg-gray-100 rounded-lg overflow-hidden w-full h-full ${
        isPortrait ? '' : 'aspect-[16/10]'
      }`}
    >
      <Skeleton className="w-full h-full" />
    </div>
  );
};

export const HeroImageSkeleton: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden bg-gray-200" style={{ height: '60vh' }}>
      <Skeleton className="w-full h-full" />
    </div>
  );
};

export const ProjectDetailHeroSkeleton: React.FC = () => {
  return (
    <div className="relative">
      <Skeleton className="w-full" style={{ height: '75vh' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center max-w-4xl px-8">
          <Skeleton height={48} width={400} className="mb-4 mx-auto" />
          <Skeleton height={24} width={300} className="mx-auto" />
        </div>
      </div>
    </div>
  );
};

export const ContentBlockSkeleton: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-8 py-12 space-y-4">
      <Skeleton height={32} width="60%" className="mb-6" />
      <Skeleton height={20} width="100%" />
      <Skeleton height={20} width="100%" />
      <Skeleton height={20} width="95%" />
      <Skeleton height={20} width="100%" />
      <Skeleton height={20} width="90%" />
      <Skeleton height={20} width="100%" />
      <Skeleton height={20} width="85%" />
    </div>
  );
};

export const MetricsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto px-8 py-12">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="text-center">
          <Skeleton height={48} width="100%" className="mb-2" />
          <Skeleton height={20} width="80%" className="mx-auto" />
        </div>
      ))}
    </div>
  );
};

export const GallerySkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto px-8 py-12">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="w-full" style={{ aspectRatio: '16/10' }} />
      ))}
    </div>
  );
};

interface StaggeredSkeletonListProps {
  count: number;
  SkeletonComponent: React.ComponentType;
  staggerDelay?: number;
}

export const StaggeredSkeletonList: React.FC<StaggeredSkeletonListProps> = ({
  count,
  SkeletonComponent,
  staggerDelay = 50,
}) => {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          style={{
            animation: `fadeIn 0.3s ease-in-out ${i * staggerDelay}ms both`,
          }}
        >
          <SkeletonComponent />
        </div>
      ))}
    </>
  );
};
