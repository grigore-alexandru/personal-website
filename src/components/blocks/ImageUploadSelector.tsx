import { useState } from 'react';
import { Link, Upload } from 'lucide-react';

interface ImageUploadSelectorProps {
  value: string;
  onChange: (url: string) => void;
}

type TabType = 'url' | 'upload';

export function ImageUploadSelector({ value, onChange }: ImageUploadSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('url');

  return (
    <div className="border border-neutral-300 rounded-lg overflow-hidden">
      <div className="flex border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'url'
              ? 'bg-black text-white'
              : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Link size={16} />
          URL
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-black text-white'
              : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Upload size={16} />
          Upload
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'url' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">
              Image URL
            </label>
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
            <p className="text-xs text-neutral-500">
              Paste a direct link to an image file (JPG, PNG, GIF, WebP)
            </p>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
              <Upload size={48} className="mx-auto text-neutral-400 mb-3" />
              <p className="text-sm font-medium text-neutral-600 mb-2">
                File Upload
              </p>
              <p className="text-xs text-neutral-500 mb-4">
                AWS integration coming soon
              </p>
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-neutral-200 text-neutral-500 rounded-lg cursor-not-allowed text-sm font-medium"
              >
                Select File
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Supported formats: JPG, PNG, GIF, WebP
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
