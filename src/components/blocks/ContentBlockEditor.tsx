import { useState } from 'react';
import { ContentBlock } from '../../types';
import { createBlock } from '../../utils/contentBlockFactory';
import { SubtitleBlockEditor } from './SubtitleBlockEditor';
import { BodyTextBlockEditor } from './BodyTextBlockEditor';
import { ListBlockEditor } from './ListBlockEditor';
import { ImageBlockEditor } from './ImageBlockEditor';
import {
  Heading2,
  Type,
  List,
  Image,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus
} from 'lucide-react';

interface ContentBlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

export function ContentBlockEditor({ blocks, onChange }: ContentBlockEditorProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleAddBlock = (type: ContentBlock['type']) => {
    const newBlock = createBlock(type);
    onChange([...blocks, newBlock]);
  };

  const handleUpdateBlock = (index: number, updatedBlock: ContentBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    onChange(newBlocks);
  };

  const handleDeleteBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
    setShowDeleteConfirm(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    onChange(newBlocks);
  };

  const handleMoveDown = (index: number) => {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    onChange(newBlocks);
  };

  const renderBlockEditor = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'subtitle':
        return (
          <SubtitleBlockEditor
            block={block}
            onChange={(updated) => handleUpdateBlock(index, updated)}
          />
        );
      case 'body':
        return (
          <BodyTextBlockEditor
            block={block}
            onChange={(updated) => handleUpdateBlock(index, updated)}
          />
        );
      case 'list':
        return (
          <ListBlockEditor
            block={block}
            onChange={(updated) => handleUpdateBlock(index, updated)}
          />
        );
      case 'image':
        return (
          <ImageBlockEditor
            block={block}
            onChange={(updated) => handleUpdateBlock(index, updated)}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-lg p-4 sticky top-4 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-black">Add Content Block</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleAddBlock('subtitle')}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg transition-colors text-sm font-medium"
          >
            <Heading2 size={18} />
            Subtitle
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('body')}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg transition-colors text-sm font-medium"
          >
            <Type size={18} />
            Body Text
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('list')}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg transition-colors text-sm font-medium"
          >
            <List size={18} />
            List
          </button>
          <button
            type="button"
            onClick={() => handleAddBlock('image')}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg transition-colors text-sm font-medium"
          >
            <Image size={18} />
            Image
          </button>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg">
          <Plus size={48} className="mx-auto text-neutral-400 mb-3" />
          <p className="text-neutral-600 font-medium mb-2">No content blocks yet</p>
          <p className="text-sm text-neutral-500">
            Use the toolbar above to add your first content block
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className="bg-white border border-neutral-200 rounded-lg p-6 relative group"
            >
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-2 bg-white border border-neutral-300 rounded-lg text-neutral-600 hover:text-black hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  title="Move up"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === blocks.length - 1}
                  className="p-2 bg-white border border-neutral-300 rounded-lg text-neutral-600 hover:text-black hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                  title="Move down"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(block.id)}
                  className="p-2 bg-white border border-red-300 rounded-lg text-red-500 hover:text-red-600 hover:border-red-500 transition-all shadow-sm"
                  title="Delete block"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {renderBlockEditor(block, index)}

              {showDeleteConfirm === block.id && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                    <h3 className="text-xl font-bold text-black mb-2">Delete Block?</h3>
                    <p className="text-neutral-600 mb-6">
                      Are you sure you want to delete this content block? This action cannot be undone.
                    </p>
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-4 py-2 text-neutral-600 hover:text-black transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(index)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
