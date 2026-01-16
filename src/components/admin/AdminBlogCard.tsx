import React, { useState, useEffect } from 'react';
import { Edit, MoreVertical, Loader2 } from 'lucide-react';
import { BlogPost } from '../../utils/blogLoader';
import { designTokens } from '../../styles/tokens';
import { formatDistanceToNow } from '../../utils/dateUtils';

interface AdminBlogCardProps {
  post: BlogPost;
  onEdit: (postId: string) => void;
  onToggleStatus: (postId: string, currentStatus: boolean) => Promise<void>;
  onDelete: (postId: string) => void;
  onRepublish?: (postId: string) => void;
}

export const AdminBlogCard: React.FC<AdminBlogCardProps> = ({
  post,
  onEdit,
  onToggleStatus,
  onDelete,
  onRepublish,
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const extractFirstParagraph = (content: any): string => {
    if (!content || !content.content || !Array.isArray(content.content)) {
      return '';
    }

    const firstParagraph = content.content.find(
      (node: any) => node.type === 'paragraph' && node.content && node.content.length > 0
    );

    if (!firstParagraph || !firstParagraph.content) {
      return '';
    }

    const text = firstParagraph.content
      .filter((node: any) => node.type === 'text')
      .map((node: any) => node.text || '')
      .join('');

    return text;
  };

  const truncateExcerpt = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setIsToggling(true);
    try {
      await onToggleStatus(post.id, post.isDraft || false);
    } finally {
      setIsToggling(false);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onDelete(post.id);
  };

  const handleRepublish = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onRepublish) {
      onRepublish(post.id);
    }
  };

  const excerptText = extractFirstParagraph(post.content);
  const displayExcerpt = truncateExcerpt(excerptText, isMobile ? 120 : 280);

  return (
    <article className="relative block bg-white border border-gray-100 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200 group">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <span
          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
            post.isDraft
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-green-100 text-green-800 border border-green-300'
          }`}
        >
          {post.isDraft ? 'DRAFT' : 'PUBLISHED'}
        </span>

        <div className="relative flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2 py-1">
          {isToggling ? (
            <Loader2 size={16} className="text-gray-400 animate-spin" />
          ) : (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!post.isDraft}
                onChange={handleToggle}
                disabled={isToggling}
                className="sr-only peer"
                aria-label="Toggle publish status"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          )}

          <button
            onClick={handleMenuClick}
            className="p-1 rounded hover:bg-gray-50 transition-colors"
            aria-label="More options"
          >
            <MoreVertical size={16} className="text-gray-600" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40 z-30">
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  Delete
                </button>
                {!post.isDraft && onRepublish && (
                  <button
                    onClick={handleRepublish}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    Republish
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-6 pt-16">
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
          <div className="flex flex-col gap-0.5">
            <p
              className="text-gray-500"
              style={{
                fontSize: designTokens.typography.sizes.xs,
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.regular,
              }}
            >
              Updated {formatDistanceToNow(post.updatedAt || post.createdAt || '')}
            </p>
            {!post.isDraft && post.publishedAt && (
              <p
                className="text-gray-400"
                style={{
                  fontSize: designTokens.typography.sizes.xs,
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.regular,
                }}
              >
                Published {formatDate(post.publishedAt)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {post.heroImageThumbnail && (
            <div className="w-full md:w-2/5 flex-shrink-0">
              <div className="relative w-full pt-[60%] bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={post.heroImageThumbnail}
                  alt={post.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-between">
            {displayExcerpt && (
              <p
                className="text-gray-700 mb-4"
                style={{
                  fontSize: designTokens.typography.sizes.sm,
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.regular,
                  lineHeight: designTokens.typography.lineHeights.body,
                }}
              >
                {displayExcerpt}
              </p>
            )}

            <div className="flex items-center justify-end">
              <button
                onClick={() => onEdit(post.id)}
                className="inline-flex items-center gap-2 px-4 py-2 text-white bg-black font-medium rounded-lg hover:bg-gray-800 transition-colors duration-200"
                style={{
                  fontSize: designTokens.typography.sizes.sm,
                  fontFamily: designTokens.typography.fontFamily,
                  fontWeight: designTokens.typography.weights.medium,
                }}
              >
                <Edit size={16} />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
