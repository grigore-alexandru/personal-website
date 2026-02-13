import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { ContentWithProject } from '../types';
import { loadPublishedContentWithProjects, countPublishedContent } from '../utils/contentService';
import { ContentGridItem } from '../components/ContentGridItem';
import { ContentGridItemSkeleton } from '../components/ui/SkeletonLoader';
import Header from '../components/Header';

type MediaFilter = 'all' | 'videos' | 'photos';

const CONTENT_PER_PAGE = 30;

export function ContentPortfolioPage() {
  const navigate = useNavigate();
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
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loadMoreContent]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    content.forEach((item) => {
      if (item.project_info?.project_type_name) {
        types.add(item.project_info.project_type_name);
      }
    });
    return Array.from(types).sort();
  }, [content]);

  const availableClients = useMemo(() => {
    const clients = new Set<string>();
    content.forEach((item) => {
      if (item.project_info?.client_name) {
        clients.add(item.project_info.client_name);
      }
    });
    return Array.from(clients).sort();
  }, [content]);

  const hasActiveFilters = mediaFilter !== 'all' || typeFilter !== 'all' || clientFilter !== 'all' || searchQuery !== '';

  const filteredContent = useMemo(() => {
    return content.filter((item) => {
      if (mediaFilter === 'videos' && item.content_type.slug !== 'video') {
        return false;
      }
      if (mediaFilter === 'photos' && item.content_type.slug !== 'image') {
        return false;
      }

      if (typeFilter !== 'all' && item.project_info?.project_type_name !== typeFilter) {
        return false;
      }

      if (clientFilter !== 'all' && item.project_info?.client_name !== clientFilter) {
        return false;
      }

      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Portfolio</h1>
          <p className="text-gray-600">
            Explore our collection of creative work
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMediaFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mediaFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setMediaFilter('videos')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mediaFilter === 'videos'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Videos
              </button>
              <button
                onClick={() => setMediaFilter('photos')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mediaFilter === 'photos'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Photos
              </button>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Clients</option>
              {availableClients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredContent.length} of {content.length} items
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6 auto-rows-[1fr]">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{
                  animation: `fadeIn 0.3s ease-in-out ${i * 50}ms both`,
                }}
              >
                <ContentGridItemSkeleton />
              </div>
            ))}
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No content found matching your filters</p>
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
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      style={{
                        animation: `fadeIn 0.3s ease-in-out ${i * 50}ms both`,
                      }}
                    >
                      <ContentGridItemSkeleton />
                    </div>
                  ))}
                </>
              )}
            </div>

            {!hasActiveFilters && <div ref={observerTarget} className="h-4 mt-6" />}
          </>
        )}
      </main>

      <style>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
