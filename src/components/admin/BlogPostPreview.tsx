import { ContentBlock, Source } from '../../types';
import { ExternalLink } from 'lucide-react';

interface BlogPostPreviewProps {
  title: string;
  heroImageUrl: string;
  contentBlocks: ContentBlock[];
  hasSources: boolean;
  sources: Source[];
  hasNotes: boolean;
  notesContent: string;
}

export function BlogPostPreview({
  title,
  heroImageUrl,
  contentBlocks,
  hasSources,
  sources,
  hasNotes,
  notesContent,
}: BlogPostPreviewProps) {
  const renderContentBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'subtitle':
        return (
          <h2 key={block.id} className="text-2xl font-bold text-black mb-4 mt-8">
            {block.content || 'Untitled Subtitle'}
          </h2>
        );
      case 'body':
        return (
          <p key={block.id} className="text-neutral-700 leading-relaxed mb-6">
            {block.content || 'Empty paragraph'}
          </p>
        );
      case 'list':
        return (
          <ul key={block.id} className="list-disc list-inside space-y-2 mb-6 text-neutral-700">
            {block.items.map((item, index) => (
              <li key={index}>{item || 'Empty item'}</li>
            ))}
          </ul>
        );
      case 'image':
        return (
          <div key={block.id} className="my-8">
            {block.url ? (
              <img
                src={block.url}
                alt={block.alt || 'Blog post image'}
                className="w-full rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect fill="%23f5f5f5" width="800" height="400"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EImage not found%3C/text%3E%3C/svg%3E';
                }}
              />
            ) : (
              <div className="w-full h-64 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400">
                No image URL provided
              </div>
            )}
            {block.alt && (
              <p className="text-sm text-neutral-500 text-center mt-2">{block.alt}</p>
            )}
          </div>
        );
    }
  };

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
        {heroImageUrl ? (
          <div className="mb-8 -mx-6">
            <img
              src={heroImageUrl}
              alt={title || 'Blog post hero'}
              className="w-full h-96 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"%3E%3Crect fill="%23f5f5f5" width="1200" height="600"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EHero image not found%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        ) : (
          <div className="mb-8 -mx-6 w-full h-96 bg-neutral-100 flex items-center justify-center text-neutral-400">
            No hero image
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-bold text-black mb-8">
          {title || 'Untitled Post'}
        </h1>

        <div className="prose prose-lg max-w-none">
          {contentBlocks.length > 0 ? (
            contentBlocks.map(block => renderContentBlock(block))
          ) : (
            <p className="text-neutral-400 italic">No content blocks added yet</p>
          )}
        </div>

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
    </div>
  );
}
