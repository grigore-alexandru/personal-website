'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard as Edit } from 'lucide-react';
import { BlogPost } from '../../utils/blogLoader';
import { designTokens } from '../../styles/tokens';
import { formatDistanceToNow } from '../../utils/dateUtils';
import { ProgressiveImage } from '../ui/ProgressiveImage';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { KebabMenu } from '../ui/KebabMenu';

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
  const [isMobile, setIsMobile] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
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
          <ToggleSwitch
            checked={!post.isDraft}
            onChange={handleToggle}
            disabled={isToggling}
            loading={isToggling}
            ariaLabel="Toggle publish status"
          />

          <KebabMenu
            items={[
              { label: 'Delete', variant: 'danger', onClick: () => onDelete(post.id) },
              {
                label: 'Republish',
                hidden: post.isDraft || !onRepublish,
                onClick: () => onRepublish?.(post.id),
              },
            ]}
          />
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
              <div className="relative w-full pt-[60%] rounded-lg overflow-hidden">
                <ProgressiveImage
                  src={post.heroImageThumbnail}
                  alt={post.title}
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
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
