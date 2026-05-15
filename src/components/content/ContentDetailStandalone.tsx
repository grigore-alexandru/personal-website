'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ContentDetailModal } from './ContentDetailModal';
import { ContentWithProject } from '../../types';

interface ContentDetailStandaloneProps {
  content: ContentWithProject;
}

export function ContentDetailStandalone({ content }: ContentDetailStandaloneProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-shrink-0 px-4 py-4 sm:px-6">
        <Link
          href="/portfolio/content"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Content
        </Link>
      </div>
      <div className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg overflow-hidden">
          <ContentDetailModal
            content={content}
            onClose={() => { window.history.back(); }}
            standalone
          />
        </div>
      </div>
    </div>
  );
}
