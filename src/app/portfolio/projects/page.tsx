import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildMetadata } from '../../../lib/seo';
import { loadProjects, countProjects } from '../../../utils/dataLoader';
import { loadProjectTypes, loadAllClients } from '../../../utils/portfolioService';
import ProjectsListClient from './ProjectsListClient';
import { ProjectCardSkeleton } from '../../../components/ui/SkeletonLoader';

export const metadata: Metadata = buildMetadata({
  title: 'Projects',
  description: 'Commercials, documentaries, and branded content — the projects I\'ve directed and produced.',
  path: '/portfolio/projects',
});

const BATCH_SIZE = 12;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; client?: string };
}) {
  const filters = {
    q: searchParams.q,
    type: searchParams.type,
    client: searchParams.client,
  };

  const [initialProjects, typesData, total, clients] = await Promise.all([
    loadProjects(BATCH_SIZE, 0, filters),
    loadProjectTypes(),
    countProjects(filters),
    loadAllClients(),
  ]);

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    ...typesData.map((t) => ({ value: t.slug, label: t.name })),
  ];

  const clientOptions = [
    { value: 'all', label: 'All Clients' },
    ...clients.map((c) => ({ value: c, label: c })),
  ];

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <main className="max-w-screen-xl mx-auto px-6 pt-12 pb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: BATCH_SIZE }).map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          </main>
        </div>
      }
    >
      <ProjectsListClient
        initialProjects={initialProjects}
        totalProjects={total}
        typeOptions={typeOptions}
        clientOptions={clientOptions}
        batchSize={BATCH_SIZE}
      />
    </Suspense>
  );
}
