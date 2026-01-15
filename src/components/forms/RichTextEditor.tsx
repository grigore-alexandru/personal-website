import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { Bold, Italic, List, ListOrdered, Heading2, ImagePlus, Link2, Unlink } from 'lucide-react';
import { designTokens } from '../../styles/tokens';
import { useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2],
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing your blog post...',
      }),
      Typography,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as any);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const handleAddImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageDialog(false);
    }
  };

  const handleOpenLinkDialog = () => {
    const previousUrl = editor.getAttributes('link').href;
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to
    );
    setLinkUrl(previousUrl || '');
    setLinkText(selectedText || '');
    setShowLinkDialog(true);
  };

  const handleAddLink = () => {
    if (linkUrl) {
      if (linkText && !editor.state.selection.empty) {
        editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      } else if (linkText) {
        editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run();
      } else {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
      setLinkUrl('');
      setLinkText('');
      setShowLinkDialog(false);
    }
  };

  const handleRemoveLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  const ToolbarButton = ({
    onClick,
    isActive,
    icon,
    label,
  }: {
    onClick: () => void;
    isActive?: boolean;
    icon: React.ReactNode;
    label: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`
        p-2 rounded hover:bg-neutral-100 transition-colors
        ${isActive ? 'bg-neutral-200 text-black' : 'text-neutral-600'}
      `}
      title={label}
    >
      {icon}
    </button>
  );

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm">
      <div className="border-b border-neutral-200 p-3 flex items-center gap-1 flex-wrap sticky top-0 bg-white z-10">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={<Bold size={18} />}
          label="Bold"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={<Italic size={18} />}
          label="Italic"
        />
        <div className="w-px h-6 bg-neutral-200 mx-1" />
        <ToolbarButton
          onClick={handleOpenLinkDialog}
          isActive={editor.isActive('link')}
          icon={<Link2 size={18} />}
          label="Insert Link"
        />
        {editor.isActive('link') && (
          <ToolbarButton
            onClick={handleRemoveLink}
            icon={<Unlink size={18} />}
            label="Remove Link"
          />
        )}
        <div className="w-px h-6 bg-neutral-200 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          icon={<Heading2 size={18} />}
          label="Heading"
        />
        <div className="w-px h-6 bg-neutral-200 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={<List size={18} />}
          label="Bullet List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon={<ListOrdered size={18} />}
          label="Numbered List"
        />
        <div className="w-px h-6 bg-neutral-200 mx-1" />
        <ToolbarButton
          onClick={() => setShowImageDialog(true)}
          icon={<ImagePlus size={18} />}
          label="Insert Image"
        />
      </div>

      <div className="p-6">
        <EditorContent editor={editor} />
      </div>

      {showImageDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-black mb-4">Insert Image</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-black mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddImage();
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowImageDialog(false);
                  setImageUrl('');
                }}
                className="px-4 py-2 text-neutral-600 hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddImage}
                disabled={!imageUrl}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-black mb-4">
              {editor.isActive('link') ? 'Edit Link' : 'Insert Link'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Enter link text"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLink();
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLink();
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                  setLinkText('');
                }}
                className="px-4 py-2 text-neutral-600 hover:text-black transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddLink}
                disabled={!linkUrl}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editor.isActive('link') ? 'Update' : 'Insert'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ProseMirror {
          font-family: ${designTokens.typography.fontFamily};
          min-height: 400px;
        }

        .ProseMirror p {
          font-size: ${designTokens.typography.sizes.sm};
          font-weight: ${designTokens.typography.weights.regular};
          line-height: ${designTokens.typography.lineHeights.body};
          color: rgb(55, 65, 81);
          margin-bottom: 1rem;
        }

        .ProseMirror h2 {
          font-size: ${designTokens.typography.sizes.lg};
          font-weight: ${designTokens.typography.weights.bold};
          line-height: ${designTokens.typography.lineHeights.heading};
          color: ${designTokens.colors.textPrimary};
          margin-top: 2rem;
          margin-bottom: 1rem;
        }

        .ProseMirror h2:first-child {
          margin-top: 0;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          font-size: ${designTokens.typography.sizes.sm};
          font-weight: ${designTokens.typography.weights.regular};
          line-height: ${designTokens.typography.lineHeights.body};
          color: rgb(55, 65, 81);
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }

        .ProseMirror ul {
          list-style-type: disc;
        }

        .ProseMirror ol {
          list-style-type: decimal;
        }

        .ProseMirror li {
          margin-bottom: 0.5rem;
        }

        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 2rem 0;
          display: block;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(0, 0, 0, 0.3);
          pointer-events: none;
          height: 0;
        }

        .ProseMirror:focus {
          outline: none;
        }

        .ProseMirror strong {
          font-weight: ${designTokens.typography.weights.bold};
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }

        .ProseMirror a:hover {
          color: #1d4ed8;
        }
      `}</style>
    </div>
  );
}
