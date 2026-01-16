import React, { useState, useEffect } from 'react';
import { Search, Calendar } from 'lucide-react';
import { BlogPost, loadAllPosts } from '../utils/blogLoader';
import BlogPostCard from '../components/BlogPostCard';
import CustomDropdown from '../components/forms/CustomDropdown';
import { designTokens } from '../styles/tokens';

type DateFilter = 'all' | 'week' | 'month' | 'year';

const BlogListPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const postsData = await loadAllPosts();
        setPosts(postsData);
        setFilteredPosts(postsData);
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
          </div>
        )}
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
