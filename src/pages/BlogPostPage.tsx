import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { loadPost, BlogPost } from '../utils/blogLoader';
import { designTokens } from '../styles/tokens';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBackButton, setShowBackButton] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;

      try {
        const postData = await loadPost(slug);
        setPost(postData);
      } catch (error) {
        console.error('Error loading post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackButton(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-black mb-4">Post Not Found</h1>
            <Link
              to="/blog"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Return to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!post?.content) return null;

    try {
      const validContent = post.content && typeof post.content === 'object' && post.content.type === 'doc'
        ? post.content
        : { type: 'doc', content: [] };

      const html = generateHTML(validContent, [
        StarterKit.configure({
          heading: {
            levels: [2],
          },
        }),
        Image,
        LinkExtension.configure({
          openOnClick: false,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        }),
      ]);

      return (
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch (error) {
      console.error('Error rendering content:', error);
      return (
        <div className="text-neutral-500 italic">
          <p>Unable to render content</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Back Button */}
      {showBackButton && (
        <Link
          to="/blog"
          className="fixed bottom-8 left-8 z-50 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
      )}

      {/* Content Container */}
      <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 pt-12 pb-12 md:pt-16 md:pb-16">
        {/* Post Title */}
        <h1
          className="text-black font-bold mb-8 text-center"
          style={{
            fontSize: designTokens.typography.sizes.xxl,
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.bold,
            lineHeight: designTokens.typography.lineHeights.heading,
          }}
        >
          {post.title}
        </h1>

        {/* Publish Date */}
        <p
          className="text-gray-500 text-center mb-12"
          style={{
            fontSize: designTokens.typography.sizes.xs,
            fontFamily: designTokens.typography.fontFamily,
          }}
        >
          {new Date(post.publishedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        {/* Hero Image */}
        {post.heroImageLarge && (
          <div className="mb-12 md:mb-16">
            <div className="relative w-full overflow-hidden rounded-lg shadow-sm">
              <img
                src={post.heroImageLarge}
                alt={post.title}
                className="w-full h-auto object-cover"
                style={{
                  maxHeight: '500px',
                }}
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mb-12 md:mb-16">
          {renderContent()}
        </div>

        {/* Sources Section */}
        {post.hasSources && post.sourcesData.length > 0 && (
          <section className="mb-12 md:mb-16 pt-8 border-t border-gray-200">
            <h2
              className="text-black font-bold mb-6"
              style={{
                fontSize: designTokens.typography.sizes.lg,
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.bold,
                lineHeight: designTokens.typography.lineHeights.heading,
              }}
            >
              Sources
            </h2>
            <ul className="space-y-3">
              {post.sourcesData.map((source, index) => (
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

        {/* Notes Section */}
        {post.hasNotes && post.notesContent && (
          <section className="mb-12 md:mb-16">
            <div
              className="bg-gray-50 border border-gray-200 rounded-lg p-6 md:p-8"
              style={{
                backgroundColor: designTokens.colors.shadow,
              }}
            >
              <h2
                className="text-black font-bold mb-4"
                style={{
                  fontSize: designTokens.typography.sizes.lg,
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.bold,
                  lineHeight: designTokens.typography.lineHeights.heading,
                }}
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
                {post.notesContent}
              </p>
            </div>
          </section>
        )}
      </div>

      <style>{`
        .prose p {
          font-size: ${designTokens.typography.sizes.sm};
          font-family: ${designTokens.typography.fontFamily};
          font-weight: ${designTokens.typography.weights.regular};
          line-height: ${designTokens.typography.lineHeights.body};
          color: rgb(55, 65, 81);
          margin-bottom: 1rem;
        }

        .prose h2 {
          font-size: ${designTokens.typography.sizes.lg};
          font-family: ${designTokens.typography.fontFamily};
          font-weight: ${designTokens.typography.weights.bold};
          line-height: ${designTokens.typography.lineHeights.heading};
          color: ${designTokens.colors.textPrimary};
          margin-top: 2rem;
          margin-bottom: 1rem;
        }

        .prose h2:first-child {
          margin-top: 0;
        }

        .prose ul,
        .prose ol {
          font-size: ${designTokens.typography.sizes.sm};
          font-family: ${designTokens.typography.fontFamily};
          font-weight: ${designTokens.typography.weights.regular};
          line-height: ${designTokens.typography.lineHeights.body};
          color: rgb(55, 65, 81);
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }

        .prose ul {
          list-style-type: disc;
        }

        .prose ol {
          list-style-type: decimal;
        }

        .prose li {
          margin-bottom: 0.5rem;
        }

        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 2rem 0;
          display: block;
        }

        .prose strong {
          font-weight: ${designTokens.typography.weights.bold};
        }

        .prose em {
          font-style: italic;
        }

        .prose a {
          color: #2563eb;
          text-decoration: underline;
        }

        .prose a:hover {
          color: #1d4ed8;
        }
      `}</style>
    </div>
  );
};

export default BlogPostPage;
