import React, { useState, useEffect } from 'react';
import { Search, Filter as FilterIcon, Calendar } from 'lucide-react';
import { BlogPost, loadAllPosts } from '../utils/blogLoader';
import Header from '../components/Header';
import BlogPostCard from '../components/BlogPostCard';
import { designTokens } from '../styles/tokens';

type DateFilter = 'all' | 'week' | 'month' | 'year';

const BlogListPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const postsData = await loadAllPosts();
        setPosts(postsData);
        setFilteredPosts(postsData);

        const tags = new Set<string>();
        postsData.forEach(post => {
          post.tags.forEach(tag => tags.add(tag));
        });
        setAllTags(Array.from(tags).sort());
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

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

    if (selectedTag) {
      filtered = filtered.filter(post =>
        post.tags.includes(selectedTag)
      );
    }

    setFilteredPosts(filtered);
  }, [posts, searchQuery, dateFilter, selectedTag]);

  const handleFilterToggle = () => {
    setShowFilter(!showFilter);
  };

  const handleTagFilter = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setSelectedTag(null);
  };

  const hasActiveFilters = searchQuery.trim() !== '' || dateFilter !== 'all' || selectedTag !== null;

  return (
    <div className="min-h-screen bg-white">
      <Header showFilter={false} />

      <section
        className="pt-20 pb-16 bg-gradient-to-b from-gray-50 to-white"
        style={{ paddingTop: showFilter ? '160px' : '80px' }}
      >
        <div className="max-w-screen-xl mx-auto px-6 text-center">
          <h1
            className="text-black font-bold mb-4"
            style={{
              fontSize: designTokens.typography.sizes.xxl,
              fontFamily: designTokens.typography.fontFamily,
              fontWeight: designTokens.typography.weights.bold,
              lineHeight: designTokens.typography.lineHeights.heading,
              letterSpacing: '-0.02em',
            }}
          >
            Blog
          </h1>

          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 flex items-center">
                <Search
                  size={20}
                  className="absolute left-3 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search posts, topics, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  style={{
                    fontFamily: designTokens.typography.fontFamily,
                    fontSize: designTokens.typography.sizes.sm,
                  }}
                />
              </div>

              <div className="flex gap-3">
                <div className="relative">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                    className="appearance-none pl-10 pr-8 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white cursor-pointer"
                    style={{
                      fontFamily: designTokens.typography.fontFamily,
                      fontSize: designTokens.typography.sizes.sm,
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="week">Past Week</option>
                    <option value="month">Past Month</option>
                    <option value="year">Past Year</option>
                  </select>
                  <Calendar
                    size={20}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>

                <button
                  onClick={handleFilterToggle}
                  className={`px-4 py-3 border border-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black ${
                    showFilter ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  aria-label="Toggle tag filters"
                >
                  <FilterIcon size={20} />
                </button>
              </div>
            </div>

            {showFilter && allTags.length > 0 && (
              <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagFilter(tag)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black ${
                        selectedTag === tag
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={{
                        fontFamily: designTokens.typography.fontFamily,
                        fontWeight: designTokens.typography.weights.regular,
                        letterSpacing: designTokens.typography.letterSpacings.wide,
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <p
                className="text-gray-600"
                style={{
                  fontSize: designTokens.typography.sizes.sm,
                  fontFamily: designTokens.typography.fontFamily,
                }}
              >
                {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'} found
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-black underline"
                  style={{
                    fontFamily: designTokens.typography.fontFamily,
                    fontSize: designTokens.typography.sizes.sm,
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
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
          <div className="space-y-6">
            {filteredPosts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default BlogListPage;
