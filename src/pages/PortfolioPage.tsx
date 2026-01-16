import React, { useState, useEffect } from 'react';
import { Search, Filter as FilterIcon } from 'lucide-react';
import { Project, Filter } from '../types';
import { loadProjects } from '../utils/dataLoader';
import FilterBar from '../components/FilterBar';
import MasonryGrid from '../components/MasonryGrid';
import { designTokens } from '../styles/tokens';

const PortfolioPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<Filter[]>([
    { id: 'all', label: 'All', active: true },
    { id: 'advertisement', label: 'Advertisement', active: false },
    { id: 'commercial', label: 'Commercial', active: false },
    { id: 'documentary', label: 'Documentary', active: false },
    { id: 'music-video', label: 'Music Video', active: false },
  ]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsData = await loadProjects();
        setProjects(projectsData);
        setFilteredProjects(projectsData);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    const activeFilter = filters.find(f => f.active);
    let filtered = projects;
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(project => 
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply category filter
    if (activeFilter && activeFilter.id !== 'all') {
      filtered = filtered.filter(project => 
        project.type.toLowerCase().replace(/\s+/g, '-') === activeFilter.id
      );
    }
    
    setFilteredProjects(filtered);
  }, [filters, projects, searchQuery]);

  const handleFilterToggle = () => {
    setShowFilter(!showFilter);
  };

  const handleFilterChange = (filterId: string) => {
    setFilters(filters.map(filter => ({
      ...filter,
      active: filter.id === filterId
    })));

    // Analytics event
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'portfolio_filter',
        filter_id: filterId,
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        isVisible={showFilter}
      />

      {/* Hero Section */}
      <section
        className="pt-20 pb-16 bg-gradient-to-b from-gray-50 to-white"
        style={{ paddingTop: showFilter ? '80px' : '0px' }}
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
            Cinematic Storytelling
          </h1>
          
          {/* Search Bar with Filter Toggle */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative flex items-center">
              <div className="relative flex-1">
                <Search 
                  size={20} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                />
                <input
                  type="text"
                  placeholder="Search projects, clients, or types..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  style={{
                    fontFamily: designTokens.typography.fontFamily,
                    fontSize: designTokens.typography.sizes.sm,
                  }}
                />
              </div>
              <button
                onClick={handleFilterToggle}
                className={`px-4 py-3 border border-l-0 border-gray-200 rounded-r-lg transition-colors focus:outline-none focus:ring-2 focus:ring-black ${
                  showFilter ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                aria-label="Toggle filters"
              >
                <FilterIcon size={20} />
              </button>
            </div>
          </div>
          
        </div>
      </section>

      {/* Projects Grid */}
      <MasonryGrid projects={filteredProjects} loading={loading} />
    </div>
  );
};

export default PortfolioPage;