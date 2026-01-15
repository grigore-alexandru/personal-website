import { useState } from 'react';
import { ImageBlock } from '../../types';
import { ImageUploadSelector } from './ImageUploadSelector';
import { ImageOff } from 'lucide-react';

interface ImageBlockEditorProps {
  block: ImageBlock;
  onChange: (block: ImageBlock) => void;
}

export function ImageBlockEditor({ block, onChange }: ImageBlockEditorProps) {
  const [imageError, setImageError] = useState(false);

  const handleUrlChange = (url: string) => {
    setImageError(false);
    onChange({ ...block, url });
  };

  const isValidImageUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    } catch {
      return false;
    }
  };

  const showPreview = block.url && !imageError;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          Image
        </span>
      </div>

      <ImageUploadSelector value={block.url} onChange={handleUrlChange} />

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Alt Text (optional)
        </label>
        <input
          type="text"
          value={block.alt}
          onChange={(e) => onChange({ ...block, alt: e.target.value })}
          placeholder="Describe the image for accessibility..."
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
        />
        <p className="text-xs text-neutral-500 mt-1">
          Helps screen readers and improves SEO
        </p>
      </div>

      {block.url && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700">
            Preview
          </label>
          <div className="rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50">
            {showPreview ? (
              <img
                src={block.url}
                alt={block.alt || 'Preview'}
                className="w-full h-64 object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-64 flex flex-col items-center justify-center text-neutral-400">
                <ImageOff size={48} className="mb-2" />
                <p className="text-sm">
                  {imageError ? 'Invalid image URL' : 'Loading...'}
                </p>
              </div>
            )}
          </div>
          {!isValidImageUrl(block.url) && (
            <p className="text-xs text-amber-600">
              URL should end with .jpg, .jpeg, .png, .gif, or .webp
            </p>
          )}
        </div>
      )}
    </div>
  );
}
