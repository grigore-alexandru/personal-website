import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../types';
import { generateProjectUrl } from '../utils/dataLoader';
import { designTokens } from '../styles/tokens';

interface CardProps {
  project: Project;
}

const Card: React.FC<CardProps> = ({ project }) => {
  const projectUrl = generateProjectUrl(project);

  return (
    <Link 
      to={projectUrl}
      className="group block relative overflow-hidden rounded-lg bg-white transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-black"
      style={{
        boxShadow: `0 4px 6px -1px ${designTokens.colors.shadow}`,
      }}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <img
          src={project.hero_image_thumbnail}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
        
        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <h3 
            className="text-white font-bold text-lg mb-1 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
            }}
          >
            {project.title}
          </h3>
          <p 
            className="text-white/80 text-sm transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.regular,
              letterSpacing: designTokens.typography.letterSpacings.wide,
            }}
          >
            {project.project_type.name} • {project.client_name}
          </p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span 
            className="text-xs font-medium text-gray-500 uppercase tracking-wide"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.regular,
              letterSpacing: designTokens.typography.letterSpacings.wide,
            }}
          >
            {project.project_type.name}
          </span>
          <span 
            className="text-xs text-gray-400"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.regular,
            }}
          >
            {new Date(project.created_at).getFullYear()}
          </span>
        </div>
        
        <h3 
          className="text-lg font-bold mb-1 text-black"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.bold,
            lineHeight: designTokens.typography.lineHeights.heading,
          }}
        >
          {project.title}
        </h3>
        
        <p 
          className="text-gray-600 text-sm"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.regular,
            color: designTokens.colors.textSecondary,
          }}
        >
          {project.client_name}
        </p>
      </div>
    </Link>
  );
};

export default Card;