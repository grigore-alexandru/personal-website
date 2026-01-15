import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { loadPost, BlogPost, ContentBlock } from '../utils/blogLoader';
import Header from '../components/Header';
import { designTokens } from '../styles/tokens';

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
        <Header showFilter={false} />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <Header showFilter={false} />
        <div className="pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-black mb-4">Post Not Found</h1>
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const renderContentBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'subtitle':
        return (
          <h2
            key={index}
            className="text-black font-bold mb-4 mt-8"
            style={{
              fontSize: designTokens.typography.sizes.lg,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
            }}
          >
            {block.data.text}
          </h2>
        );

      case 'body':
        return (
          <p
            key={index}
            className="text-gray-700 leading-relaxed mb-4"
            style={{
              fontSize: designTokens.typography.sizes.sm,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.regular,
              lineHeight: designTokens.typography.lineHeights.body,
            }}
          >
            {block.data.text}
          </p>
        );

      case 'list':
        return (
          <ul
            key={index}
            className="list-disc list-inside mb-4 space-y-2"
            style={{
              fontSize: designTokens.typography.sizes.sm,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.regular,
              lineHeight: designTokens.typography.lineHeights.body,
            }}
          >
            {block.data.items?.map((item, itemIndex) => (
              <li key={itemIndex} className="text-gray-700">
                {item}
              </li>
            ))}
          </ul>
        );

      case 'image':
        return (
          <div key={index} className="mb-8">
            <img
              src={block.data.url}
              alt=""
              className="w-full h-auto rounded-lg"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header showFilter={false} />

      {/* Back Button */}
      {showBackButton && (
        <Link
          to="/"
          className="fixed bottom-8 left-8 z-50 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
      )}

      {/* Content Container */}
      <div className="max-w-3xl mx-auto px-3 sm:px-4 lg:px-6 py-12 md:py-16">
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

        {/* Content Blocks */}
        <div className="mb-12 md:mb-16">
          {post.content.map((block, index) => renderContentBlock(block, index))}
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
    </div>
  );
};

export default BlogPostPage;
