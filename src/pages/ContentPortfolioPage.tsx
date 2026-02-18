import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Film, Users } from 'lucide-react';
import { SearchBar } from '../components/ui/SearchBar';
import { ContentWithProject } from '../types';
import { loadPublishedContentWithProjects, countPublishedContent, loadContentBySlug } from '../utils/contentService';
import { ContentGridItem } from '../components/ContentGridItem';
import { ContentGridItemSkeleton } from '../components/ui/SkeletonLoader';
import Header from '../components/Header';
import CustomDropdown from '../components/forms/CustomDropdown';
import { ContentDetailModal } from '../components/content/ContentDetailModal';
import { designTokens } from '../styles/tokens';

type MediaFilter = 'all' | 'videos' | 'photos';

const CONTENT_PER_PAGE = 30;

const MEDIA_OPTIONS = [
  { value: 'all',    label: 'All Media'  },
  { value: 'videos', label: 'Videos'     },
  { value: 'photos', label: 'Photos'     },
];

export function ContentPortfolioPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();

  const [content, setContent] = useState<ContentWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [totalContent, setTotalContent] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const [modalContent, setModalContent] = useState<ContentWithProject | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const savedScrollY = useRef(0);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    const [data, total] = await Promise.all([
      loadPublishedContentWithProjects(CONTENT_PER_PAGE, 0),
      countPublishedContent()
    ]);
    setContent(data);
    setTotalContent(total);
    setHasMore(data.length < total);
    setLoading(false);
  };

  const loadMoreContent = useCallback(async () => {
    if (loadingMore || !hasMore || hasActiveFilters) return;

    setLoadingMore(true);
    try {
      const newContent = await loadPublishedContentWithProjects(CONTENT_PER_PAGE, content.length);
      setContent(prev => [...prev, ...newContent]);
      setHasMore(content.length + newContent.length < totalContent);
    } catch (error) {
      console.error('Error loading more content:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [content.length, hasMore, loadingMore, totalContent]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !hasActiveFilters) {
          loadMoreContent();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => { if (currentTarget) observer.unobserve(currentTarget); };
  }, [hasMore, loadingMore, loadMoreContent]);

  useEffect(() => {
    if (!slug) {
      if (modalContent) {
        document.body.style.overflow = '';
        window.scrollTo({ top: savedScrollY.current, behavior: 'instant' });
        setModalContent(null);
      }
      return;
    }

    const cached = content.find(c => c.slug === slug);
    if (cached) {
      savedScrollY.current = window.scrollY;
      setModalContent(cached);
      return;
    }

    let cancelled = false;
    setModalLoading(true);
    loadContentBySlug(slug).then(data => {
      if (cancelled) return;
      if (data) {
        savedScrollY.current = window.scrollY;
        setModalContent(data);
      } else {
        navigate('/portfolio/content', { replace: true });
      }
      setModalLoading(false);
    });

    return () => { cancelled = true; };
  }, [slug, content]);

  const typeOptions = useMemo(() => {
    const types = new Set<string>();
    content.forEach((item) => {
      if (item.project_info?.project_type_name) types.add(item.project_info.project_type_name);
    });
    return [
      { value: 'all', label: 'All Types' },
      ...Array.from(types).sort().map(t => ({ value: t, label: t })),
    ];
  }, [content]);

  const clientOptions = useMemo(() => {
    const clients = new Set<string>();
    content.forEach((item) => {
      if (item.project_info?.client_name) clients.add(item.project_info.client_name);
    });
    return [
      { value: 'all', label: 'All Clients' },
      ...Array.from(clients).sort().map(c => ({ value: c, label: c })),
    ];
  }, [content]);

  const hasActiveFilters = mediaFilter !== 'all' || typeFilter !== 'all' || clientFilter !== 'all' || searchQuery !== '';

  const filteredContent = useMemo(() => {
    return content.filter((item) => {
      if (mediaFilter === 'videos' && item.content_type.slug !== 'video') return false;
      if (mediaFilter === 'photos' && item.content_type.slug !== 'image') return false;
      if (typeFilter !== 'all'   && item.project_info?.project_type_name !== typeFilter) return false;
      if (clientFilter !== 'all' && item.project_info?.client_name !== clientFilter) return false;
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [content, mediaFilter, typeFilter, clientFilter, searchQuery]);

  const clearFilters = () => {
    setMediaFilter('all');
    setTypeFilter('all');
    setClientFilter('all');
    setSearchQuery('');
  };

  const handleContentClick = (item: ContentWithProject) => {
    navigate(`/portfolio/content/${item.slug}`);
  };

  const handleModalClose = () => {
    navigate('/portfolio/content');
  };

  const isModalOpen = !!slug;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-screen-xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-10">
          <h1
            className="text-neutral-900 mb-1"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontSize: designTokens.typography.sizes.lg,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
            }}
          >
            Portfolio
          </h1>
          <p
            className="text-neutral-500"
            style={{
              fontFamily: designTokens.typography.fontFamily,
              fontSize: designTokens.typography.sizes.xs,
            }}
          >
            Explore our collection of creative work
          </p>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by title..."
            className="flex-1"
          />

          {/* Media type */}
          <CustomDropdown
            options={MEDIA_OPTIONS}
            value={mediaFilter}
            onChange={(v) => setMediaFilter(v as MediaFilter)}
            ariaLabel="Filter by media type"
            className="w-full sm:w-40 lg:w-44"
          />

          {/* Project type */}
          <CustomDropdown
            options={typeOptions}
            value={typeFilter}
            onChange={setTypeFilter}
            icon={<Film size={16} />}
            ariaLabel="Filter by project type"
            className="w-full sm:w-44 lg:w-52"
          />

          {/* Client */}
          <CustomDropdown
            options={clientOptions}
            value={clientFilter}
            onChange={setClientFilter}
            icon={<Users size={16} />}
            ariaLabel="Filter by client"
            className="w-full sm:w-44 lg:w-52"
          />
        </div>

        {/* Active-filter meta row */}
        {hasActiveFilters && (
          <div className="mb-6 flex items-center justify-between">
            <p
              className="text-neutral-500"
              style={{ fontFamily: designTokens.typography.fontFamily, fontSize: '14px' }}
            >
              Showing {filteredContent.length} of {content.length} items
            </p>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 transition-colors duration-150"
              style={{ fontFamily: designTokens.typography.fontFamily, fontSize: '14px' }}
            >
              <X size={14} />
              Clear filters
            </button>
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6 auto-rows-[1fr]">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ animation: `fadeIn 0.3s ease-in-out ${i * 50}ms both` }}>
                <ContentGridItemSkeleton />
              </div>
            ))}
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-20">
            <p
              className="text-neutral-400"
              style={{ fontFamily: designTokens.typography.fontFamily, fontSize: designTokens.typography.sizes.sm }}
            >
              No content found matching your filters
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6 auto-rows-[1fr]">
              {filteredContent.map((item, index) => {
                const isPortrait = item.format === 'portrait';
                return (
                  <div
                    key={item.id}
                    className={isPortrait ? 'md:row-span-2' : ''}
                    style={{
                      opacity: 0,
                      transform: 'translateY(20px)',
                      animation: `fadeInUp 0.6s ease-out ${Math.min(index, 12) * 0.05}s forwards`,
                    }}
                  >
                    <ContentGridItem content={item} onClick={() => handleContentClick(item)} />
                  </div>
                );
              })}

              {loadingMore && !hasActiveFilters && (
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    style={{ animation: `fadeIn 0.3s ease-in-out ${i * 50}ms both` }}
                  >
                    <ContentGridItemSkeleton />
                  </div>
                ))
              )}
            </div>

            {!hasActiveFilters && <div ref={observerTarget} className="h-4 mt-6" />}
          </>
        )}
      </main>

      {/* ── Detail modal overlay — grid stays mounted ── */}
      {isModalOpen && (
        modalLoading ? (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
          </div>
        ) : modalContent ? (
          <ContentDetailModal content={modalContent} onClose={handleModalClose} />
        ) : null
      )}

      <style>{`
        @keyframes fadeInUp {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
