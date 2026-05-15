import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../../../../config/seo';
import { loadProject, loadProjects } from '../../../../utils/dataLoader';
import { designTokens } from '../../../../styles/tokens';
import ProjectHero from '../../../../components/ProjectHero';
import ImpactMetrics from '../../../../components/project/ImpactMetrics';
import TipTapRendererClient from '../../../../components/project/TipTapRendererClient';
import MediaCarousel from '../../../../components/project/MediaCarousel';
import TasksList from '../../../../components/project/TasksList';
import Recommendation from '../../../../components/project/Recommendation';
import ProjectNavigation from '../../../../components/project/ProjectNavigation';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const projects = await loadProjects(200, 0);
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const project = await loadProject(params.slug);
  if (!project) {
    return { title: 'Project Not Found' };
  }

  const description = `${project.project_type.name} project for ${project.client_name}.`;
  const ogImage = project.hero_image_large || DEFAULT_OG_IMAGE;

  return {
    title: project.title,
    description,
    alternates: {
      canonical: `${SITE_URL}/portfolio/projects/${project.slug}`,
    },
    openGraph: {
      title: `${project.title} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/portfolio/projects/${project.slug}`,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.title} | ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
    other: {
      'script:ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: project.title,
        description,
        image: ogImage,
        url: `${SITE_URL}/portfolio/projects/${project.slug}`,
        creator: { '@type': 'Organization', name: SITE_NAME },
      }),
    },
  };
}

const sectionHeadingStyle = {
  fontFamily: designTokens.typography.fontFamily,
  fontSize: designTokens.typography.sizes.lg,
  fontWeight: designTokens.typography.weights.bold,
  lineHeight: designTokens.typography.lineHeights.heading,
  color: designTokens.colors.textPrimary,
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const [project, allProjects] = await Promise.all([
    loadProject(params.slug),
    loadProjects(200, 0),
  ]);

  if (!project) {
    notFound();
  }

  const currentIndex = allProjects.findIndex((p) => p.id === project.id);
  const prevProject = currentIndex > 0 ? allProjects[currentIndex - 1] : null;
  const nextProject = currentIndex < allProjects.length - 1 ? allProjects[currentIndex + 1] : null;

  const hasMetrics = project.impact_metrics && project.impact_metrics.length > 0;
  const hasContent = project.project_content.length > 0;
  const hasTasks = project.tasks && project.tasks.length > 0;
  const hasRecommendation = project.recommendation !== null;

  return (
    <div className="min-h-screen bg-white pb-20">
      {project.hero_image_large && (
        <link rel="preload" as="image" href={project.hero_image_large} />
      )}

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
          <h2 className="mb-8" style={sectionHeadingStyle}>
            About the Project
          </h2>
          <TipTapRendererClient content={project.description} />
        </section>

        {hasContent && (
          <section className="py-12 md:py-16 border-t border-gray-100">
            <h2 className="mb-8" style={sectionHeadingStyle}>
              Gallery
            </h2>
            <MediaCarousel items={project.project_content} />
          </section>
        )}

        {hasTasks && (
          <section className="py-12 md:py-16 border-t border-gray-100">
            <h2 className="mb-8" style={sectionHeadingStyle}>
              Tasks
            </h2>
            <TasksList tasks={project.tasks} />
          </section>
        )}

        {hasRecommendation && (
          <section className="py-12 md:py-16 border-t border-gray-100">
            <h2 className="mb-8" style={sectionHeadingStyle}>
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

      <ProjectNavigation prevProject={prevProject} nextProject={nextProject} />
    </div>
  );
}
