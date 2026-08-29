import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../../config/site';
import { loadAllPosts, countAllPosts } from '../../utils/blogLoader';
import BlogListClient from './BlogListClient';
import { BlogPostCardSkeleton } from '../../components/ui/SkeletonLoader';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Notes on filmmaking, creative process, and the projects I\'m working on.',
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    title: `Blog | ${SITE_NAME}`,
    description: 'Notes on filmmaking, creative process, and the projects I\'m working on.',
    url: `${SITE_URL}/blog`,
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Blog | ${SITE_NAME}`,
    description: 'Notes on filmmaking, creative process, and the projects I\'m working on.',
    images: [DEFAULT_OG_IMAGE],
  },
};

const POSTS_PER_PAGE = 20;

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: { q?: string; date?: string };
}) {
  const filters = {
    q: searchParams.q,
    date: searchParams.date,
  };

  const [initialPosts, total] = await Promise.all([
    loadAllPosts(POSTS_PER_PAGE, 0, filters),
    countAllPosts(filters),
  ]);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <section className="max-w-4xl mx-auto px-6 pt-12 pb-16">
            <div className="space-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <BlogPostCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      }
    >
      <BlogListClient
        initialPosts={initialPosts}
        totalPosts={total}
        postsPerPage={POSTS_PER_PAGE}
      />
    </Suspense>
  );
}
