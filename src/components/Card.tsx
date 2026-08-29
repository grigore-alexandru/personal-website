'use client';

import React from 'react';
import Link from 'next/link';
import { Project } from '../types';
import { generateProjectUrl } from '../utils/dataLoader';
import { ProgressiveImage } from './ui/ProgressiveImage';

interface CardProps {
  project: Project;
  onImageLoad?: () => void;
}

const Card: React.FC<CardProps> = ({ project, onImageLoad }) => {
  const year = new Date(project.created_at).getFullYear();

  return (
    <Link
      href={generateProjectUrl(project)}
      className="group block bg-surface-raised card-raised overflow-hidden focus-visible:outline-none focus-visible:shadow-token-focus"
    >
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: '16 / 10' }}
      >
        {/* Wrapper carries the zoom — matches ContentGridItem's cubic-bezier and scale */}
        <div
          className="absolute inset-0 will-change-transform group-hover:scale-[1.06]"
          style={{ transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
        >
          <ProgressiveImage
            src={project.hero_image_thumbnail}
            alt={project.title}
            className="object-cover saturate-[0.2] group-hover:saturate-100 transition-[filter] duration-[350ms] ease-in-out"
            onLoad={onImageLoad}
          />
        </div>
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