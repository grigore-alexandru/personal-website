import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PdfViewerLoader as PdfViewer } from '../../../components/documents/PdfViewerLoader';
import { getDocumentBySlug, listDocumentSlugs, withCacheBust } from '../../../utils/documentsService';
import { buildMetadata, noindexMetadata } from '../../../lib/seo';
import { JsonLd } from '../../../components/seo/JsonLd';
import { documentDescription } from '../../../lib/itemMeta';
import {
  SITE_URL,
  SITE_IN_LANGUAGE,
  PERSON_ID,
  ogImage,
  metaDescription,
} from '../../../config/site';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await listDocumentSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const doc = await getDocumentBySlug(params.slug);
  if (!doc) return noindexMetadata('Document Not Found');

  return buildMetadata({
    title: doc.title,
    description: documentDescription(doc),
    path: `/documents/${doc.slug}`,
    image: doc.thumbnailUrl ? withCacheBust(doc.thumbnailUrl, doc.updatedAt) : null,
    // No thumbnail: a card carrying this document's own title.
    card: { type: 'documents', slug: doc.slug, updatedAt: doc.updatedAt },
    imageAlt: doc.title,
    type: 'article',
    publishedTime: doc.createdAt,
    modifiedTime: doc.updatedAt,
  });
}

export default async function DocumentPage({ params }: PageProps) {
  const doc = await getDocumentBySlug(params.slug);
  if (!doc) notFound();

  const canonicalUrl = `${SITE_URL}/documents/${doc.slug}`;
  const description = metaDescription(documentDescription(doc));

  return (
    <main className="min-h-screen bg-surface-sunken">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'DigitalDocument',
          name: doc.title,
          description,
          url: canonicalUrl,
          image: ogImage(doc.thumbnailUrl ? withCacheBust(doc.thumbnailUrl, doc.updatedAt) : null, {
            type: 'documents',
            slug: doc.slug,
            updatedAt: doc.updatedAt,
          }),
          dateCreated: doc.createdAt,
          dateModified: doc.updatedAt,
          inLanguage: SITE_IN_LANGUAGE,
          author: { '@id': PERSON_ID },
          publisher: { '@id': PERSON_ID },
          ...(doc.pageCount ? { numberOfPages: doc.pageCount } : {}),
        }}
      />

      {/* The toolbar and the PDF are the entire visible page — that is
          deliberate. But a document with no text at all is unrankable and
          fails every heading check, so the title and description are rendered
          for assistive tech and crawlers without changing the layout. */}
      <h1 className="sr-only">{doc.title}</h1>
      {doc.description && <p className="sr-only">{doc.description}</p>}

      <PdfViewer
        fileUrl={withCacheBust(doc.fileUrl, doc.updatedAt)}
        slug={doc.slug}
        title={doc.title}
        thumbnailUrl={doc.thumbnailUrl ? withCacheBust(doc.thumbnailUrl, doc.updatedAt) : null}
      />
    </main>
  );
}
