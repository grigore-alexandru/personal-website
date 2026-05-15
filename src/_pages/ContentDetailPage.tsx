import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ContentWithProject } from '../types';
import { loadContentBySlug } from '../utils/contentService';
import { ContentPortfolioPage } from './ContentPortfolioPage';
import { ContentDetailModal } from '../components/content/ContentDetailModal';
import SEO from '../components/SEO';
import { getSocialThumbnailUrl } from '../lib/storageClient';
import { SITE_URL } from '../config/seo';

export function ContentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<ContentWithProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) {
      loadContent();
    }
  }, [slug]);

  const loadContent = async () => {
    if (!slug) return;

    setLoading(true);
    setNotFound(false);

    const data = await loadContentBySlug(slug);

    if (data) {
      setContent(data);
    } else {
      setNotFound(true);
    }

    setLoading(false);
  };

  const handleClose = () => {
    navigate('/portfolio/content');
  };

  if (notFound) {
    navigate('/portfolio/content');
    return null;
  }

  const ogImage = content?.thumbnail?.poster
    ? getSocialThumbnailUrl(content.thumbnail.poster)
    : null;

  const ogVideo = content?.url ?? null;

  return (
    <>
      {content && (
        <SEO
          title={content.title}
          description={content.caption ?? undefined}
          canonicalUrl={`${SITE_URL}/portfolio/content/${content.slug}`}
          ogImage={ogImage ?? undefined}
          ogVideo={ogVideo ?? undefined}
        />
      )}
      <ContentPortfolioPage />
      {loading ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
        </div>
      ) : content ? (
        <ContentDetailModal content={content} onClose={handleClose} />
      ) : null}
    </>
  );
}
