import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../types';
import { generateProjectUrl } from '../utils/dataLoader';
import { designTokens } from '../styles/tokens';

interface CardProps {
  project: Project;
}

const Card: React.FC<CardProps> = ({ project }) => {
  const year = new Date(project.created_at).getFullYear();

  return (
    <Link
      to={generateProjectUrl(project)}
      className="group block overflow-hidden rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black/20"
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
        <img
          src={project.hero_image_thumbnail}
          alt={project.title}
          className="w-full h-full object-cover saturate-[0.2] group-hover:saturate-100 group-hover:scale-105 transition-all duration-300 ease-out"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div style={{ padding: designTokens.spacing.scale.sm }}>
        <h3
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontSize: designTokens.typography.sizes.md,
            fontWeight: designTokens.typography.weights.bold,
            lineHeight: designTokens.typography.lineHeights.heading,
            color: designTokens.colors.textPrimary,
            marginBottom: '8px',
          }}
        >
          {project.title}
        </h3>
        <div className="flex items-center justify-between">
          <span
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontSize: designTokens.typography.sizes.xs,
              color: designTokens.colors.textSecondary,
            }}
          >
            {project.client_name}
          </span>
          <span
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontSize: designTokens.typography.sizes.xs,
              color: designTokens.colors.textSecondary,
            }}
          >
            {project.project_type.name} &middot; {year}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default Card;
