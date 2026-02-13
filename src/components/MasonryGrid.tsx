import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import Card from './Card';
import { ProjectCardSkeleton } from './ui/SkeletonLoader';

interface ProjectGridProps {
  projects: Project[];
  loading?: boolean;
  loadingMore?: boolean;
  observerTarget?: React.RefObject<HTMLDivElement>;
}

const ProjectGrid: React.FC<ProjectGridProps> = ({
  projects,
  loading = false,
  loadingMore = false,
  observerTarget
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [projects, loading]);

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              style={{
                animation: `fadeIn 0.3s ease-in-out ${i * 50}ms both`,
              }}
            >
              <ProjectCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-24 text-center">
        <p className="text-neutral-400 text-sm tracking-wide">No projects match your criteria.</p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 pb-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, index) => (
          <div
            key={project.id}
            className={`transition-all duration-500 ease-out ${
              visible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: visible ? `${Math.min(index, 12) * 60}ms` : '0ms' }}
          >
            <Card project={project} />
          </div>
        ))}

        {loadingMore && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                style={{
                  animation: `fadeIn 0.3s ease-in-out ${i * 50}ms both`,
                }}
              >
                <ProjectCardSkeleton />
              </div>
            ))}
          </>
        )}
      </div>

      {observerTarget && <div ref={observerTarget} className="h-4 mt-6" />}
    </div>
  );
};

export default ProjectGrid;
