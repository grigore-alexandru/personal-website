import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import Card from './Card';

interface ProjectGridProps {
  projects: Project[];
  loading?: boolean;
}

const ProjectGrid: React.FC<ProjectGridProps> = ({ projects, loading = false }) => {
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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg overflow-hidden">
              <div className="bg-neutral-200 animate-pulse" style={{ aspectRatio: '16 / 10' }} />
              <div className="pt-3 space-y-2">
                <div className="h-4 w-3/4 bg-neutral-200 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-neutral-100 rounded animate-pulse" />
              </div>
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
            style={{ transitionDelay: visible ? `${index * 60}ms` : '0ms' }}
          >
            <Card project={project} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectGrid;
