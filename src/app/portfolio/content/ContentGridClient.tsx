'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, Film, Users } from 'lucide-react';
import { SearchBar } from '../../../components/ui/SearchBar';
import { ContentWithProject } from '../../../types';
import { loadPublishedContentWithProjects, loadContentPage } from '../../../utils/contentService';
import { ContentGridItem } from '../../../components/ContentGridItem';
import { ContentGridItemSkeleton } from '../../../components/ui/SkeletonLoader';
import CustomDropdown from '../../../components/forms/CustomDropdown';
import { designTokens } from '../../../styles/tokens';
import { useUrlFilter, useClearUrlFilters } from '../../../hooks/useUrlFilters';

const MEDIA_OPTIONS = [
  { value: 'all',    label: 'All Media' },
  { value: 'videos', label: 'Videos'    },
  { value: 'photos', label: 'Photos'    },
];

interface ContentGridClientProps {
  initialContent: ContentWithProject[];
  totalContent: number;
  clientOptions: { value: string; label: string }[];
  typeOptions: { value: string; label: string }[];
  contentPerPage: number;
}

export default function ContentGridClient({
  initialContent,
  totalContent,
  clientOptions,
  typeOptions,
  contentPerPage,
}: ContentGridClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [content, setContent] = useState<ContentWithProject[]>(initialContent);
  const [totalCount, setTotalCount] = useState(totalContent);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialContent.length < totalContent);

  const [mediaFilter, setMediaFilter] = useUrlFilter('media', 'all');
  const [typeFilter, setTypeFilter] = useUrlFilter('type', 'all');
  const [clientFilter, setClientFilter] = useUrlFilter('client', 'all');
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '', true);

  // Batch loading gates
  const [loadedSet, setLoadedSet] = useState<Set<number>>(new Set());
  const batchSizeRef = useRef(contentPerPage);
  const currentBatchLoadedRef = useRef(false);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMountedRef = useRef(true);
  const isInitialMount = useRef(true);
  const fetchVersionRef = useRef(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    scheduleBatchFallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleBatchFallback = () => {
    if (batchTimeoutRef.current) clearTimeout(batchTimeoutRef.current);
    batchTimeoutRef.current = setTimeout(() => {
      currentBatchLoadedRef.current = true;
    }, 8000);
  };

  const handleItemLoad = useCallback((index: number) => {
    setLoadedSet((prev) => {
      const next = new Set(prev);
      next.add(index);
      if (next.size >= batchSizeRef.current) {
        currentBatchLoadedRef.current = true;
      }
      return next;
    });
  }, []);

  // Read URL params (post-debounce for search) to drive server refetches
  const urlMedia  = searchParams.get('media')  ?? 'all';
  const urlType   = searchParams.get('type')   ?? 'all';
  const urlClient = searchParams.get('client') ?? 'all';
  const urlSearch = searchParams.get('q')      ?? '';

  // When URL params change, reset items and fetch the new filtered page
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    fetchVersionRef.current += 1;
    const version = fetchVersionRef.current;

    const filters = { media: urlMedia, type: urlType, client: urlClient, q: urlSearch };

    setContent([]);
    setHasMore(false);
    setLoadedSet(new Set());
    currentBatchLoadedRef.current = false;
    batchSizeRef.current = contentPerPage;
    setLoadingMore(true);

    // loadContentPage resolves the two lookup helpers (media type id, project
    // content ids) exactly once, then fires count + data in parallel — half the
    // round-trips of calling countPublishedContent + loadPublishedContentWithProjects
    // separately.
    loadContentPage(contentPerPage, 0, filters)
      .then(({ items: newContent, total: count }) => {
        if (!isMountedRef.current || fetchVersionRef.current !== version) return;
        setContent(newContent);
        setTotalCount(count);
        setHasMore(newContent.length < count);
        batchSizeRef.current = newContent.length;
        scheduleBatchFallback();
      })
      .catch((err) => {
        console.error('Error fetching filtered content:', err);
      })
      .finally(() => {
        if (isMountedRef.current && fetchVersionRef.current === version) {
          setLoadingMore(false);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlMedia, urlType, urlClient, urlSearch]);

  const loadMoreContent = useCallback(async () => {
    if (loadingMore || !hasMore || !currentBatchLoadedRef.current) return;

    currentBatchLoadedRef.current = false;
    setLoadingMore(true);

    const filters = { media: urlMedia, type: urlType, client: urlClient, q: urlSearch };

    try {
      const offset = content.length;
      const newContent = await loadPublishedContentWithProjects(contentPerPage, offset, filters);
      if (!isMountedRef.current) return;
      setContent((prev) => {
        const merged = [...prev, ...newContent];
        batchSizeRef.current = merged.length;
        return merged;
      });
      setHasMore(offset + newContent.length < totalCount);
      scheduleBatchFallback();
    } catch (error) {
      console.error('Error loading more content:', error);
      currentBatchLoadedRef.current = true;
    } finally {
      if (isMountedRef.current) setLoadingMore(false);
    }
  }, [content.length, hasMore, loadingMore, totalCount, contentPerPage, urlMedia, urlType, urlClient, urlSearch]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loadingMore &&
          currentBatchLoadedRef.current
        ) {
          loadMoreContent();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, loadingMore, loadMoreContent]);

  const hasActiveFilters =
    mediaFilter !== 'all' || typeFilter !== 'all' || clientFilter !== 'all' || searchQuery !== '';

  const clearFilters = useClearUrlFilters(['media', 'type', 'client', 'q']);

  const handleContentClick = (item: ContentWithProject) => {
    router.push(`/portfolio/content/${item.slug}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-screen-xl mx-auto px-6 pt-12 pb-16">
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

        {hasActiveFilters && content.length > 0 && (
          <div className="mb-6 flex items-center justify-between">
            <p
              className="text-neutral-500"
              style={{ fontFamily: designTokens.typography.fontFamily, fontSize: '14px' }}
            >
              Showing {content.length} of {totalCount} items
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

        {hasActiveFilters && !loadingMore && content.length === 0 && (
          <div className="mb-6 flex justify-end">
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

        <div className="w-full">
          {!loadingMore && content.length === 0 && !hasActiveFilters ? (
            <div className="text-center py-20">
              <p
                className="text-neutral-400"
                style={{ fontFamily: designTokens.typography.fontFamily, fontSize: designTokens.typography.sizes.sm }}
              >
                No content published yet
              </p>
            </div>
          ) : !loadingMore && content.length === 0 && hasActiveFilters ? (
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
              <div className="fluid-grid">
                {content.map((item, index) => {
                  const isPortrait = item.format === 'portrait';
                  const isLoaded = loadedSet.has(index);
                  return (
                    <div
                      key={item.id}
                      className={`relative h-full w-full ${isPortrait ? 'row-span-2' : 'row-span-1'}`}
                      style={
                        index < contentPerPage
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
                          fetchPriority={index === 0 ? 'high' : undefined}
                        />
                      </div>
                    </div>
                  );
                })}

                {loadingMore &&
                  Array.from({ length: contentPerPage }).map((_, i) => (
                    <div
                      key={`batch-skeleton-${i}`}
                      className="relative sm:row-span-1 w-full h-full"
                      style={{ animation: `fadeIn 0.25s ease-out ${i * 30}ms both` }}
                    >
                      <ContentGridItemSkeleton />
                    </div>
                  ))}
              </div>

              <div ref={observerTarget} className="h-4 mt-6" />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
