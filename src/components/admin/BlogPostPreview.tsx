import { Source, TipTapContent } from '../../types';
import { ExternalLink } from 'lucide-react';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { designTokens } from '../../styles/tokens';

interface BlogPostPreviewProps {
  title: string;
  content: TipTapContent;
  hasSources: boolean;
  sources: Source[];
  hasNotes: boolean;
  notesContent: string;
}

export function BlogPostPreview({
  title,
  content,
  hasSources,
  sources,
  hasNotes,
  notesContent,
}: BlogPostPreviewProps) {
  const html = generateHTML(content, [
    StarterKit.configure({
      heading: {
        levels: [2],
      },
    }),
    Image,
  ]);

  const renderNotesContent = (content: string) => {
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  };

  const completeSources = sources.filter(s => s.title.trim() && s.url.trim());

  return (
    <div className="bg-white min-h-screen">
      <article className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-black mb-8">
          {title || 'Untitled Post'}
        </h1>

        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {hasSources && completeSources.length > 0 && (
          <div className="mt-12 pt-8 border-t border-neutral-200">
            <h3 className="text-xl font-bold text-black mb-4">Sources</h3>
            <ol className="space-y-3">
              {completeSources.map((source, index) => (
                <li key={source.id} className="flex items-start gap-3">
                  <span className="text-neutral-600 font-semibold flex-shrink-0">
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black hover:text-neutral-600 transition-colors inline-flex items-center gap-1 group"
                    >
                      <span className="font-medium">{source.title}</span>
                      <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {hasNotes && notesContent.trim() && (
          <div className="mt-12 p-6 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
            <h3 className="text-lg font-bold text-black mb-3">Notes</h3>
            <div
              className="text-neutral-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderNotesContent(notesContent) }}
            />
          </div>
        )}
      </article>

      <style>{`
        .prose {
          font-family: ${designTokens.typography.fontFamily};
        }

        .prose p {
          font-size: ${designTokens.typography.sizes.sm};
          font-weight: ${designTokens.typography.weights.regular};
          line-height: ${designTokens.typography.lineHeights.body};
          color: rgb(55, 65, 81);
          margin-bottom: 1rem;
        }

        .prose h2 {
          font-size: ${designTokens.typography.sizes.lg};
          font-weight: ${designTokens.typography.weights.bold};
          line-height: ${designTokens.typography.lineHeights.heading};
          color: ${designTokens.colors.textPrimary};
          margin-top: 2rem;
          margin-bottom: 1rem;
        }

        .prose h2:first-child {
          margin-top: 0;
        }

        .prose ul,
        .prose ol {
          font-size: ${designTokens.typography.sizes.sm};
          font-weight: ${designTokens.typography.weights.regular};
          line-height: ${designTokens.typography.lineHeights.body};
          color: rgb(55, 65, 81);
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }

        .prose ul {
          list-style-type: disc;
        }

        .prose ol {
          list-style-type: decimal;
        }

        .prose li {
          margin-bottom: 0.5rem;
        }

        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 2rem 0;
          display: block;
        }

        .prose strong {
          font-weight: ${designTokens.typography.weights.bold};
        }

        .prose em {
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
