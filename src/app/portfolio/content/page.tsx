import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../../../config/seo';
import { loadPublishedContentWithProjects, countPublishedContent } from '../../../utils/contentService';
import { loadAllClients, loadProjectTypes } from '../../../utils/portfolioService';
import ContentGridClient from './ContentGridClient';
import { ContentGridItemSkeleton } from '../../../components/ui/SkeletonLoader';

export const metadata: Metadata = {
  title: 'Content Portfolio',
  description: 'Browse the full content portfolio — videos, photos, and productions across clients and formats.',
  alternates: {
    canonical: `${SITE_URL}/portfolio/content`,
  },
  openGraph: {
    title: `Content Portfolio | ${SITE_NAME}`,
    description: 'Browse the full content portfolio — videos, photos, and productions across clients and formats.',
    url: `${SITE_URL}/portfolio/content`,
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Content Portfolio | ${SITE_NAME}`,
    description: 'Browse the full content portfolio — videos, photos, and productions across clients and formats.',
    images: [DEFAULT_OG_IMAGE],
  },
};

const CONTENT_PER_PAGE = 12;

export default async function ContentPortfolioPage() {
  const [initialContent, total, clients, types] = await Promise.all([
    loadPublishedContentWithProjects(CONTENT_PER_PAGE, 0),
    countPublishedContent(),
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
