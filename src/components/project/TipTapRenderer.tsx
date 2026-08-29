import React from 'react';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { TipTapContent } from '../../types';
import { designTokens } from '../../styles/tokens';

/*
 * Server Component — no 'use client'. `generateHTML` is a pure function (it
 * doesn't touch window/document), so it can run entirely on the server,
 * matching the same pattern already used for blog posts
 * (src/app/blog/[slug]/page.tsx). The previous version wrapped this in a
 * client component with `dynamic(..., { ssr: false })`, which shipped the
 * TipTap engine to the browser and left the whole "About the Project"
 * section blank until that JS downloaded and ran. Rendering server-side
 * means the browser receives finished HTML on the very first response —
 * zero extra client JS, zero delay.
 *
 * No DOMPurify pass here, deliberately: this content is admin-authored
 * TipTap JSON (there is no public write path into it), and generateHTML can
 * only ever emit tags defined by the extension schema below — the same
 * trust boundary the blog post renderer already relies on.
 */

interface TipTapRendererProps {
  content: TipTapContent;
  className?: string;
}

function renderTipTapToHtml(content: TipTapContent): string {
  try {
    const validContent =
      content && typeof content === 'object' && content.type === 'doc'
        ? content
        : { type: 'doc', content: [] };

    return generateHTML(validContent, [
      // link: false — StarterKit bundles its own Link mark, which collides
      // with the separately-configured LinkExtension below (that's the
      // source of tiptap's "Duplicate extension names: ['link']" warning).
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Image,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ]);
  } catch {
    return '';
  }
}

const TipTapRenderer: React.FC<TipTapRendererProps> = ({ content, className = '' }) => {
  const html = renderTipTapToHtml(content);
  if (!html) return null;

  return (
    <>
      <div
        className={`tiptap-rendered ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
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
