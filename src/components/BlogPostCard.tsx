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

  const truncateExcerpt = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="block bg-white border border-gray-100 rounded-lg p-6 transition-all duration-300 hover:shadow-lg hover:border-gray-200"
    >
      <div className="mb-3">
        <h2
          className="text-black font-bold mb-2 hover:underline"
          style={{
            fontSize: designTokens.typography.sizes.md,
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.bold,
            lineHeight: designTokens.typography.lineHeights.heading,
          }}
        >
          {post.title}
        </h2>
        <p
          className="text-gray-500"
          style={{
            fontSize: designTokens.typography.sizes.xs,
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.regular,
          }}
        >
          {formatDate(post.publishedAt)}
        </p>
      </div>

      {post.excerpt && (
        <p
          className="text-gray-700 mb-4"
          style={{
            fontSize: designTokens.typography.sizes.sm,
            fontFamily: designTokens.typography.fontFamily,
            fontWeight: designTokens.typography.weights.regular,
            lineHeight: designTokens.typography.lineHeights.body,
          }}
        >
          {truncateExcerpt(post.excerpt)}
        </p>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
              style={{
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.regular,
                letterSpacing: designTokens.typography.letterSpacings.wide,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
};

export default BlogPostCard;
