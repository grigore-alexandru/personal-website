import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../types';
import { generateProjectUrl } from '../utils/dataLoader';

interface CardProps {
  project: Project;
}

const Card: React.FC<CardProps> = ({ project }) => {
  return (
    <Link
      to={generateProjectUrl(project)}
      className="group block overflow-hidden rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black/20"
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
        <img
          src={project.hero_image_thumbnail}
          alt={project.title}
          className="w-full h-full object-cover saturate-50 group-hover:saturate-100 group-hover:scale-105 transition-all duration-300 ease-out"
          loading="lazy"
        />
      </div>

      <div className="px-1 pt-3 pb-1">
        <h3 className="text-[15px] font-medium text-neutral-900 leading-snug tracking-[-0.01em]">
          {project.title}
        </h3>
        <p className="text-[13px] text-neutral-400 mt-1 tracking-wide">
          {project.client_name}
        </p>
        <span className="inline-block mt-2 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.08em] font-medium text-neutral-500 bg-neutral-100 rounded-full">
          {project.project_type.name}
        </span>
      </div>
    </Link>
  );
};

export default Card;
