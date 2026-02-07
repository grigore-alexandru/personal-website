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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          {prevProject ? (
            <Link
              to={generateProjectUrl(prevProject)}
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors group"
            >
              <ArrowLeft
                size={18}
                className="flex-shrink-0 transition-transform group-hover:-translate-x-1"
              />
              <span
                className="hidden sm:block truncate"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontSize: designTokens.typography.sizes.xs,
                  fontWeight: designTokens.typography.weights.regular,
                }}
              >
                {prevProject.title}
              </span>
              <span
                className="sm:hidden flex-shrink-0"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontSize: designTokens.typography.sizes.xs,
                }}
              >
                Prev
              </span>
            </Link>
          ) : (
            <div />
          )}
        </div>

        <Link
          to="/portfolio"
          className="px-5 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors whitespace-nowrap flex-shrink-0"
          style={{
            fontFamily: designTokens.typography.fontFamily,
            fontSize: designTokens.typography.sizes.xs,
            fontWeight: designTokens.typography.weights.bold,
          }}
        >
          All Projects
        </Link>

        <div className="min-w-0 flex justify-end">
          {nextProject ? (
            <Link
              to={generateProjectUrl(nextProject)}
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors group min-w-0"
            >
              <span
                className="hidden sm:block truncate"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontSize: designTokens.typography.sizes.xs,
                  fontWeight: designTokens.typography.weights.regular,
                }}
              >
                {nextProject.title}
              </span>
              <span
                className="sm:hidden flex-shrink-0"
                style={{
                  fontFamily: designTokens.typography.fontFamily,
                  fontSize: designTokens.typography.sizes.xs,
                }}
              >
                Next
              </span>
              <ArrowRight
                size={18}
                className="flex-shrink-0 transition-transform group-hover:translate-x-1"
              />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </nav>
  );
};

export default ProjectNavigation;
