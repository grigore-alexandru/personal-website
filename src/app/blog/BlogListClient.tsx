'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { SearchBar } from '../../components/ui/SearchBar';
import { BlogPost, loadAllPosts, countAllPosts } from '../../utils/blogLoader';
import BlogPostCard from '../../components/BlogPostCard';
import CustomDropdown from '../../components/forms/CustomDropdown';
import { designTokens } from '../../styles/tokens';
import { BlogPostCardSkeleton } from '../../components/ui/SkeletonLoader';
import { Button } from '../../components/forms/Button';
import { useUrlFilter, useClearUrlFilters } from '../../hooks/useUrlFilters';

const DATE_OPTIONS = [
  { value: 'all',   label: 'All Time'    },
  { value: 'week',  label: 'Past Week'   },
  { value: 'month', label: 'Past Month'  },
  { value: 'year',  label: 'Past Year'   },
];

interface BlogListClientProps {
  initialPosts: BlogPost[];
  totalPosts: number;
  postsPerPage: number;
}

export default function BlogListClient({
  initialPosts,
  totalPosts,
  postsPerPage,
}: BlogListClientProps) {
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [totalCount, setTotalCount] = useState(totalPosts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length < totalPosts);

  const [searchQuery, setSearchQuery] = useUrlFilter('q', '', true);
  const [dateFilter, setDateFilter] = useUrlFilter('date', 'all');

  const isInitialMount = useRef(true);
  const isMountedRef = useRef(true);
  const fetchVersionRef = useRef(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Read URL params (post-debounce for search) to drive server refetches
  const urlSearch = searchParams.get('q')    ?? '';
  const urlDate   = searchParams.get('date') ?? 'all';

  // When URL params change, reset and fetch filtered first page
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    fetchVersionRef.current += 1;
    const version = fetchVersionRef.current;

    const filters = { q: urlSearch, date: urlDate };

    setPosts([]);
    setHasMore(false);
    setLoadingMore(true);

    Promise.all([
      loadAllPosts(postsPerPage, 0, filters),
      countAllPosts(filters),
    ])
      .then(([newPosts, count]) => {
        if (!isMountedRef.current || fetchVersionRef.current !== version) return;
        setPosts(newPosts);
        setTotalCount(count);
        setHasMore(newPosts.length < count);
      })
      .catch((err) => {
        console.error('Error fetching filtered posts:', err);
      })
      .finally(() => {
        if (isMountedRef.current && fetchVersionRef.current === version) {
          setLoadingMore(false);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch, urlDate]);

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const filters = { q: urlSearch, date: urlDate };

    try {
      const newPosts = await loadAllPosts(postsPerPage, posts.length, filters);
      if (!isMountedRef.current) return;
      setPosts((prev) => {
        const updated = [...prev, ...newPosts];
        setHasMore(updated.length < totalCount);
        return updated;
      });
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      if (isMountedRef.current) setLoadingMore(false);
    }
  }, [posts.length, hasMore, loadingMore, totalCount, postsPerPage, urlSearch, urlDate]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, loadingMore, loadMorePosts]);

  // Badge tracks the *committed* URL values so it only appears once the fetch
  // is actually in flight — not during the 300 ms debounce window.
  const hasActiveFilters = urlSearch.trim() !== '' || urlDate !== 'all';
  const clearFilters = useClearUrlFilters(['q', 'date']);

  // True while a filter-change fetch is in progress (posts list was cleared).
  // Distinct from loadingMore (pagination append) so we can show a full
  // skeleton grid instead of an empty card list with appended skeletons.
  const isFetchingFiltered = loadingMore && posts.length === 0;

  return (
    <div className="min-h-screen bg-white">
      <section className="max-w-4xl mx-auto px-6 pt-12 pb-0">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search posts, topics, or tags..."
            className="flex-1"
          />

          <CustomDropdown
            options={DATE_OPTIONS}
            value={dateFilter}
            onChange={setDateFilter}
            icon={<Calendar size={18} className="text-gray-400" />}
            className="sm:w-48"
          />
        </div>

        {hasActiveFilters && (
          <div className="mb-6 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              icon={<X size={14} />}
              iconPosition="left"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        )}
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-16">
        {isFetchingFiltered ? (
          // Filter-change fetch: show a full skeleton grid where cards will
          // appear, so there is never a flash of empty space or "No posts".
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{ animation: `fadeIn 0.3s ease-in-out ${i * 50}ms both` }}
              >
                <BlogPostCardSkeleton />
              </div>
            ))}
          </div>
        ) : !loadingMore && posts.length === 0 ? (
          <div className="text-center py-16">
            <p
              className="text-gray-500"
              style={{
                fontSize: designTokens.typography.sizes.md,
                fontFamily: designTokens.typography.fontFamily,
                fontWeight: designTokens.typography.weights.regular,
              }}
            >
              No posts found matching your criteria.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {posts.map((post, index) => (
                <div
                  key={post.id}
                  style={{
                    animation: `fadeIn 0.3s ease-in-out ${Math.min(index, 6) * 50}ms both`,
                  }}
                >
                  <BlogPostCard post={post} />
                </div>
              ))}
            </div>

            {loadingMore && (
              <div className="space-y-6 mt-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    style={{ animation: `fadeIn 0.3s ease-in-out ${i * 50}ms both` }}
                  >
                    <BlogPostCardSkeleton />
                  </div>
                ))}
              </div>
            )}

            <div ref={observerTarget} className="h-4" />
          </>
        )}
      </section>
    </div>
  );
}
