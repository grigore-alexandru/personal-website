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
      month: 'short', // 'Apr' instead of 'April' matches the reference style better
      day: 'numeric',
    });
  };

  const truncateExcerpt = (text: string, maxLength: number = 240) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '..';
  };

  return (
    <article className="block bg-white mb-12 last:mb-0">
      {/* 1. Header Section: Title & Metadata */}
      <div className="mb-6">
        <Link to={`/blog/${post.slug}`} className="block group">
          <h2
            className="text-black mb-2"
            style={{
              fontSize: '2rem', // Increased size for that editorial look
              fontFamily: 'serif', // Ensure this maps to your serif token
              fontWeight: designTokens.typography.weights.regular,
              lineHeight: '1.2',
              letterSpacing: '-0.01em',
            }}
          >
            {post.title}
          </h2>
        </Link>
        
        <p
          className="text-gray-500 uppercase tracking-wide"
          style={{
            fontSize: '0.75rem', // Smaller, distinct metadata style
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.medium,
          }}
        >
          {formatDate(post.publishedAt)} <span className="mx-1">|</span> {post.author || 'Gloria'}
        </p>
      </div>

      {/* 2. Split Content Section */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Left Column: Image */}
        {post.heroImageThumbnail ? (
          <Link to={`/blog/${post.slug}`} className="w-full md:w-1/2 block flex-shrink-0">
            <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
              <img
                src={post.heroImageThumbnail}
                alt={post.title}
                className="absolute inset-0 w-full h-full object-cover" 
              />
            </div>
          </Link>
        ) : null}

        {/* Right Column: Excerpt & Button */}
        <div className="flex-1 flex flex-col h-full justify-between">
          <p
            className="text-gray-600 mb-6"
            style={{
              fontSize: designTokens.typography.sizes.sm,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.regular,
              lineHeight: '1.6',
            }}
          >
            {truncateExcerpt(post.excerpt || '')}
          </p>

          <div>
            <Link
              to={`/blog/${post.slug}`}
              className="inline-block px-8 py-3 bg-gray-600 text-white hover:bg-gray-800 transition-colors duration-200"
              style={{
                fontSize: '0.875rem',
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.medium,
                borderRadius: '0', // Square corners like the reference
              }}
            >
              Read More
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export default BlogPostCard;