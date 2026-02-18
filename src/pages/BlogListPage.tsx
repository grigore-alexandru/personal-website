import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, X } from 'lucide-react';
import { SearchBar } from '../components/ui/SearchBar';
import { BlogPost, loadAllPosts, countAllPosts } from '../utils/blogLoader';
import BlogPostCard from '../components/BlogPostCard';
import CustomDropdown from '../components/forms/CustomDropdown';
import { designTokens } from '../styles/tokens';
import { BlogPostCardSkeleton } from '../components/ui/SkeletonLoader';
import { Button } from '../components/forms/Button';

type DateFilter = 'all' | 'week' | 'month' | 'year';

const POSTS_PER_PAGE = 20;

const BlogListPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [hasMore, setHasMore] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInitialPosts = async () => {
      try {
        const [postsData, total] = await Promise.all([
          loadAllPosts(POSTS_PER_PAGE, 0),
          countAllPosts()
        ]);
        setPosts(postsData);
        setFilteredPosts(postsData);
        setTotalPosts(total);
        setHasMore(postsData.length < total);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialPosts();
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || searchQuery.trim() || dateFilter !== 'all') return;

    setLoadingMore(true);
    try {
      const newPosts = await loadAllPosts(POSTS_PER_PAGE, posts.length);
      setPosts(prev => [...prev, ...newPosts]);
      setHasMore(posts.length + newPosts.length < totalPosts);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [posts.length, hasMore, loadingMore, totalPosts, searchQuery, dateFilter]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts();
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
  }, [hasMore, loadingMore, loadMorePosts]);

  useEffect(() => {
    let filtered = posts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (dateFilter) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(post =>
        new Date(post.publishedAt) >= cutoffDate
      );
    }

    setFilteredPosts(filtered);
  }, [posts, searchQuery, dateFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || dateFilter !== 'all';

  return (
    <div className="min-h-screen bg-white">
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search posts, topics, or tags..."
            className="flex-1"
          />

          <CustomDropdown
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'week', label: 'Past Week' },
              { value: 'month', label: 'Past Month' },
              { value: 'year', label: 'Past Year' },
            ]}
            value={dateFilter}
            onChange={(val) => setDateFilter(val as DateFilter)}
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
        {loading ? (
          <div className="space-y-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  animation: `fadeIn 0.3s ease-in-out ${i * 50}ms both`,
                }}
              >
                <BlogPostCardSkeleton />
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
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
              {filteredPosts.map((post, index) => (
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

            {!searchQuery.trim() && dateFilter === 'all' && (
              <>
                {loadingMore && (
                  <div className="space-y-6 mt-6">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          animation: `fadeIn 0.3s ease-in-out ${i * 50}ms both`,
                        }}
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
};

export default BlogListPage;
