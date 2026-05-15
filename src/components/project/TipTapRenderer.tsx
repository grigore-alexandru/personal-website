'use client';

import React from 'react';
import DOMPurify, { type Config } from 'dompurify';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { TipTapContent } from '../../types';
import { designTokens } from '../../styles/tokens';

const TIPTAP_SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'strong', 'em', 'ul', 'ol', 'li',
    'a', 'br', 'img', 'blockquote', 'code', 'pre',
  ],
  ALLOWED_ATTR: ['href', 'rel', 'target', 'src', 'alt', 'width', 'height'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: false,
};

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    const href = node.getAttribute('href') ?? '';
    if (!/^https?:\/\//i.test(href)) {
      node.removeAttribute('href');
    }
    node.setAttribute('rel', 'noopener noreferrer');
    node.setAttribute('target', '_blank');
  }
  if (node.tagName === 'IMG') {
    const src = node.getAttribute('src') ?? '';
    if (!/^https?:\/\//i.test(src) && !src.startsWith('/')) {
      node.removeAttribute('src');
    }
  }
});

interface TipTapRendererProps {
  content: TipTapContent;
  className?: string;
}

const TipTapRenderer: React.FC<TipTapRendererProps> = ({ content, className = '' }) => {
  const renderContent = () => {
    try {
      const validContent =
        content && typeof content === 'object' && content.type === 'doc'
          ? content
          : { type: 'doc', content: [] };

      const html = generateHTML(validContent, [
        StarterKit.configure({ heading: { levels: [2, 3] } }),
        Image,
        LinkExtension.configure({
          openOnClick: false,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        }),
      ]);

      const safeHtml = DOMPurify.sanitize(html, TIPTAP_SANITIZE_CONFIG) as string;

      return (
        <div
          className={`tiptap-rendered ${className}`}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      );
    } catch {
      return null;
    }
  };

  return (
    <>
      {renderContent()}
      <style>{`
        .tiptap-rendered p {
          font-size: ${designTokens.typography.sizes.sm};
          font-family: ${designTokens.typography.fontFamily};
          font-weight: ${designTokens.typography.weights.regular};
          line-height: ${designTokens.typography.lineHeights.body};
          color: rgb(55, 65, 81);
          margin-bottom: 1rem;
        }
        .tiptap-rendered h2 {
          font-size: ${designTokens.typography.sizes.lg};
          font-family: ${designTokens.typography.fontFamily};
          font-weight: ${designTokens.typography.weights.bold};
          line-height: ${designTokens.typography.lineHeights.heading};
          color: ${designTokens.colors.textPrimary};
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        .tiptap-rendered h3 {
          font-size: ${designTokens.typography.sizes.md};
          font-family: ${designTokens.typography.fontFamily};
          font-weight: ${designTokens.typography.weights.bold};
          line-height: ${designTokens.typography.lineHeights.heading};
          color: ${designTokens.colors.textPrimary};
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .tiptap-rendered ul, .tiptap-rendered ol {
          font-size: ${designTokens.typography.sizes.sm};
          font-family: ${designTokens.typography.fontFamily};
          color: rgb(55, 65, 81);
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .tiptap-rendered ul { list-style-type: disc; }
        .tiptap-rendered ol { list-style-type: decimal; }
        .tiptap-rendered li { margin-bottom: 0.5rem; }
        .tiptap-rendered img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 2rem 0;
          display: block;
        }
        .tiptap-rendered strong { font-weight: ${designTokens.typography.weights.bold}; }
        .tiptap-rendered em { font-style: italic; }
        .tiptap-rendered a { color: #2563eb; text-decoration: underline; }
        .tiptap-rendered a:hover { color: #1d4ed8; }
      `}</style>
    </>
  );
};

export default TipTapRenderer;
