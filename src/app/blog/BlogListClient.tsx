'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Calendar, X } from 'lucide-react';
import { SearchBar } from '../../components/ui/SearchBar';
import { BlogPost, loadAllPosts } from '../../utils/blogLoader';
import BlogPostCard from '../../components/BlogPostCard';
import CustomDropdown from '../../components/forms/CustomDropdown';
import { designTokens } from '../../styles/tokens';
import { BlogPostCardSkeleton } from '../../components/ui/SkeletonLoader';
import { Button } from '../../components/forms/Button';
import { useUrlFilter, useClearUrlFilters } from '../../hooks/useUrlFilters';

type DateFilter = 'all' | 'week' | 'month' | 'year';

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
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length < totalPosts);
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '', true);
  const [dateFilter, setDateFilter] = useUrlFilter('date', 'all');
  const observerTarget = useRef<HTMLDivElement>(null);

  const hasActiveFilters = searchQuery.trim() !== '' || dateFilter !== 'all';

  const filteredPosts = useMemo(() => {
    let filtered = posts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.excerpt.toLowerCase().includes(query) ||
          post.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      switch (dateFilter as DateFilter) {
        case 'week':  cutoff.setDate(now.getDate() - 7); break;
        case 'month': cutoff.setMonth(now.getMonth() - 1); break;
        case 'year':  cutoff.setFullYear(now.getFullYear() - 1); break;
      }
      filtered = filtered.filter((post) => new Date(post.publishedAt) >= cutoff);
    }

    return filtered;
  }, [posts, searchQuery, dateFilter]);

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || searchQuery.trim() || dateFilter !== 'all') return;
    setLoadingMore(true);
    try {
      const newPosts = await loadAllPosts(postsPerPage, posts.length);
      setPosts((prev) => {
        const updated = [...prev, ...newPosts];
        setHasMore(updated.length < totalPosts);
        return updated;
      });
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [posts.length, hasMore, loadingMore, totalPosts, searchQuery, dateFilter, postsPerPage]);

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

  const clearFilters = useClearUrlFilters(['q', 'date']);
  const displayPosts = hasActiveFilters ? filteredPosts : posts;

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
        {displayPosts.length === 0 ? (
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
              {displayPosts.map((post, index) => (
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

            {!hasActiveFilters && (
              <>
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
          </>
        )}
      </section>
    </div>
  );
}
