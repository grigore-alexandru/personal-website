import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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

  const truncateExcerpt = (text: string, maxLength: number = 280) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  return (
    <article className="block bg-white border border-gray-100 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200 group">
      <div className="p-6">
        <div className="mb-4">
          <h2
            className="text-black font-bold mb-2 group-hover:underline"
            style={{
              fontSize: designTokens.typography.sizes.lg,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
              letterSpacing: '-0.01em',
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

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {post.heroImageUrl && (
            <div className="w-full md:w-2/5 flex-shrink-0">
              <div className="relative w-full pt-[60%] bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={post.heroImageUrl}
                  alt={post.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center">
            {post.excerpt && (
              <p
                className="text-gray-700"
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
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Link
            to={`/blog/${post.slug}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-black font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
            style={{
              fontSize: designTokens.typography.sizes.sm,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.medium,
            }}
          >
            Read More
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default BlogPostCard;
