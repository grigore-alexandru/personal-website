import React from 'react';
import { Link } from 'react-router-dom';
import { BlogPost } from '../utils/blogLoader';
import { designTokens } from '../styles/tokens';

interface BlogPostCardProps {
  post: BlogPost;
}

const BlogPostCard: React.FC<BlogPostCardProps> = ({ post }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * Robust Excerpt Extraction: 
   * Scans the content array for the first 'body' block if post.excerpt is empty.
   */
  const getExcerpt = () => {
    if (post.excerpt && post.excerpt.trim() !== '') return post.excerpt;
    
    // Fallback: Find the first content block of type 'body'
    const firstBodyBlock = post.content?.find(block => block.type === 'body');
    return firstBodyBlock?.data?.text || '';
  };

  const truncateExcerpt = (text: string, maxLength: number = 240) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const finalExcerpt = truncateExcerpt(getExcerpt());

  return (
    <article className="bg-white mb-16 border-none shadow-none">
      {/* 1. Header Section: Full Width Title & Meta */}
      <div className="mb-6">
        <Link to={`/blog/${post.slug}`} className="block">
          <h2
            className="text-black mb-2 hover:text-neutral-700 transition-colors"
            style={{
              fontSize: designTokens.typography.sizes.xl,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
              letterSpacing: '-0.02em',
            }}
          >
            {post.title}
          </h2>
        </Link>
        <p
          className="text-neutral-500 uppercase tracking-widest"
          style={{
            fontSize: '11px',
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.medium,
          }}
        >
          {formatDate(post.publishedAt)} <span className="mx-2 text-neutral-300">|</span> GLORIA
        </p>
      </div>

      {/* 2. Split Content Section: Image Left, Text Right */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left: Image (50% width on desktop) */}
        {(post.heroImageThumbnail || post.heroImageUrl) && (
          <div className="w-full md:w-1/2 flex-shrink-0">
            <Link to={`/blog/${post.slug}`} className="block overflow-hidden rounded-sm">
              <div className="relative aspect-[3/2] bg-neutral-100">
                <img
                  src={post.heroImageThumbnail || post.heroImageUrl}
                  alt={post.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </Link>
          </div>
        )}

        {/* Right: Excerpt and Button */}
        <div className="flex-1">
          <p
            className="text-neutral-600 mb-8"
            style={{
              fontSize: designTokens.typography.sizes.sm,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.regular,
              lineHeight: '1.7',
            }}
          >
            {finalExcerpt}
          </p>

          <Link
            to={`/blog/${post.slug}`}
            className="inline-block px-10 py-3 bg-neutral-600 text-white transition-colors hover:bg-black uppercase tracking-widest"
            style={{
              fontSize: '11px',
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
            }}
          >
            Read More
          </Link>
        </div>
      </div>
    </article>
  );
};

export default BlogPostCard;