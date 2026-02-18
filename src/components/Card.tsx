import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../types';
import { generateProjectUrl } from '../utils/dataLoader';

interface CardProps {
  project: Project;
}

const Card: React.FC<CardProps> = ({ project }) => {
  const year = new Date(project.created_at).getFullYear();

  return (
    <Link
      to={generateProjectUrl(project)}
      className="group block bg-surface-raised card-raised overflow-hidden focus-visible:outline-none focus-visible:shadow-token-focus"
    >
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: '16 / 10' }}
      >
        <img
          src={project.hero_image_thumbnail}
          alt={project.title}
          className="w-full h-full object-cover saturate-[0.2] group-hover:saturate-100 group-hover:scale-105 transition-all duration-300 ease-out"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="px-4 pt-4 pb-5">
        <h3
          className="text-token-text-primary font-bold leading-tight mb-2 text-lg"
          style={{ letterSpacing: '-0.01em' }}
        >
          {project.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs text-token-text-secondary font-medium truncate max-w-[55%]">
            {project.client_name}
          </span>
          <span className="text-xs text-token-text-muted whitespace-nowrap ml-2">
            {project.project_type.name}&nbsp;&middot;&nbsp;{year}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default Card;
