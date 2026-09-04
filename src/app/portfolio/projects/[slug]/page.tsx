import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import {
  SITE_URL,
  SITE_IN_LANGUAGE,
  PERSON_ID,
  ogImage,
} from '../../../../config/site';
import { buildMetadata, noindexMetadata } from '../../../../lib/seo';
import { JsonLd } from '../../../../components/seo/JsonLd';
import { loadProject, loadProjects, loadAdjacentProjects } from '../../../../utils/dataLoader';
import { designTokens } from '../../../../styles/tokens';
import ProjectHero from '../../../../components/ProjectHero';
import ImpactMetrics from '../../../../components/project/ImpactMetrics';
import TipTapRenderer from '../../../../components/project/TipTapRenderer';
import ProjectNavigation from '../../../../components/project/ProjectNavigation';

/*
 * Below-the-fold sections, code-split into their own chunks (still
 * server-rendered — no `ssr: false` — so there's no content flash and no
 * SEO regression, just a smaller critical-path bundle for the above-the-fold
 * hero + description that visitors see first).
 */
const MediaCarousel = dynamic(() => import('../../../../components/project/MediaCarousel'));
const TasksList = dynamic(() => import('../../../../components/project/TasksList'));
const Recommendation = dynamic(() => import('../../../../components/project/Recommendation'));

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const projects = await loadProjects(200, 0);
  return projects.map((p) => ({ slug: p.slug }));
}

function projectDescription(project: {
  project_type: { name: string };
  client_name: string;
}): string {
  return `${project.project_type.name} project for ${project.client_name}.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const project = await loadProject(params.slug);
  if (!project) return noindexMetadata('Project Not Found');

  return buildMetadata({
    title: project.title,
    description: projectDescription(project),
    path: `/portfolio/projects/${project.slug}`,
    image: project.hero_image_large,
    imageAlt: project.title,
    type: 'article',
    publishedTime: project.created_at,
    modifiedTime: project.updated_at ?? project.created_at,
  });
}

const sectionHeadingStyle = {
  fontFamily: designTokens.typography.fontFamily,
  fontSize: designTokens.typography.sizes.lg,
  fontWeight: designTokens.typography.weights.bold,
  lineHeight: designTokens.typography.lineHeights.heading,
  color: designTokens.colors.textPrimary,
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const project = await loadProject(params.slug);

  if (!project) {
    notFound();
  }

  // Two indexed lookups rather than loading the whole portfolio to index into it.
  const { prevProject, nextProject } = await loadAdjacentProjects(project.order_index);

  const canonicalUrl = `${SITE_URL}/portfolio/projects/${project.slug}`;

  const hasMetrics = project.impact_metrics && project.impact_metrics.length > 0;
  const hasContent = project.project_content.length > 0;
  const hasTasks = project.tasks && project.tasks.length > 0;
  const hasRecommendation = project.recommendation !== null;

  return (
    <div className="min-h-screen bg-white pb-20">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: project.title,
          description: projectDescription(project),
          image: ogImage(project.hero_image_large),
          url: canonicalUrl,
          dateCreated: project.created_at,
          dateModified: project.updated_at ?? project.created_at,
          inLanguage: SITE_IN_LANGUAGE,
          genre: project.project_type.name,
          creator: { '@id': PERSON_ID },
          about: { '@type': 'Organization', name: project.client_name },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Portfolio', item: `${SITE_URL}/portfolio` },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Projects',
              item: `${SITE_URL}/portfolio/projects`,
            },
            { '@type': 'ListItem', position: 3, name: project.title, item: canonicalUrl },
          ],
        }}
      />
      {/* No manual <link rel="preload"> here: ProjectHero renders the image
          via next/image with `priority`, which emits the correct preload
          link itself (pointing at the actual optimized URL that will be
          requested) — a separate manual preload for the raw original URL
          would just cause the browser to fetch two different resources. */}
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
          <TipTapRenderer content={project.description} />
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
