import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project } from '../types';
import { loadProject, loadProjects } from '../utils/dataLoader';
import { designTokens } from '../styles/tokens';
import ProjectHero from '../components/ProjectHero';
import ImpactMetrics from '../components/project/ImpactMetrics';
import TipTapRenderer from '../components/project/TipTapRenderer';
import MediaCarousel from '../components/project/MediaCarousel';
import TasksList from '../components/project/TasksList';
import Recommendation from '../components/project/Recommendation';
import ProjectNavigation from '../components/project/ProjectNavigation';

const ProjectDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    const fetchProject = async () => {
      if (!slug) return;

      try {
        const [projectData, projectsData] = await Promise.all([
          loadProject(slug),
          loadProjects(),
        ]);

        setProject(projectData);
        setAllProjects(projectsData);
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white">
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-black mb-4">Project Not Found</h1>
            <Link
              to="/portfolio"
              className="text-gray-600 hover:text-black underline"
            >
              Return to Portfolio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = allProjects.findIndex((p) => p.id === project.id);
  const prevProject = currentIndex > 0 ? allProjects[currentIndex - 1] : null;
  const nextProject =
    currentIndex < allProjects.length - 1 ? allProjects[currentIndex + 1] : null;

  const hasMetrics = project.impact_metrics && project.impact_metrics.length > 0;
  const hasContent = project.project_content.length > 0;
  const hasTasks = project.tasks && project.tasks.length > 0;
  const hasRecommendation = project.recommendation !== null;

  return (
    <div className="min-h-screen bg-white pb-20">
      <ProjectHero
        bgUrl={project.hero_image_large}
        title={project.title}
        type={project.project_type.name}
        client={project.client_name}
        date={project.created_at}
      />

      {hasMetrics && <ImpactMetrics metrics={project.impact_metrics!} />}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="py-12 md:py-16">
          <h2
            className="mb-8"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontSize: designTokens.typography.sizes.lg,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
              color: designTokens.colors.textPrimary,
            }}
          >
            About the Project
          </h2>
          <TipTapRenderer content={project.description} />
        </section>

        {hasContent && (
          <section className="py-12 md:py-16 border-t border-gray-100">
            <h2
              className="mb-8"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.lg,
                fontWeight: designTokens.typography.weights.bold,
                lineHeight: designTokens.typography.lineHeights.heading,
                color: designTokens.colors.textPrimary,
              }}
            >
              Gallery
            </h2>
            <MediaCarousel items={project.project_content} />
          </section>
        )}

        {hasTasks && (
          <section className="py-12 md:py-16 border-t border-gray-100">
            <h2
              className="mb-8"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.lg,
                fontWeight: designTokens.typography.weights.bold,
                lineHeight: designTokens.typography.lineHeights.heading,
                color: designTokens.colors.textPrimary,
              }}
            >
              Tasks
            </h2>
            <TasksList tasks={project.tasks} />
          </section>
        )}

        {hasRecommendation && (
          <section className="py-12 md:py-16 border-t border-gray-100">
            <h2
              className="mb-8"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontSize: designTokens.typography.sizes.lg,
                fontWeight: designTokens.typography.weights.bold,
                lineHeight: designTokens.typography.lineHeights.heading,
                color: designTokens.colors.textPrimary,
              }}
            >
              Recommendation
            </h2>
            <Recommendation
              name={project.recommendation!.name}
              role={project.recommendation!.role || undefined}
              text={project.recommendation!.text}
            />
          </section>
        )}
      </div>

      <ProjectNavigation
        prevProject={prevProject}
        nextProject={nextProject}
      />
    </div>
  );
};

export default ProjectDetailPage;
