import type { Metadata } from 'next';
import { Suspense } from 'react';
import { loadAllPosts, countAllPosts } from '../../utils/blogLoader';
import { buildMetadata } from '../../lib/seo';
import { PAGE_CARDS } from '../../config/pageCards';
import BlogListClient from './BlogListClient';
import { BlogPostCardSkeleton } from '../../components/ui/SkeletonLoader';

export const metadata: Metadata = buildMetadata({
  title: 'Blog',
  description: PAGE_CARDS.blog.description,
  card: 'blog',
  path: '/blog',
});

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
