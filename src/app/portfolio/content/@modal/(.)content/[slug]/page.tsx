'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadContentBySlug } from '../../../../../../utils/contentService';
import { ContentDetailModal } from '../../../../../../components/content/ContentDetailModal';
import { ContentWithProject } from '../../../../../../types';

export default function ContentModalPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [content, setContent] = useState<ContentWithProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadContentBySlug(params.slug).then((data) => {
      if (cancelled) return;
      if (data) {
        setContent(data);
      } else {
        router.replace('/portfolio/content');
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [params.slug, router]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  if (!content) return null;

  return (
    <ContentDetailModal
      content={content}
      onClose={() => router.back()}
    />
  );
}
