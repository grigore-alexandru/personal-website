import type { Metadata } from 'next';
import Link from 'next/link';
import BlogHeroImage from '../../../components/blog/BlogHeroImage';
import { notFound } from 'next/navigation';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import TipTapImage from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../../../config/site';
import { loadPost, loadAllPosts } from '../../../utils/blogLoader';
import { extractTextFromTipTap } from '../../../utils/dataLoader';
import { designTokens } from '../../../styles/tokens';
import BlogPostScrollButton from '../../../components/BlogPostScrollButton';
import ScrollToTop from '../../../components/ScrollToTop';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const posts = await loadAllPosts(200, 0);
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await loadPost(params.slug);
  if (!post) return { title: 'Post Not Found' };

  const description =
    post.excerpt ||
    extractTextFromTipTap(post.content).slice(0, 160).trim() ||
    `Blog post by ${SITE_NAME}`;
  const ogImage = post.heroImageLarge || DEFAULT_OG_IMAGE;
  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;

  return {
    title: post.title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${post.title} | ${SITE_NAME}`,
      description,
      url: canonicalUrl,
      type: 'article',
      publishedTime: post.publishedAt,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
    other: {
      'script:ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description,
        image: ogImage,
        url: canonicalUrl,
        datePublished: post.publishedAt,
        author: { '@type': 'Organization', name: SITE_NAME },
        publisher: { '@type': 'Organization', name: SITE_NAME },
      }),
    },
  };
}

function renderTipTap(content: any): string {
  if (!content || typeof content !== 'object' || content.type !== 'doc') {
    return '';
  }
  try {
    return generateHTML(content, [
      // link: false — StarterKit bundles its own Link mark, which collides
      // with the separately-configured LinkExtension below.
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      TipTapImage,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
    ]);
  } catch {
    return '';
  }
}

const headingStyle = {
  fontFamily: designTokens.typography.fontFamily,
  fontWeight: designTokens.typography.weights.bold,
  lineHeight: designTokens.typography.lineHeights.heading,
  color: designTokens.colors.textPrimary,
};

export default async function BlogPostPage({ params }: PageProps) {
  const post = await loadPost(params.slug);
  if (!post) notFound();

  const contentHtml = renderTipTap(post!.content);

  return (
    <div className="min-h-screen bg-white">
      <ScrollToTop />
      <BlogPostScrollButton />

      <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 pt-12 pb-12 md:pt-16 md:pb-16">
        {/* Title */}
        <h1
          className="text-black font-bold mb-8 text-center"
          style={{
            fontSize: designTokens.typography.sizes.xxl,
            ...headingStyle,
          }}
        >
          {post!.title}
        </h1>

        {/* Publish Date */}
        <p
          className="text-gray-500 text-center mb-12"
          style={{
            fontSize: designTokens.typography.sizes.xs,
            fontFamily: designTokens.typography.fontFamily,
          }}
        >
          {new Date(post!.publishedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        {/* Hero Image — client component so it can show its own skeleton
            independently while the text above is already visible */}
        {post!.heroImageLarge && (
          <div className="mb-12 md:mb-16">
            <BlogHeroImage src={post!.heroImageLarge} alt={post!.title} />
          </div>
        )}

        {/* Content */}
        {contentHtml && (
          <div className="mb-12 md:mb-16">
            <div
              className="blog-prose"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </div>
        )}

        {/* Sources */}
        {post!.hasSources && post!.sourcesData.length > 0 && (
          <section className="mb-12 md:mb-16 pt-8 border-t border-gray-200">
            <h2
              className="text-black font-bold mb-6"
              style={{ fontSize: designTokens.typography.sizes.lg, ...headingStyle }}
            >
              Sources
            </h2>
            <ul className="space-y-3">
              {post!.sourcesData.map((source, index) => (
                <li key={index}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                    style={{
                      fontSize: designTokens.typography.sizes.sm,
                      fontFamily: designTokens.typography.fontFamily,
                      fontWeight: designTokens.typography.weights.regular,
                      lineHeight: designTokens.typography.lineHeights.body,
                    }}
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Notes */}
        {post!.hasNotes && post!.notesContent && (
          <section className="mb-12 md:mb-16">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 md:p-8">
              <h2
                className="text-black font-bold mb-4"
                style={{ fontSize: designTokens.typography.sizes.lg, ...headingStyle }}
              >
                Notes
              </h2>
              <p
                className="text-gray-700 leading-relaxed"
                style={{
                  fontSize: designTokens.typography.sizes.sm,
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.regular,
                  lineHeight: designTokens.typography.lineHeights.body,
                }}
              >
                {post!.notesContent}
              </p>
            </div>
          </section>
        )}

        {/* Back link */}
        <div className="pt-8 border-t border-gray-100">
          <Link
            href="/blog"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            style={{ fontFamily: designTokens.typography.fontFamily }}
          >
            ← Back to Blog
          </Link>
        </div>
      </div>
    </div>
  );
}
