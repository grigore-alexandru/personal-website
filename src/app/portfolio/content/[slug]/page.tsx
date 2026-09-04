import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  SITE_URL,
  SITE_NAME,
  SITE_IN_LANGUAGE,
  PERSON_ID,
  ogImage,
  metaDescription,
} from '../../../../config/site';
import { buildMetadata, noindexMetadata } from '../../../../lib/seo';
import { JsonLd } from '../../../../components/seo/JsonLd';
import {
  loadContentBySlug,
  loadAdjacentContent,
  loadPublishedContentWithProjects,
} from '../../../../utils/contentService';
import { ContentDetailView } from '../../../../components/content/ContentDetailView';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const content = await loadPublishedContentWithProjects(200, 0);
  return content.map((c) => ({ slug: c.slug }));
}

/** The single stored derivative — a poster capped at 480px wide at upload time.
 *  ogImage() is what lifts it to the 1200x630 the platforms require. */
function posterUrl(content: { thumbnail: unknown }): string | null {
  return content.thumbnail && typeof content.thumbnail === 'object' && 'poster' in content.thumbnail
    ? ((content.thumbnail as { poster: string }).poster ?? null)
    : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const content = await loadContentBySlug(params.slug);
  if (!content) return noindexMetadata('Content Not Found');

  const isVideo = content.content_type?.slug === 'video';

  return buildMetadata({
    title: content.title,
    description: content.caption ?? `${isVideo ? 'Video' : 'Image'} by ${SITE_NAME}`,
    path: `/portfolio/content/${content.slug}`,
    // Falls back to the default card when a row has no poster, rather than
    // shipping an empty images array and therefore no og:image at all.
    image: posterUrl(content),
    imageAlt: content.title,
    type: isVideo ? 'video.other' : 'website',
    publishedTime: content.published_at ?? content.created_at,
  });
}

export default async function ContentDetailPage({ params }: PageProps) {
  const content = await loadContentBySlug(params.slug);
  if (!content) notFound();

  const adjacent = await loadAdjacentContent(content.order_index);

  const isVideo = content.content_type?.slug === 'video';
  const poster = posterUrl(content);
  const canonicalUrl = `${SITE_URL}/portfolio/content/${content.slug}`;
  const description = metaDescription(content.caption);

  return (
    <>
      <JsonLd
        data={
          isVideo
            ? {
                '@context': 'https://schema.org',
                '@type': 'VideoObject',
                name: content.title,
                description,
                thumbnailUrl: ogImage(poster),
                contentUrl: content.url,
                url: canonicalUrl,
                uploadDate: content.published_at ?? content.created_at,
                inLanguage: SITE_IN_LANGUAGE,
                creator: { '@id': PERSON_ID },
              }
            : {
                '@context': 'https://schema.org',
                '@type': 'ImageObject',
                name: content.title,
                description,
                contentUrl: content.url,
                thumbnailUrl: ogImage(poster),
                url: canonicalUrl,
                creator: { '@id': PERSON_ID },
              }
        }
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
              name: 'Content',
              item: `${SITE_URL}/portfolio/content`,
            },
            { '@type': 'ListItem', position: 3, name: content.title, item: canonicalUrl },
          ],
        }}
      />
      <ContentDetailView
        content={content}
        prevSlug={adjacent.prevSlug}
        nextSlug={adjacent.nextSlug}
      />
    </>
  );
}
