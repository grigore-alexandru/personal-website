import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Project } from '../../types';
import { generateProjectUrl } from '../../utils/dataLoader';
import { designTokens } from '../../styles/tokens';

interface ProjectNavigationProps {
  prevProject: Project | null;
  nextProject: Project | null;
}

const ProjectNavigation: React.FC<ProjectNavigationProps> = ({
  prevProject,
  nextProject,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        {prevProject ? (
          <Link
            to={generateProjectUrl(prevProject)}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors group"
          >
            <ArrowLeft
              size={18}
              className="transition-transform group-hover:-translate-x-1"
            />
            <span
              className="hidden sm:inline"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.xs,
                fontWeight: designTokens.typography.weights.regular,
              }}
            >
              {prevProject.title}
            </span>
            <span
              className="sm:hidden"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.xs,
              }}
            >
              Previous
            </span>
          </Link>
        ) : (
          <div />
        )}

        <Link
          to="/portfolio"
          className="px-5 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-center"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontSize: designTokens.typography.sizes.xs,
            fontWeight: designTokens.typography.weights.bold,
          }}
        >
          All Projects
        </Link>

        {nextProject ? (
          <Link
            to={generateProjectUrl(nextProject)}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors group"
          >
            <span
              className="hidden sm:inline"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.xs,
                fontWeight: designTokens.typography.weights.regular,
              }}
            >
              {nextProject.title}
            </span>
            <span
              className="sm:hidden"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.xs,
              }}
            >
              Next
            </span>
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </nav>
  );
};

export default ProjectNavigation;
