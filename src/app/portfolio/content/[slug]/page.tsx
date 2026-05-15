import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE_URL, SITE_NAME } from '../../../../config/seo';
import { loadContentBySlug, loadPublishedContentWithProjects } from '../../../../utils/contentService';
import { ContentDetailStandalone } from '../../../../components/content/ContentDetailStandalone';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const content = await loadPublishedContentWithProjects(200, 0);
  return content.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const content = await loadContentBySlug(params.slug);
  if (!content) return { title: 'Content Not Found' };

  const isVideo = content.content_type?.slug === 'video';
  const thumbnail =
    content.thumbnail && 'poster' in content.thumbnail
      ? content.thumbnail.poster
      : undefined;
  const description = content.caption ?? `${isVideo ? 'Video' : 'Image'} by ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}/portfolio/content/${content.slug}`;

  return {
    title: content.title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${content.title} | ${SITE_NAME}`,
      description,
      url: canonicalUrl,
      type: isVideo ? 'video.other' : 'website',
      images: thumbnail ? [{ url: thumbnail, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${content.title} | ${SITE_NAME}`,
      description,
      images: thumbnail ? [thumbnail] : [],
    },
    other: {
      'script:ld+json': JSON.stringify(
        isVideo
          ? {
              '@context': 'https://schema.org',
              '@type': 'VideoObject',
              name: content.title,
              description: content.caption ?? undefined,
              thumbnailUrl: thumbnail,
              url: content.url,
              uploadDate: content.published_at ?? content.created_at,
            }
          : {
              '@context': 'https://schema.org',
              '@type': 'ImageObject',
              name: content.title,
              description: content.caption ?? undefined,
              contentUrl: content.url,
              thumbnailUrl: thumbnail,
            }
      ),
    },
  };
}

export default async function ContentDetailPage({ params }: PageProps) {
  const content = await loadContentBySlug(params.slug);
  if (!content) notFound();

  return <ContentDetailStandalone content={content!} />;
}
