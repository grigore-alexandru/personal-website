import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../../config/seo';
import { loadAllPosts, countAllPosts } from '../../utils/blogLoader';
import BlogListClient from './BlogListClient';
import { BlogPostCardSkeleton } from '../../components/ui/SkeletonLoader';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Articles, insights, and behind-the-scenes stories from the studio.',
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    title: `Blog | ${SITE_NAME}`,
    description: 'Articles, insights, and behind-the-scenes stories from the studio.',
    url: `${SITE_URL}/blog`,
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Blog | ${SITE_NAME}`,
    description: 'Articles, insights, and behind-the-scenes stories from the studio.',
    images: [DEFAULT_OG_IMAGE],
  },
};

const POSTS_PER_PAGE = 20;

export default async function BlogListPage() {
  const [initialPosts, total] = await Promise.all([
    loadAllPosts(POSTS_PER_PAGE, 0),
    countAllPosts(),
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
