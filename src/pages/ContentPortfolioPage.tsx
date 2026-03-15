import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUrlFilter, useClearUrlFilters } from '../hooks/useUrlFilters';
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

const CONTENT_PER_PAGE = 12;

const MEDIA_OPTIONS = [
  { value: 'all',    label: 'All Media'  },
  { value: 'videos', label: 'Videos'     },
  { value: 'photos', label: 'Photos'     },
];

export function ContentPortfolioPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();

  const [content, setContent] = useState<ContentWithProject[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mediaFilter, setMediaFilter] = useUrlFilter('media', 'all');
  const [typeFilter, setTypeFilter] = useUrlFilter('type', 'all');
  const [clientFilter, setClientFilter] = useUrlFilter('client', 'all');
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '');
  const [hasMore, setHasMore] = useState(true);
  const [totalContent, setTotalContent] = useState(0);

  // Track which item indexes have finished loading their poster image
  const [loadedSet, setLoadedSet] = useState<Set<number>>(new Set());
  // Number of items currently "in flight" (fetched but poster not yet loaded)
  const batchSizeRef = useRef(CONTENT_PER_PAGE);
  // Whether the current batch has fully loaded — controls when next fetch is allowed
  const currentBatchLoadedRef = useRef(false);

  const observerTarget = useRef<HTMLDivElement>(null);

  const [modalContent, setModalContent] = useState<ContentWithProject | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const savedScrollY = useRef(0);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    currentBatchLoadedRef.current = false;
    batchSizeRef.current = CONTENT_PER_PAGE;
    const [data, total] = await Promise.all([
      loadPublishedContentWithProjects(CONTENT_PER_PAGE, 0),
      countPublishedContent()
    ]);
    setContent(data);
    setTotalContent(total);
    setHasMore(data.length < total);
    // Reset loaded tracking
    setLoadedSet(new Set());
  };

  const handleItemLoad = useCallback((index: number) => {
    setLoadedSet(prev => {
      const next = new Set(prev);
      next.add(index);
      // When every item in the current batch (0 .. content.length-1) has loaded,
      // mark the batch as complete so the intersection observer can trigger the next fetch.
      if (next.size >= batchSizeRef.current) {
        currentBatchLoadedRef.current = true;
      }
      return next;
    });
  }, []);

  const loadMoreContent = useCallback(async () => {
    if (loadingMore || !hasMore || !currentBatchLoadedRef.current) return;

    currentBatchLoadedRef.current = false;
    setLoadingMore(true);
    try {
      const offset = content.length;
      const newContent = await loadPublishedContentWithProjects(CONTENT_PER_PAGE, offset);
      setContent(prev => {
        const merged = [...prev, ...newContent];
        batchSizeRef.current = merged.length;
        return merged;
      });
      setHasMore(offset + newContent.length < totalContent);
    } catch (error) {
      console.error('Error loading more content:', error);
      currentBatchLoadedRef.current = true; // allow retry on error
    } finally {
      setLoadingMore(false);
    }
  }, [content.length, hasMore, loadingMore, totalContent]);

  const hasActiveFilters = mediaFilter !== 'all' || typeFilter !== 'all' || clientFilter !== 'all' || searchQuery !== '';

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loadingMore &&
          !hasActiveFilters &&
          currentBatchLoadedRef.current
        ) {
          loadMoreContent();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => { if (currentTarget) observer.unobserve(currentTarget); };
  }, [hasMore, loadingMore, loadMoreContent, hasActiveFilters]);

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
  }, [slug, content, navigate, modalContent]);

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

  const clearFilters = useClearUrlFilters(['media', 'type', 'client', 'q']);

  const handleContentClick = (item: ContentWithProject) => {
    navigate(`/portfolio/content/${item.slug}`);
  };

  const handleModalClose = () => {
    navigate('/portfolio/content');
  };

  const isModalOpen = !!slug;

  const isInitialLoad = content.length === 0 && !hasActiveFilters;
  const skeletonCount = CONTENT_PER_PAGE;

  const displayItems = hasActiveFilters ? filteredContent : content;

  const gridClasses = "fluid-grid";

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Adjust pt-12 to lower spacing above the search bar */}
      <main className="max-w-screen-xl mx-auto px-6 pt-12 pb-16">
        {/* ── Filter bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by title..."
            className="flex-1"
          />

          <CustomDropdown
            options={MEDIA_OPTIONS}
            value={mediaFilter}
            onChange={setMediaFilter}
            ariaLabel="Filter by media type"
            className="w-full sm:w-40 lg:w-44"
          />

          <CustomDropdown
            options={typeOptions}
            value={typeFilter}
            onChange={setTypeFilter}
            icon={<Film size={16} />}
            ariaLabel="Filter by project type"
            className="w-full sm:w-44 lg:w-52"
          />

          <CustomDropdown
            options={clientOptions}
            value={clientFilter}
            onChange={setClientFilter}
            icon={<Users size={16} />}
            ariaLabel="Filter by client"
            className="w-full sm:w-44 lg:w-52"
          />
        </div>

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

        {/* ── Grid wrapped in a full width container ── */}
        <div className="w-full">
          {isInitialLoad ? (
            <div className={gridClasses}>
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <div
                  key={`init-skeleton-${i}`}
                  className="h-full w-full"
                  style={{ animation: `fadeIn 0.25s ease-out ${i * 30}ms both` }}
                >
                  <ContentGridItemSkeleton />
                </div>
              ))}
            </div>
          ) : hasActiveFilters && filteredContent.length === 0 ? (
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
              <div className={gridClasses}>
                {displayItems.map((item, index) => {
                  const isPortrait = item.format === 'portrait';
                  const isLoaded = loadedSet.has(index);
                  return (
                    <div
                      key={item.id}
                      className={`relative h-full w-full ${isPortrait ? 'sm:row-span-2' : 'sm:row-span-1'}`}
                      style={
                        index < CONTENT_PER_PAGE
                          ? {
                              opacity: 0,
                              transform: 'translateY(12px)',
                              animation: `fadeInUp 0.5s ease-out ${Math.min(index, 11) * 0.04}s forwards`,
                            }
                          : undefined
                      }
                    >
                      <div
                        className={`absolute inset-0 transition-opacity duration-400 ${
                          isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
                        }`}
                      >
                        <ContentGridItemSkeleton isPortrait={isPortrait} />
                      </div>

                      <div
                        className={`absolute inset-0 transition-opacity duration-400 ${
                          isLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <ContentGridItem
                          content={item}
                          onClick={() => handleContentClick(item)}
                          onLoad={() => handleItemLoad(index)}
                        />
                      </div>
                    </div>
                  );
                })}

                {loadingMore && !hasActiveFilters &&
                  Array.from({ length: CONTENT_PER_PAGE }).map((_, i) => (
                    <div
                      key={`batch-skeleton-${i}`}
                      className="h-full w-full"
                      style={{ animation: `fadeIn 0.25s ease-out ${i * 30}ms both` }}
                    >
                      <ContentGridItemSkeleton />
                    </div>
                  ))
                }
              </div>

              {!hasActiveFilters && <div ref={observerTarget} className="h-4 mt-6" />}
            </>
          )}
        </div>
      </main>

      {/* ── Detail modal overlay ── */}
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
        /* FLUID GRID SYSTEM */
        .fluid-grid {
          display: grid;
          gap: 2rem;
          grid-template-columns: 1fr;
          /* Calculated height for mobile instead of auto to prevent 0px collapse */
          grid-auto-rows: calc(100vw / 1.6);
          grid-auto-flow: row dense;
          width: 100%;
        }

        /* Swapped cqw to vw for better compatibility on older devices like Safari 15 and below */
        @media (min-width: 640px) {
          .fluid-grid {
            grid-template-columns: repeat(2, 1fr);
            grid-auto-rows: calc(((100vw - 2rem) / 2) / 1.6);
          }
        }

        @media (min-width: 1024px) {
          .fluid-grid {
            grid-template-columns: repeat(3, 1fr);
            grid-auto-rows: calc(((100vw - 4rem) / 3) / 1.6);
          }
        }

        @media (min-width: 1536px) {
          .fluid-grid {
            grid-template-columns: repeat(4, 1fr);
            grid-auto-rows: calc(((100vw - 6rem) / 4) / 1.6);
          }
        }

        /* ANIMATIONS */
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