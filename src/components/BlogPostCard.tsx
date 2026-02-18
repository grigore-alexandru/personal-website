import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BlogPost } from '../utils/blogLoader';

interface BlogPostCardProps {
  post: BlogPost;
}

const BlogPostCard: React.FC<BlogPostCardProps> = ({ post }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const extractFirstParagraph = (content: any): string => {
    if (!content || !content.content || !Array.isArray(content.content)) return '';
    const firstParagraph = content.content.find(
      (node: any) => node.type === 'paragraph' && node.content?.length > 0
    );
    if (!firstParagraph?.content) return '';
    return firstParagraph.content
      .filter((node: any) => node.type === 'text')
      .map((node: any) => node.text || '')
      .join('');
  };

  const truncateExcerpt = (text: string, maxLength: number) =>
    text.length <= maxLength ? text : text.slice(0, maxLength).trim() + '...';

  const excerptText   = extractFirstParagraph(post.content);
  const displayExcerpt = truncateExcerpt(excerptText, isMobile ? 120 : 280);

  return (
    <article className="group block bg-surface-raised card-raised overflow-hidden">
      <div className="p-6">
        <div className="mb-4">
          <h2
            className="text-token-text-primary font-bold mb-2 group-hover:underline leading-tight"
            style={{ fontSize: '22px', letterSpacing: '-0.01em' }}
          >
            {post.title}
          </h2>
          <p className="text-xs text-token-text-muted">
            {formatDate(post.publishedAt)}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {post.heroImageThumbnail && (
            <div className="w-full md:w-2/5 flex-shrink-0">
              <div className="relative w-full pt-[60%] bg-surface-sunken rounded-token-md overflow-hidden">
                <img
                  src={post.heroImageThumbnail}
                  alt={post.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-smooth group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-between">
            {displayExcerpt && (
              <p className="text-sm text-token-text-secondary leading-relaxed mb-4">
                {displayExcerpt}
              </p>
            )}

            <div className="flex items-center justify-end">
              <Link
                to={`/blog/${post.slug}`}
                className="
                  inline-flex items-center gap-2 px-4 py-2 rounded-token-md text-sm font-medium
                  bg-accent-500 text-white
                  hover:bg-accent-600 active:bg-accent-700
                  transition-lift duration-250 ease-smooth
                  focus:outline-none focus-visible:shadow-token-focus-accent
                "
              >
                Read More
                <ArrowRight size={15} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default BlogPostCard;
