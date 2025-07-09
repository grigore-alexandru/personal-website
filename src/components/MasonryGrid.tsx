import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import Card from './Card';
import { designTokens } from '../styles/tokens';

interface MasonryGridProps {
  projects: Project[];
  loading?: boolean;
}

const MasonryGrid: React.FC<MasonryGridProps> = ({ projects, loading = false }) => {
  const [visibleProjects, setVisibleProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (loading) return;

    // Staggered animation for cards
    const timer = setTimeout(() => {
      setVisibleProjects(projects);
    }, 200);

    return () => clearTimeout(timer);
  }, [projects, loading]);

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="break-inside-avoid mb-6 bg-gray-200 rounded-lg animate-pulse"
              style={{ height: `${300 + (index % 3) * 50}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-12">
      <div 
        className="columns-1 md:columns-2 lg:columns-3"
        style={{ 
          gap: designTokens.spacing.scale.md,
          columnGap: designTokens.spacing.scale.md,
        }}
      >
        {visibleProjects.map((project, index) => (
          <div
            key={`${project.title}-${project.client_name}`}
            className="break-inside-avoid mb-6 opacity-0 animate-fade-in"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'forwards',
            }}
          >
            <Card project={project} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MasonryGrid;