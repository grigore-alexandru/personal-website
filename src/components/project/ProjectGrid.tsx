import React, { useRef } from 'react';
import { Project } from '../../types';
import Card from '../Card';
import { ProjectCardSkeleton } from '../ui/SkeletonLoader';

interface ProjectGridProps {
  projects: Project[];
  initialLoading: boolean;
  loadingMore?: boolean;
  skeletonCount?: number;
  batchSize?: number;
  onImageLoad?: () => void;
  observerTarget?: React.RefObject<HTMLDivElement>;
}

const ProjectGrid: React.FC<ProjectGridProps> = ({
  projects,
  initialLoading,
  loadingMore = false,
  skeletonCount = 12,
  batchSize = 12,
  onImageLoad,
  observerTarget,
}) => {
  const revealedRef = useRef<Set<string>>(new Set());

  if (initialLoading) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              style={{ animation: `fadeIn 0.25s ease-out ${i * 40}ms both` }}
            >
              <ProjectCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!projects.length && !loadingMore) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-24 text-center">
        <p className="text-neutral-400 text-sm tracking-wide">No projects match your criteria.</p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 pb-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, index) => {
          const isNew = !revealedRef.current.has(project.id);
          if (isNew) revealedRef.current.add(project.id);

          return (
            <div
              key={project.id}
              className="transition-all duration-500 ease-out"
              style={
                isNew
                  ? {
                      animation: `slideUpFade 0.45s ease-out ${Math.min(index % batchSize, 11) * 50}ms both`,
                    }
                  : undefined
              }
            >
              <Card project={project} onImageLoad={onImageLoad} />
            </div>
          );
        })}

        {loadingMore &&
          Array.from({ length: batchSize }).map((_, i) => (
            <div
              key={`skeleton-more-${i}`}
              style={{ animation: `fadeIn 0.25s ease-out ${i * 40}ms both` }}
            >
              <ProjectCardSkeleton />
            </div>
          ))}
      </div>

      {observerTarget && <div ref={observerTarget} className="h-4 mt-6" />}
    </div>
  );
};

export default ProjectGrid;
