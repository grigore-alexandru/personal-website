import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../../../config/site';
import { loadPublishedContentWithProjects, countPublishedContent } from '../../../utils/contentService';
import { loadAllClients, loadProjectTypes } from '../../../utils/portfolioService';
import ContentGridClient from './ContentGridClient';
import { ContentGridItemSkeleton } from '../../../components/ui/SkeletonLoader';

export const metadata: Metadata = {
  title: 'Content',
  description: 'Videos and photos from the work — reels, edits, and individual pieces across projects.',
  alternates: {
    canonical: `${SITE_URL}/portfolio/content`,
  },
  openGraph: {
    title: `Content | ${SITE_NAME}`,
    description: 'Videos and photos from the work — reels, edits, and individual pieces across projects.',
    url: `${SITE_URL}/portfolio/content`,
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Content | ${SITE_NAME}`,
    description: 'Videos and photos from the work — reels, edits, and individual pieces across projects.',
    images: [DEFAULT_OG_IMAGE],
  },
};

const CONTENT_PER_PAGE = 12;

export default async function ContentPortfolioPage({
  searchParams,
}: {
  searchParams: { media?: string; type?: string; client?: string; q?: string };
}) {
  const filters = {
    media: searchParams.media,
    type: searchParams.type,
    client: searchParams.client,
    q: searchParams.q,
  };

  const [initialContent, total, clients, types] = await Promise.all([
    loadPublishedContentWithProjects(CONTENT_PER_PAGE, 0, filters),
    countPublishedContent(filters),
    loadAllClients(),
    loadProjectTypes(),
  ]);

  const clientOptions = [
    { value: 'all', label: 'All Clients' },
    ...clients.map((c) => ({ value: c, label: c })),
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    ...types.map((t) => ({ value: t.name, label: t.name })),
  ];

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <main className="max-w-screen-xl mx-auto px-6 pt-12 pb-16">
            <div className="fluid-grid">
              {Array.from({ length: CONTENT_PER_PAGE }).map((_, i) => (
                <div key={i} className="relative sm:row-span-1 w-full h-full">
                  <ContentGridItemSkeleton />
                </div>
              ))}
            </div>
          </main>
        </div>
      }
    >
      <ContentGridClient
        initialContent={initialContent}
        totalContent={total}
        clientOptions={clientOptions}
        typeOptions={typeOptions}
        contentPerPage={CONTENT_PER_PAGE}
      />
    </Suspense>
  );
}
