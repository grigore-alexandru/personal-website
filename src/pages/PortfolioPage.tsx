import React, { useState, useEffect } from 'react';
import { Search, Film } from 'lucide-react';
import { Project, Filter, ProjectType } from '../types';
import { loadProjects } from '../utils/dataLoader';
import { loadProjectTypes } from '../utils/portfolioService';
import CustomDropdown from '../components/forms/CustomDropdown';
import MasonryGrid from '../components/MasonryGrid';
import { designTokens } from '../styles/tokens';

const PortfolioPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [typeOptions, setTypeOptions] = useState<{ value: string; label: string }[]>([
    { value: 'all', label: 'All Types' },
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

        setTypeOptions([
          { value: 'all', label: 'All Types' },
          ...typesData.map((t: ProjectType) => ({
            value: t.slug,
            label: t.name,
          })),
        ]);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = projects;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(q) ||
        project.client_name.toLowerCase().includes(q) ||
        project.project_type.name.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(project =>
        project.project_type.slug === typeFilter
      );
    }

    setFilteredProjects(filtered);
  }, [projects, searchQuery, typeFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'all';

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
              placeholder="Search projects, clients, or types..."
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
            options={typeOptions}
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            icon={<Film size={18} className="text-gray-400" />}
            className="sm:w-64"
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

      <section className="pb-16">
        <MasonryGrid projects={filteredProjects} loading={loading} />
      </section>
    </div>
  );
};

export default PortfolioPage;
