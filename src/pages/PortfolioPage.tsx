import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Project, Filter, ProjectType } from '../types';
import { loadProjects } from '../utils/dataLoader';
import { loadProjectTypes } from '../utils/portfolioService';
import MasonryGrid from '../components/MasonryGrid';

const PortfolioPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filter[]>([
    { id: 'all', label: 'All', active: true },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsData, typesData] = await Promise.all([
          loadProjects(),
          loadProjectTypes(),
        ]);

        setProjects(projectsData);
        setFilteredProjects(projectsData);

        const typeFilters: Filter[] = [
          { id: 'all', label: 'All', active: true },
          ...typesData.map((t: ProjectType) => ({
            id: t.slug,
            label: t.name,
            active: false,
          })),
        ];
        setFilters(typeFilters);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const activeFilter = filters.find(f => f.active);
    let filtered = projects;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(q) ||
        project.client_name.toLowerCase().includes(q) ||
        project.project_type.name.toLowerCase().includes(q)
      );
    }

    if (activeFilter && activeFilter.id !== 'all') {
      filtered = filtered.filter(project =>
        project.project_type.slug === activeFilter.id
      );
    }

    setFilteredProjects(filtered);
  }, [filters, projects, searchQuery]);

  const handleFilterChange = (filterId: string) => {
    setFilters(prev => prev.map(f => ({ ...f, active: f.id === filterId })));
  };

  const activeCount = filteredProjects.length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-screen-xl mx-auto px-6 pt-8 pb-6">
        <div className="flex items-center gap-3 max-w-xl mx-auto">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:border-neutral-300 transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              showFilters
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-50 border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            showFilters ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'
          }`}
        >
          <div className="flex flex-wrap justify-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleFilterChange(filter.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 ${
                  filter.active
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {!loading && (
          <p className="text-center text-[11px] text-neutral-400 tracking-widest uppercase mt-4">
            {activeCount} project{activeCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <MasonryGrid projects={filteredProjects} loading={loading} />
    </div>
  );
};

export default PortfolioPage;
