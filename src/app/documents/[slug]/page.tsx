import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PdfViewerLoader as PdfViewer } from '../../../components/documents/PdfViewerLoader';
import { getDocumentBySlug, listDocumentSlugs, withCacheBust } from '../../../utils/documentsService';
import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE } from '../../../config/site';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await listDocumentSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const doc = await getDocumentBySlug(params.slug);
  if (!doc) {
    return { title: 'Document Not Found', robots: { index: false, follow: false } };
  }

  const description = doc.description || `${doc.title} — a document from ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}/documents/${doc.slug}`;
  const ogImage = doc.thumbnailUrl ? withCacheBust(doc.thumbnailUrl, doc.updatedAt) : DEFAULT_OG_IMAGE;

  return {
    title: doc.title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${doc.title} | ${SITE_NAME}`,
      description,
      url: canonicalUrl,
      type: 'website',
      images: [{ url: ogImage, alt: doc.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${doc.title} | ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
    other: {
      'script:ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'DigitalDocument',
        name: doc.title,
        description,
        url: canonicalUrl,
        image: ogImage,
        dateModified: doc.updatedAt,
        publisher: { '@type': 'Organization', name: SITE_NAME },
      }),
    },
  };
}

export default async function DocumentPage({ params }: PageProps) {
  const doc = await getDocumentBySlug(params.slug);
  if (!doc) notFound();

  return (
    <main className="min-h-screen bg-surface-sunken">
      {/* Intentionally no title/description header here — the toolbar and
          the PDF itself are the entire page. The title/description still
          drive the page's <title>, OG card, and JSON-LD via generateMetadata
          above; they're just never rendered as on-page text. */}
      <PdfViewer
        fileUrl={withCacheBust(doc.fileUrl, doc.updatedAt)}
        slug={doc.slug}
        title={doc.title}
        thumbnailUrl={doc.thumbnailUrl ? withCacheBust(doc.thumbnailUrl, doc.updatedAt) : null}
      />
    </main>
  );
}
